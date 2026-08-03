import { Queue, Worker, Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import {
  GoogleCalendarApiError,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  deleteGoogleCalendarEventByAccount,
  type GoogleCalendarEventDraft
} from "../google-calendar";

export interface CreateEventJobData {
  type: "createEvent";
  userId: string;
  todoId: string;
}

export interface UpdateEventJobData {
  type: "updateEvent";
  userId: string;
  todoId: string;
}

export interface DeleteEventJobData {
  type: "deleteEvent";
  userId: string;
  connectionId: string;
  googleAccountId?: string;
  calendarId: string;
  eventId: string;
}

export type GoogleCalendarJobData =
  | CreateEventJobData
  | UpdateEventJobData
  | DeleteEventJobData;

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

const QUEUE_NAME = "google-calendar-sync";

// Singleton pattern for Next.js hot reload
const globalForBullMQ = globalThis as unknown as {
  googleCalendarQueue: Queue<GoogleCalendarJobData> | undefined;
  googleCalendarWorker: Worker<GoogleCalendarJobData> | undefined;
};

export const googleCalendarQueue =
  globalForBullMQ.googleCalendarQueue ??
  new Queue<GoogleCalendarJobData>(QUEUE_NAME, { 
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000, // 2s, 4s, 8s
      },
      removeOnComplete: true,
      removeOnFail: false, // Keep in failed list (DLQ)
    }
  });

if (process.env.NODE_ENV !== "production") {
  globalForBullMQ.googleCalendarQueue = googleCalendarQueue;
}

if (typeof window === "undefined") {
  if (!globalForBullMQ.googleCalendarWorker) {
    globalForBullMQ.googleCalendarWorker = new Worker<GoogleCalendarJobData>(
      QUEUE_NAME,
      async (job: Job<GoogleCalendarJobData>) => {
        const { data } = job;
        
        switch (data.type) {
          case "createEvent": {
            const [task] = await db.select().from(todos).where(and(eq(todos.id, data.todoId), eq(todos.userId, data.userId)));
            if (!task || !task.googleCalendarConnectionId || !task.googleCalendarId) {
              console.log(`[BullMQ] Task ${data.todoId} was deleted or lacks calendar before event creation. Skipping.`);
              break;
            }
            
            const draft: GoogleCalendarEventDraft = {
              connectionId: task.googleCalendarConnectionId,
              calendarId: task.googleCalendarId,
              title: task.title,
              description: task.description ?? undefined,
              location: task.location ?? undefined,
              start: task.startAt ? new Date(task.startAt).toISOString() : (task.dueDate ? new Date(task.dueDate).toISOString() : undefined),
              end: task.endAt ? new Date(task.endAt).toISOString() : undefined,
              allDay: task.allDay ?? false,
            };

            const event = await createGoogleCalendarEvent(data.userId, draft);
            await db.update(todos)
              .set({
                googleEventId: event.id,
                googleCalendarAccountId: event.googleAccountId,
                googleEventLink: event.htmlLink ?? null,
                googleEventPayload: { etag: event.etag, updated: event.updated },
                syncStatus: "synced",
              })
              .where(and(eq(todos.id, data.todoId), eq(todos.userId, data.userId)));
            break;
          }
          case "updateEvent": {
            const [task] = await db.select().from(todos).where(and(eq(todos.id, data.todoId), eq(todos.userId, data.userId)));
            if (!task || !task.googleCalendarConnectionId || !task.googleCalendarId || !task.googleEventId) {
              console.log(`[BullMQ] Task ${data.todoId} missing or not fully linked. Skipping update.`);
              break;
            }

            const draft: GoogleCalendarEventDraft = {
              connectionId: task.googleCalendarConnectionId,
              calendarId: task.googleCalendarId,
              title: task.title,
              description: task.description ?? undefined,
              location: task.location ?? undefined,
              start: task.startAt ? new Date(task.startAt).toISOString() : (task.dueDate ? new Date(task.dueDate).toISOString() : undefined),
              end: task.endAt ? new Date(task.endAt).toISOString() : undefined,
              allDay: task.allDay ?? false,
            };

            const event = await updateGoogleCalendarEvent(
              data.userId,
              task.googleCalendarConnectionId,
              task.googleCalendarId,
              task.googleEventId,
              draft
            );
            await db.update(todos)
              .set({
                googleEventLink: event.htmlLink ?? null,
                googleCalendarAccountId: event.googleAccountId,
                googleEventPayload: { etag: event.etag, updated: event.updated },
                syncStatus: "synced",
              })
              .where(and(eq(todos.id, data.todoId), eq(todos.userId, data.userId)));
            break;
          }
          case "deleteEvent": {
            try {
              await deleteGoogleCalendarEvent(data.userId, data.connectionId, data.calendarId, data.eventId);
            } catch (error) {
              if (isMissingGoogleCalendarConnection(error)) {
                if (data.googleAccountId) {
                  try {
                    await deleteGoogleCalendarEventByAccount(
                      data.userId,
                      data.googleAccountId,
                      data.calendarId,
                      data.eventId,
                    );
                    break;
                  } catch (fallbackError) {
                    if (!isMissingGoogleCalendarConnection(fallbackError)) throw fallbackError;
                  }
                }
                console.log(
                  `[BullMQ] Connection ${data.connectionId} was removed before event deletion. Skipping delete job.`,
                );
                break;
              }
              throw error;
            }
            break;
          }
        }
      },
      { 
        connection,
        concurrency: 5,
      }
    );

    globalForBullMQ.googleCalendarWorker.on('failed', async (job, err) => {
      console.error(`[BullMQ] Job ${job?.id} failed:`, err);
      // If job exhausted all retries
      if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
        if (job.data.type === "createEvent" || job.data.type === "updateEvent") {
          try {
            await db.update(todos)
              .set({ syncStatus: "error" })
              .where(and(eq(todos.id, job.data.todoId), eq(todos.userId, job.data.userId)));
          } catch (e) {
            console.error("Failed to update syncStatus to error", e);
          }
        }
      }
    });

    globalForBullMQ.googleCalendarWorker.on('error', err => {
      console.error(`[BullMQ] Worker error:`, err);
    });
  }
}

function isMissingGoogleCalendarConnection(error: unknown) {
  return error instanceof GoogleCalendarApiError && error.status === 404;
}
