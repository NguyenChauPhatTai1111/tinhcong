import type { AppData, Attendance, Employee, Payroll } from "../../types";
import {
  assertNoOverlap,
  shiftMinutes,
  validDate,
  validMonth,
} from "../../utils/timeCalculator";
import { calculatePayroll, salary, sum } from "../../utils/salaryCalculator";
import { assertNotCalculated, shiftSignature } from "../wages";
import { assertPreviousPayrollComplete } from "../monthlyPayrollGate";
export const STORAGE_KEY = "congviet:data";
export function emptyData(): AppData {
  return {
    version: 4,
    employees: [],
    attendance: {},
    payroll: {},
    wageCalculations: [],
    salaryAdvances: [],
    settings: { theme: "light", company: "Không gian làm việc" },
  };
}
export function ensureMonth(data: AppData, month: string): AppData {
  if (!validMonth(month)) throw new Error("Kỳ dữ liệu không hợp lệ.");
  if (data.attendance[month] && data.payroll[month]) return data;
  return {
    ...data,
    attendance: { ...data.attendance, [month]: data.attendance[month] ?? [] },
    payroll: { ...data.payroll, [month]: data.payroll[month] ?? [] },
  };
}
export function assertUnlocked(
  data: AppData,
  employeeId: string,
  month: string,
) {
  if (
    data.payroll[month]?.some((p) => p.employeeId === employeeId && p.confirmed)
  )
    throw new Error(
      "Bảng lương nhân viên trong kỳ này đã chốt. Không thể sửa hoặc xóa chấm công.",
    );
}
export function saveAttendance(data: AppData, row: Attendance): AppData {
  const next = structuredClone(data),
    all = Object.values(next.attendance).flat();
  const old = all.find((s) => s.id === row.id);
  if (old) assertNotCalculated(data, old.id);
  const employee = data.employees.find((e) => e.id === row.employeeId);
  if (!employee || row.date < employee.startDate)
    throw new Error("Ngày làm phải từ ngày nhân viên bắt đầu làm việc.");
  if (
    (!employee.active || employee.archived) &&
    old?.employeeId !== row.employeeId
  )
    throw new Error("Nhân viên đã nghỉ việc hoặc được lưu trữ.");
  const calculated = shiftMinutes(row.start, row.end, row.breakMinutes);
  if (
    !Number.isInteger(row.actualMinutes) ||
    row.actualMinutes < 0 ||
    row.actualMinutes > (Date.parse(row.end) - Date.parse(row.start)) / 60000
  )
    throw new Error("Số phút thực tế không hợp lệ hoặc vượt quá ca làm.");
  if (row.actualMinutes !== calculated && !row.adjustmentReason.trim())
    throw new Error("Vui lòng nhập lý do điều chỉnh giờ làm.");
  if (
    !validDate(row.date) ||
    !Number.isSafeInteger(row.hourlyRate) ||
    row.hourlyRate < 0 ||
    !Number.isSafeInteger(row.amount) ||
    row.amount < 0 ||
    (row.breakKind !== undefined && !["lunch", "other"].includes(row.breakKind))
  )
    throw new Error("Dữ liệu ca làm không hợp lệ.");
  assertNoOverlap(row, all);
  assertPreviousPayrollComplete(data, row.date.slice(0, 7));
  for (const month of Object.keys(next.attendance))
    next.attendance[month] = next.attendance[month].filter(
      (s) => s.id !== row.id,
    );
  const month = row.date.slice(0, 7);
  next.attendance[month] ??= [];
  next.payroll[month] ??= [];
  next.attendance[month].push(row);
  return next;
}
export function removeAttendance(data: AppData, row: Attendance): AppData {
  assertNotCalculated(data, row.id);
  const next = structuredClone(data);
  next.attendance[row.date.slice(0, 7)] = next.attendance[
    row.date.slice(0, 7)
  ].filter((s) => s.id !== row.id);
  return next;
}
function check(condition: unknown): asserts condition {
  if (!condition)
    throw new Error(
      "File sao lưu không hợp lệ: sai cấu trúc, tham chiếu hoặc số tiền.",
    );
}
const text = (v: unknown) => typeof v === "string";
const cash = (v: unknown) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
function validateShift(s: Attendance, employees: Employee[], legacy = false) {
  check(
    record(s) &&
      text(s.id) &&
      s.id.length > 0 &&
      employees.some((e) => e.id === s.employeeId) &&
      validDate(s.date) &&
      text(s.start) &&
      text(s.end),
  );
  check(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(s.start) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(s.end),
  );
  const minutes = shiftMinutes(s.start, s.end, s.breakMinutes);
  check(
    cash(s.actualMinutes) &&
      s.actualMinutes <= (Date.parse(s.end) - Date.parse(s.start)) / 60000 &&
      text(s.adjustmentReason) &&
      (minutes === s.actualMinutes || s.adjustmentReason.trim()) &&
      cash(s.hourlyRate) &&
      cash(s.amount) &&
      (!legacy || s.amount === salary(s.actualMinutes, s.hourlyRate)) &&
      (s.breakKind === undefined || ["lunch", "other"].includes(s.breakKind)) &&
      text(s.notes),
  );
}
export function migrate(raw: unknown): AppData {
  check(record(raw));
  if (
    raw.version !== 1 &&
    raw.version !== 2 &&
    raw.version !== 3 &&
    raw.version !== 4
  )
    throw new Error(
      "Phiên bản dữ liệu không được hỗ trợ. Hỗ trợ phiên bản 1, 2, 3 và 4.",
    );
  // Version 1 uses the same entities, but did not have workspace settings.
  const d = structuredClone({
    ...raw,
    version: 4,
    wageCalculations: raw.version === 4 ? raw.wageCalculations : [],
    salaryAdvances: raw.salaryAdvances === undefined ? [] : raw.salaryAdvances,
    settings:
      raw.version === 1
        ? {
            ...emptyData().settings,
            ...(record(raw.settings) ? raw.settings : {}),
          }
        : raw.settings,
  }) as unknown as AppData;
  check(
    Array.isArray(d.employees) &&
      record(d.attendance) &&
      record(d.payroll) &&
      record(d.settings),
  );
  check(
    ["light", "dark"].includes(d.settings.theme) && text(d.settings.company),
  );
  const ids = new Set<string>(),
    codes = new Set<string>();
  for (const e of d.employees) {
    check(
      record(e) &&
        text(e.id) &&
        e.id.length > 0 &&
        !ids.has(e.id) &&
        text(e.code) &&
        !!e.code.trim() &&
        !codes.has(e.code.toLowerCase()) &&
        text(e.name) &&
        !!e.name.trim(),
    );
    ids.add(e.id);
    codes.add(e.code.toLowerCase());
    check(
      text(e.phone) &&
        validDate(e.startDate) &&
        typeof e.active === "boolean" &&
        typeof e.archived === "boolean" &&
        text(e.notes) &&
        Array.isArray(e.rates) &&
        (raw.version === 3 || raw.version === 4 || e.rates.length > 0),
    );
    check(
      e.rates.every(
        (r) => record(r) && validDate(r.effectiveFrom) && cash(r.amount),
      ) &&
        (raw.version === 3 ||
          raw.version === 4 ||
          e.rates.some((r) => r.effectiveFrom <= e.startDate)) &&
        new Set(e.rates.map((r) => r.effectiveFrom)).size === e.rates.length,
    );
  }
  const shiftIds = new Set<string>(),
    all: Attendance[] = [];
  for (const [month, rows] of Object.entries(d.attendance)) {
    check(validMonth(month) && Array.isArray(rows));
    for (const s of rows) {
      validateShift(s, d.employees, raw.version === 1 || raw.version === 2);
      check(s.date.startsWith(month) && !shiftIds.has(s.id));
      shiftIds.add(s.id);
      assertNoOverlap(s, all);
      all.push(s);
    }
  }
  const payrollIds = new Set<string>();
  for (const [month, rows] of Object.entries(d.payroll)) {
    check(validMonth(month) && Array.isArray(rows));
    const employeeIds = new Set<string>();
    for (const p of rows) {
      check(
        record(p) &&
          text(p.id) &&
          !payrollIds.has(p.id) &&
          !employeeIds.has(p.employeeId) &&
          d.employees.some((e) => e.id === p.employeeId) &&
          p.month === month,
      );
      payrollIds.add(p.id);
      employeeIds.add(p.employeeId);
      check(
        text(p.employeeName) &&
          text(p.employeeCode) &&
          text(p.notes) &&
          Array.isArray(p.shifts) &&
          [p.minutes, p.base, p.bonus, p.allowance, p.deduction, p.total].every(
            cash,
          ),
      );
      for (const s of p.shifts) {
        validateShift(s, d.employees, true);
        check(s.employeeId === p.employeeId && s.date.startsWith(month));
      }
      check(
        new Set(p.shifts.map((s) => s.id)).size === p.shifts.length &&
          p.minutes === sum(p.shifts, (s) => s.actualMinutes) &&
          p.base === sum(p.shifts, (s) => s.amount) &&
          p.total === p.base + p.bonus + p.allowance - p.deduction,
      );
      check(
        typeof p.confirmed === "boolean" &&
          typeof p.paid === "boolean" &&
          (!p.paid || p.confirmed),
      );
      check(
        p.confirmed
          ? text(p.confirmedAt) && Number.isFinite(Date.parse(p.confirmedAt!))
          : p.confirmedAt === null,
      );
      check(
        p.paid
          ? text(p.paidAt) && Number.isFinite(Date.parse(p.paidAt!))
          : p.paidAt === null,
      );
      if (p.confirmed && (raw.version === 1 || raw.version === 2)) {
        const actual = all.filter(
          (s) => s.employeeId === p.employeeId && s.date.startsWith(month),
        );
        const sameShift = (s: Attendance, t: Attendance) =>
          (Object.keys(s) as (keyof Attendance)[]).every(
            (key) => s[key] === t[key],
          ) &&
          (Object.keys(t) as (keyof Attendance)[]).every(
            (key) => s[key] === t[key],
          );
        check(
          actual.length === p.shifts.length &&
            actual.every((s) => p.shifts.some((t) => sameShift(s, t))),
        );
      }
    }
  }
  check(Array.isArray(d.salaryAdvances));
  const advanceIds = new Set<string>();
  for (const a of d.salaryAdvances!) {
    check(record(a) && text(a.id) && !!a.id && !advanceIds.has(a.id) &&
      d.employees.some((e) => e.id === a.employeeId && a.date >= e.startDate) &&
      validDate(a.date) && cash(a.amount) && a.amount > 0 && text(a.notes));
    advanceIds.add(a.id);
  }
  const deductedIds = new Set<string>();
  check(Array.isArray(d.wageCalculations));
  const calculationIds = new Set<string>(),
    calculatedIds = new Set<string>();
  for (const r of d.wageCalculations) {
    check(
      record(r) &&
        text(r.id) &&
        r.id.length > 0 &&
        !calculationIds.has(r.id) &&
        d.employees.some((e) => e.id === r.employeeId) &&
        text(r.employeeName) &&
        text(r.employeeCode),
    );
    calculationIds.add(r.id);
    check(
      validDate(r.startDate) &&
        validDate(r.endDate) &&
        r.startDate <= r.endDate &&
        text(r.notes) &&
        text(r.calculatedAt) &&
        Number.isFinite(Date.parse(r.calculatedAt)) &&
        Array.isArray(r.shifts) &&
        r.shifts.length > 0,
    );
    check(
      cash(r.minutes) &&
        r.minutes > 0 &&
        cash(r.hourlyRate) &&
        r.hourlyRate > 0 &&
        cash(r.amount) &&
        r.amount === salary(r.minutes, r.hourlyRate),
    );
    for (const s of r.shifts) {
      validateShift(s, d.employees);
      check(
        s.employeeId === r.employeeId &&
          s.date >= r.startDate &&
          s.date <= r.endDate &&
          !calculatedIds.has(s.id),
      );
      calculatedIds.add(s.id);
      const original = all.find((t) => t.id === s.id);
      check(original && shiftSignature([original]) === shiftSignature([s]));
    }
    check(r.minutes === sum(r.shifts, (s) => s.actualMinutes));
    if (r.advances !== undefined || r.advanceTotal !== undefined || r.netAmount !== undefined) {
      check(Array.isArray(r.advances) && cash(r.advanceTotal) &&
        Number.isSafeInteger(r.netAmount) && r.netAmount === r.amount - r.advanceTotal!);
      for (const a of r.advances!) {
        check(record(a) && !deductedIds.has(a.id) && a.employeeId === r.employeeId &&
          a.date >= r.startDate && a.date <= r.endDate);
        const original = d.salaryAdvances!.find((t) => t.id === a.id);
        check(original && original.employeeId === a.employeeId && original.date === a.date &&
          original.amount === a.amount && original.notes === a.notes);
        deductedIds.add(a.id);
      }
      check(r.advanceTotal === sum(r.advances!, (a) => a.amount));
    }
  }
  // Financial records from v1/v2 remain independent archives; new calculations use shift snapshots.
  return d;
}
export function serialize(data: AppData) {
  return JSON.stringify(data, null, 2);
}
export function restore(content: string) {
  return migrate(JSON.parse(content));
}
export function monthBackup(data: AppData, month: string): AppData {
  const calculations = data.wageCalculations.filter((r) =>
    r.shifts.some((s) => s.date.startsWith(month)),
  );
  const requiredIds = new Set(
    calculations.flatMap((r) => r.shifts.map((s) => s.id)),
  );
  const attendance: AppData["attendance"] = { [month]: [] };
  for (const s of Object.values(data.attendance).flat()) {
    if (s.date.startsWith(month) || requiredIds.has(s.id)) {
      const key = s.date.slice(0, 7);
      attendance[key] ??= [];
      attendance[key].push(s);
    }
  }
  return {
    ...data,
    attendance,
    payroll: { [month]: data.payroll[month] ?? [] },
    // Keep complete calculations and every source shift they reference, including cross-month weeks.
    wageCalculations: calculations,
    salaryAdvances: (data.salaryAdvances ?? []).filter((a) => a.date.startsWith(month) ||
      calculations.some((r) => r.advances?.some((t) => t.id === a.id))),
  };
}
export function savePayroll(data: AppData, row: Payroll): AppData {
  assertUnlocked(data, row.employeeId, row.month);
  const employee = data.employees.find((e) => e.id === row.employeeId);
  if (!employee || !validMonth(row.month))
    throw new Error("Nhân viên hoặc kỳ lương không hợp lệ.");
  const fresh = calculatePayroll(
    employee,
    row.month,
    data.attendance[row.month] ?? [],
    { ...row, confirmed: false },
  );
  if (![row.bonus, row.allowance, row.deduction, fresh.total].every(cash))
    throw new Error(
      "Khoản điều chỉnh phải là số nguyên không âm. Thực nhận không được âm.",
    );
  if ((row.bonus || row.allowance || row.deduction) && !row.notes.trim())
    throw new Error("Vui lòng ghi chú lý do điều chỉnh lương.");
  const next = structuredClone(data);
  next.payroll[row.month] ??= [];
  const saved: Payroll = {
    ...fresh,
    confirmed: row.confirmed,
    confirmedAt: row.confirmed
      ? (row.confirmedAt ?? new Date().toISOString())
      : null,
  };
  next.payroll[row.month] = [
    ...next.payroll[row.month].filter((p) => p.employeeId !== row.employeeId),
    saved,
  ];
  return next;
}
