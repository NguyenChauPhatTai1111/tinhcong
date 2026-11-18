import type { AppData, Attendance, WageCalculation } from "../types";
import {
  shiftsInRange,
  totalMinutes,
  type DateRange,
} from "../utils/timeSummary";
import { validDate } from "../utils/timeCalculator";
import { salary } from "../utils/salaryCalculator";

export function calculatedShiftIds(data: AppData): Set<string> {
  return new Set(
    data.wageCalculations.flatMap((r) => r.shifts.map((s) => s.id)),
  );
}
export function pendingShifts(
  data: AppData,
  employeeId: string,
  range: DateRange,
): Attendance[] {
  const calculated = calculatedShiftIds(data);
  return shiftsInRange(data, range).filter(
    (s) => s.employeeId === employeeId && !calculated.has(s.id),
  );
}
export function shiftSignature(rows: Attendance[]): string {
  return JSON.stringify(
    [...rows]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((row) =>
        Object.entries(row)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => a.localeCompare(b)),
      ),
  );
}
export function assertNotCalculated(data: AppData, shiftId: string) {
  if (calculatedShiftIds(data).has(shiftId))
    throw new Error(
      "Ca làm này đã tính lương và được lưu trong kết quả. Không thể sửa hoặc xóa ca đã tính lương.",
    );
}
export function calculationsInRange(
  data: AppData,
  employeeId: string,
  range: DateRange,
): WageCalculation[] {
  return data.wageCalculations
    .filter(
      (r) =>
        r.employeeId === employeeId &&
        r.shifts.some((s) => s.date >= range.start && s.date <= range.end),
    )
    .sort((a, b) => b.calculatedAt.localeCompare(a.calculatedAt));
}
export function finalizeWages(
  data: AppData,
  employeeId: string,
  range: DateRange,
  hourlyRate: number,
  notes: string,
  expectedSignature?: string,
): AppData {
  if (
    !validDate(range.start) ||
    !validDate(range.end) ||
    range.end < range.start
  )
    throw new Error("Khoảng ngày tính lương không hợp lệ.");
  if (!Number.isSafeInteger(hourlyRate) || hourlyRate <= 0)
    throw new Error("Đơn giá phải là số nguyên đồng lớn hơn 0.");
  const employee = data.employees.find((e) => e.id === employeeId);
  if (!employee) throw new Error("Không tìm thấy nhân viên.");
  const shifts = pendingShifts(data, employeeId, range),
    minutes = totalMinutes(shifts);
  if (!shifts.length || minutes <= 0)
    throw new Error(
      "Nhân viên không còn giờ công chưa tính lương trong kỳ này.",
    );
  if (
    expectedSignature !== undefined &&
    expectedSignature !== shiftSignature(shifts)
  )
    throw new Error(
      "Giờ công đã thay đổi. Hãy đóng và mở lại ô tính lương để kiểm tra.",
    );
  const amount = salary(minutes, hourlyRate);
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error("Số tiền vượt giới hạn cho phép.");
  const record: WageCalculation = {
    id: crypto.randomUUID(),
    employeeId,
    employeeName: employee.name,
    employeeCode: employee.code,
    startDate: range.start,
    endDate: range.end,
    shifts: structuredClone(shifts),
    minutes,
    hourlyRate,
    amount,
    notes: notes.trim(),
    calculatedAt: new Date().toISOString(),
  };
  return { ...data, wageCalculations: [...data.wageCalculations, record] };
}
