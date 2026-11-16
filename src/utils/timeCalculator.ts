import { format, isValid, parseISO } from "date-fns";
import type { Attendance } from "../types";
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    isValid(parseISO(value)) &&
    format(parseISO(value), "yyyy-MM-dd") === value
  );
}
export function validMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && validDate(`${value}-01`);
}
export function localISO(date: string, time: string): string {
  if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error("Ngày hoặc giờ không hợp lệ.");
  return new Date(`${date}T${time}:00`).toISOString();
}
export function shiftMinutes(
  start: string,
  end: string,
  breakMinutes: number,
): number {
  const duration = (Date.parse(end) - Date.parse(start)) / 60000;
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isInteger(duration)
  )
    throw new Error("Giờ kết thúc phải sau giờ bắt đầu.");
  if (
    !Number.isInteger(breakMinutes) ||
    breakMinutes < 0 ||
    breakMinutes > duration
  )
    throw new Error("Thời gian nghỉ không được vượt quá thời gian ca làm.");
  return duration - breakMinutes;
}
export function overlaps(
  start: string,
  end: string,
  otherStart: string,
  otherEnd: string,
) {
  return (
    Date.parse(start) < Date.parse(otherEnd) &&
    Date.parse(end) > Date.parse(otherStart)
  );
}
export function assertNoOverlap(shift: Attendance, all: Attendance[]) {
  if (
    all.some(
      (s) =>
        s.id !== shift.id &&
        s.employeeId === shift.employeeId &&
        overlaps(shift.start, shift.end, s.start, s.end),
    )
  )
    throw new Error("Ca làm trùng thời gian với một ca đã lưu của nhân viên.");
}
