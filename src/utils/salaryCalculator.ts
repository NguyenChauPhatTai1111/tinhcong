import type { AppData, Attendance, Employee, Payroll } from "../types";
export const salary = (minutes: number, rate: number) =>
  Math.round((minutes * rate) / 60);
export function rateAt(employee: Employee, date: string): number {
  return (
    [...employee.rates]
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
      .find((r) => r.effectiveFrom <= date)?.amount ?? 0
  );
}
export const sum = <T>(items: T[], value: (item: T) => number) =>
  items.reduce((total, item) => total + value(item), 0);
export function calculatePayroll(
  employee: Employee,
  month: string,
  shifts: Attendance[],
  previous?: Payroll,
): Payroll {
  if (previous?.confirmed) return previous;
  const rows = shifts.filter(
    (s) => s.employeeId === employee.id && s.date.startsWith(month),
  );
  const base = sum(rows, (s) => s.amount);
  const bonus = previous?.bonus ?? 0,
    allowance = previous?.allowance ?? 0,
    deduction = previous?.deduction ?? 0;
  return {
    id: previous?.id ?? crypto.randomUUID(),
    employeeId: employee.id,
    employeeName: employee.name,
    employeeCode: employee.code,
    month,
    shifts: structuredClone(rows),
    minutes: sum(rows, (s) => s.actualMinutes),
    base,
    bonus,
    allowance,
    deduction,
    notes: previous?.notes ?? "",
    total: base + bonus + allowance - deduction,
    confirmed: false,
    confirmedAt: null,
    paid: false,
    paidAt: null,
  };
}
export function monthlyPayroll(data: AppData, month: string): Payroll[] {
  const shifts = data.attendance[month] ?? [],
    saved = data.payroll[month] ?? [];
  return data.employees
    .filter(
      (e) =>
        shifts.some((s) => s.employeeId === e.id) ||
        saved.some((p) => p.employeeId === e.id),
    )
    .map((e) =>
      calculatePayroll(
        e,
        month,
        shifts,
        saved.find((p) => p.employeeId === e.id),
      ),
    );
}
export function refreshDrafts(data: AppData): AppData {
  for (const month of Object.keys(data.payroll))
    data.payroll[month] = data.payroll[month].map((p) => {
      const next = calculatePayroll(
        data.employees.find((e) => e.id === p.employeeId)!,
        month,
        data.attendance[month] ?? [],
        p,
      );
      if (!Number.isSafeInteger(next.total) || next.total < 0)
        throw new Error(
          "Thay đổi làm thực nhận bị âm hoặc vượt giới hạn. Hãy giảm khoản khấu trừ trong bảng lương nháp trước.",
        );
      return next;
    });
  return data;
}
