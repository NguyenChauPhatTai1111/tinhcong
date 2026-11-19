import type { AppData, SalaryAdvance } from "../types";
import type { DateRange } from "../utils/timeSummary";
import { validDate } from "../utils/timeCalculator";

export function deductedAdvanceIds(data: AppData) {
  return new Set(data.wageCalculations.flatMap((r) => (r.advances ?? []).map((a) => a.id)));
}
export function pendingAdvances(data: AppData, employeeId: string, range: DateRange) {
  const deducted = deductedAdvanceIds(data);
  return (data.salaryAdvances ?? []).filter((a) => a.employeeId === employeeId &&
    a.date >= range.start && a.date <= range.end && !deducted.has(a.id));
}
export function saveAdvance(data: AppData, row: SalaryAdvance): AppData {
  const employee = data.employees.find((e) => e.id === row.employeeId);
  if (!employee || !validDate(row.date) || row.date < employee.startDate ||
    !Number.isSafeInteger(row.amount) || row.amount <= 0 || !row.id ||
    typeof row.notes !== "string" || row.notes.length > 2000)
    throw new Error("Ngày ứng hoặc số tiền không hợp lệ. Số tiền phải là số nguyên đồng lớn hơn 0.");
  if (deductedAdvanceIds(data).has(row.id))
    throw new Error("Khoản ứng đã trừ vào lương, không thể sửa hoặc xóa.");
  const advances = data.salaryAdvances ?? [];
  if ((!employee.active || employee.archived) && !advances.some((a) => a.id === row.id && a.employeeId === row.employeeId))
    throw new Error("Nhân viên đã nghỉ việc hoặc được lưu trữ.");
  return { ...data, salaryAdvances: [...advances.filter((a) => a.id !== row.id), { ...row, notes: row.notes.trim() }] };
}
export function removeAdvance(data: AppData, id: string): AppData {
  if (deductedAdvanceIds(data).has(id))
    throw new Error("Khoản ứng đã trừ vào lương, không thể sửa hoặc xóa.");
  return { ...data, salaryAdvances: (data.salaryAdvances ?? []).filter((a) => a.id !== id) };
}
