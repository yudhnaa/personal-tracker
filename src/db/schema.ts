import {
  boolean,
  bigint,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const dashboardSettings = pgTable("dashboard_settings", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  boardTitle: text("board_title").notNull(),
  theme: text("theme").notNull(),
  primary: text("primary").notNull(),
  background: text("background").notNull(),
  archiveDays: integer("archive_days").notNull(),
  welcomed: boolean("welcomed").notNull().default(false),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const todos = pgTable("todos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull(),
  checklist: text("checklist").notNull().default("[]"),
  doneAt: bigint("done_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  position: integer("position").notNull().default(0),
  source: text("source").notNull().default("local"),
  syncStatus: text("sync_status").notNull().default("local_only"),
  startAt: text("start_at"),
  endAt: text("end_at"),
  allDay: boolean("all_day").notNull().default(false),
  location: text("location").default(""),
  googleCalendarId: text("google_calendar_id"),
  googleEventId: text("google_event_id"),
  googleEventLink: text("google_event_link"),
  googleEventPayload: jsonb("google_event_payload"),
}, (table) => [
  uniqueIndex("todos_user_calendar_event_idx").on(table.userId, table.googleCalendarId, table.googleEventId),
]);

export const notes = pgTable("notes", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  text: text("text").notNull().default(""),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const bookmarkGroups = pgTable(
  "bookmark_groups",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [uniqueIndex("bookmark_groups_user_name_idx").on(table.userId, table.name)],
);

export const bookmarks = pgTable("bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  group: text("group_name").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const habits = pgTable("habits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const habitCompletions = pgTable(
  "habit_completions",
  {
    habitId: text("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.habitId, table.date] })],
);

export const devPasswordResetLinks = pgTable("dev_password_reset_links", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const googleCalendarConnections = pgTable("google_calendar_connections", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  googleEmail: text("google_email").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { mode: "date" }).notNull(),
  scope: text("scope").notNull(),
  selectedCalendarIds: text("selected_calendar_ids").notNull().default("[]"),
  syncIntervalMinutes: integer("sync_interval_minutes").notNull().default(5),
  reconnectRequired: boolean("reconnect_required").notNull().default(false),
  connectedAt: timestamp("connected_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
});

export const googleCalendarEventCache = pgTable(
  "google_calendar_event_cache",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id").notNull(),
    googleEventId: text("google_event_id").notNull(),
    etag: text("etag"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    location: text("location").notNull().default(""),
    start: text("start").notNull(),
    end: text("end").notNull(),
    allDay: boolean("all_day").notNull().default(false),
    googleUpdatedAt: timestamp("google_updated_at", { mode: "date" }),
    localUpdatedAt: timestamp("local_updated_at", { mode: "date" }),
    pendingLocalUpdate: boolean("pending_local_update").notNull().default(false),
    deleted: boolean("deleted").notNull().default(false),
  },
  (table) => [uniqueIndex("google_calendar_event_user_calendar_event_idx").on(table.userId, table.calendarId, table.googleEventId)],
);
