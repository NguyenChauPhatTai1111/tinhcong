import type { AppData } from "../types";
import { calculatedShiftIds } from "./wages";
import { validMonth } from "../utils/timeCalculator";

export interface OutstandingMonth {
  month: string;
  employeeIds: string[];
  shiftCount: number;
  minutes: number;
}
export const payrollMonthLabel = (month: string) =>
  `${month.slice(5)}/${month.slice(0, 4)}`;
export function outstandingPayrollBefore(
  data: AppData,
  targetMonth: string,
): OutstandingMonth[] {
  if (!validMonth(targetMonth)) return [];
  const calculated = calculatedShiftIds(data),
    groups = new Map<
      string,
      { employees: Set<string>; shiftCount: number; minutes: number }
    >();
  for (const s of Object.values(data.attendance).flat()) {
    const month = s.date.slice(0, 7);
    if (month >= targetMonth || s.actualMinutes <= 0 || calculated.has(s.id))
      continue;
    const group = groups.get(month) ?? {
      employees: new Set<string>(),
      shiftCount: 0,
      minutes: 0,
    };
    group.employees.add(s.employeeId);
    group.shiftCount++;
    group.minutes += s.actualMinutes;
    groups.set(month, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, g]) => ({
      month,
      employeeIds: [...g.employees],
      shiftCount: g.shiftCount,
      minutes: g.minutes,
    }));
}
export function assertPreviousPayrollComplete(
  data: AppData,
  targetMonth: string,
) {
  if (!validMonth(targetMonth))
    throw new Error("Tháng chấm công không hợp lệ.");
  const pending = outstandingPayrollBefore(data, targetMonth);
  if (pending.length)
    throw new Error(
      `Chưa thể chấm công tháng ${payrollMonthLabel(targetMonth)}. Cần tính xong lương tháng ${pending.map((p) => payrollMonthLabel(p.month)).join(", ")} cho tất cả nhân viên còn giờ công chưa tính.`,
    );
}
