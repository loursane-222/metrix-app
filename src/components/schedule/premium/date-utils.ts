import dayjs, { type Dayjs } from "dayjs";

export function weekStartMonday(date: Dayjs) {
  const diff = (date.day() + 6) % 7;
  return date.startOf("day").subtract(diff, "day");
}

export function trDateRange(startOfWeek: Dayjs) {
  return `${startOfWeek.format("DD MMMM")} - ${startOfWeek.add(6, "day").format("DD MMMM YYYY")}`;
}

export function formatTaskTime(dateValue: any) {
  const d = dayjs(dateValue);
  const hhmm = d.format("HH:mm");
  return hhmm === "03:00" || hhmm === "00:00" ? "Planlı" : hhmm;
}
