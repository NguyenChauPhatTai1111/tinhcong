import { endOfMonth, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import type { AppData, Attendance, Employee } from "../types";
import { validDate, validMonth } from "./timeCalculator";
export type Period = "month" | "week" | "custom";
export interface DateRange {
  start: string;
  end: string;
}
export interface EmployeeHours {
  employee: Employee;
  shifts: Attendance[];
  days: number;
  presence: number;
  breaks: number;
  actual: number;
}
export const totalMinutes = (
  rows: Attendance[],
  key: "actualMinutes" | "breakMinutes" = "actualMinutes",
) => rows.reduce((sum, row) => sum + row[key], 0);
export const presenceMinutes = (row: Attendance) =>
  (Date.parse(row.end) - Date.parse(row.start)) / 60000;
export function periodRange(
  period: Period,
  month: string,
  day: string,
  start: string,
  end: string,
): DateRange {
  if (period === "month") {
    if (!validMonth(month)) throw new Error("Tháng không hợp lệ.");
    return {
      start: `${month}-01`,
      end: format(endOfMonth(parseISO(`${month}-01`)), "yyyy-MM-dd"),
    };
  }
  if (period === "week") {
    if (!validDate(day)) throw new Error("Chọn một ngày trong tuần cần xem.");
    return {
      start: format(
        startOfWeek(parseISO(day), { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      ),
      end: format(endOfWeek(parseISO(day), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }
  if (!validDate(start) || !validDate(end) || end < start)
    throw new Error("Ngày đến phải từ ngày bắt đầu trở đi.");
  return { start, end };
}
export function shiftsInRange(data: AppData, range: DateRange) {
  return Object.values(data.attendance)
    .flat()
    .filter((s) => s.date >= range.start && s.date <= range.end)
    .sort((a, b) => a.start.localeCompare(b.start));
}
export function summarizeHours(
  data: AppData,
  rows: Attendance[],
): EmployeeHours[] {
  return data.employees
    .filter((e) => !e.archived || rows.some((s) => s.employeeId === e.id))
    .map((employee) => {
      const shifts = rows.filter((s) => s.employeeId === employee.id);
      return {
        employee,
        shifts,
        days: new Set(shifts.map((s) => s.date)).size,
        presence: shifts.reduce((sum, s) => sum + presenceMinutes(s), 0),
        breaks: totalMinutes(shifts, "breakMinutes"),
        actual: totalMinutes(shifts),
      };
    });
}
export function lunchLabel(row: Attendance) {
  return !row.breakMinutes || row.breakKind === "other"
    ? "Không nghỉ trưa"
    : row.breakKind === "lunch"
      ? "Có nghỉ trưa"
      : "Chưa ghi rõ loại nghỉ";
}
export function csvContent(rows: unknown[][]): string {
  const escape = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return "\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n");
}
export function hoursCSV(rows: EmployeeHours[], range: DateRange) {
  return csvContent([
    [
      "Từ ngày",
      "Đến ngày",
      "Mã nhân viên",
      "Nhân viên",
      "Ngày có ca",
      "Số ca",
      "Có mặt (phút)",
      "Nghỉ (phút)",
      "Thực tế (phút)",
      "Thực tế (giờ)",
    ],
    ...rows.map((r) => [
      range.start,
      range.end,
      r.employee.code,
      r.employee.name,
      r.days,
      r.shifts.length,
      r.presence,
      r.breaks,
      r.actual,
      r.actual / 60,
    ]),
  ]);
}
