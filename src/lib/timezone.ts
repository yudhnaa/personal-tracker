const DEFAULT_TIME_ZONE = "UTC";

export function normalizeTimeZone(value: string | null | undefined) {
  if (!value) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function startOfTodayInTimeZoneMs(timeZone: string, now = new Date()) {
  const zone = normalizeTimeZone(timeZone);
  const parts = datePartsInTimeZone(now, zone);
  return zonedDateTimeToUtcMs(parts.year, parts.month, parts.day, zone);
}

export function todayIsoInTimeZone(timeZone: string, now = new Date()) {
  const zone = normalizeTimeZone(timeZone);
  const parts = datePartsInTimeZone(now, zone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

function zonedDateTimeToUtcMs(year: number, month: number, day: number, timeZone: string) {
  let utc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  for (let i = 0; i < 2; i++) {
    const offset = getTimeZoneOffsetMs(utc, timeZone);
    utc = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offset;
  }
  return utc;
}

function getTimeZoneOffsetMs(utcMs: number, timeZone: string) {
  const parts = datePartsInTimeZone(new Date(utcMs), timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - utcMs;
}

function datePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}
