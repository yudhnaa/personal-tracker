import { apiJson } from "./api-client";

/** How many done tasks were completed more than `days` ago (for the confirm). */
export async function countDoneOlderThan(days: number): Promise<number> {
	const body = await apiJson<{ count?: number }>(
		`/api/v1/todos?olderThanDays=${days}`,
	);
	return body.count ?? 0;
}

/** Permanently delete done tasks completed more than `days` ago, then reload. */
export async function purgeDoneOlderThan(days: number) {
	await apiJson<unknown>(`/api/v1/todos?olderThanDays=${days}`, {
		method: "DELETE",
	});
	window.location.reload();
}
