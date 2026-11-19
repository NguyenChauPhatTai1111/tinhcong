import { describe, expect, it } from "vitest";
import type { AppData, Attendance, Employee } from "../types";
import {
  emptyData,
  migrate,
  monthBackup,
  removeAttendance,
  restore,
  saveAttendance,
  serialize,
} from "../services/storage";
import {
  calculationsInRange,
  finalizeWages,
  pendingShifts,
  shiftSignature,
} from "../services/wages";
import { localISO } from "../utils/timeCalculator";
import { pendingAdvances, saveAdvance, removeAdvance } from "../services/advances";
const employee: Employee = {
  id: "employee-1",
  code: "NV001",
  name: "Huy",
  startDate: "2026-01-01",
  phone: "",
  notes: "",
  active: true,
  archived: false,
  rates: [],
};
const range = { start: "2026-11-01", end: "2026-11-30" };
function shift(date = "2026-11-16", employeeId = employee.id): Attendance {
  return {
    id: crypto.randomUUID(),
    employeeId,
    date,
    start: localISO(date, "04:00"),
    end: localISO(date, "08:00"),
    actualMinutes: 210,
    breakMinutes: 30,
    breakKind: "lunch",
    adjustmentReason: "",
    notes: "",
    hourlyRate: 0,
    amount: 0,
  };
}
function fixture(): AppData {
  return saveAttendance(
    {
      ...emptyData(),
      employees: [
        employee,
        { ...employee, id: "employee-2", code: "NV002", name: "Mai" },
      ],
    },
    shift(),
  );
}
describe("Tính lương từng nhân viên và đánh dấu đã tính", () => {
  const advance = (amount = 30000, date = "2026-11-16", employeeId = employee.id) => ({
    id: crypto.randomUUID(), employeeId, date, amount, notes: "Ứng sinh hoạt",
  });
  it("trừ nhiều khoản ứng đúng người, đúng kỳ và giữ nguyên giờ công", () => {
    let data = saveAdvance(fixture(), advance());
    data = saveAdvance(data, advance(20000));
    data = saveAdvance(data, advance(10000, "2026-12-01"));
    data = saveAdvance(data, advance(15000, "2026-11-16", "employee-2"));
    const next = finalizeWages(data, employee.id, range, 30000, "");
    expect(next.wageCalculations[0]).toMatchObject({ minutes: 210, amount: 105000, advanceTotal: 50000, netAmount: 55000 });
    expect(next.wageCalculations[0].advances).toHaveLength(2);
    expect(restore(serialize(next))).toEqual(next);
  });
  it("không trừ ứng lần hai khi thêm ca mới hoặc đổi kỳ lọc", () => {
    let data = finalizeWages(saveAdvance(fixture(), advance()), employee.id, range, 30000, "");
    data = saveAttendance(data, shift("2026-11-17"));
    expect(pendingAdvances(data, employee.id, range)).toHaveLength(0);
    data = finalizeWages(data, employee.id, { start: "2026-11-16", end: "2026-11-22" }, 30000, "");
    expect(data.wageCalculations[1]).toMatchObject({ advanceTotal: 0, netAmount: 105000 });
  });
  it("sửa/xóa ứng chưa trừ; khóa khoản đã trừ và phát hiện backup bị sửa", () => {
    const row = advance();
    let data = saveAdvance(fixture(), row);
    expect(saveAdvance(data, { ...row, amount: 40000 }).salaryAdvances![0].amount).toBe(40000);
    expect(removeAdvance(data, row.id).salaryAdvances).toEqual([]);
    data = finalizeWages(data, employee.id, range, 30000, "");
    expect(() => saveAdvance(data, { ...row, amount: 40000 })).toThrow("đã trừ");
    expect(() => removeAdvance(data, row.id)).toThrow("đã trừ");
    const bad = structuredClone(data);
    bad.salaryAdvances![0].amount++;
    expect(() => restore(serialize(bad))).toThrow();
    const duplicate = structuredClone(data);
    duplicate.wageCalculations[0].advances!.push(row);
    duplicate.wageCalculations[0].advanceTotal! += row.amount;
    duplicate.wageCalculations[0].netAmount! -= row.amount;
    expect(() => restore(serialize(duplicate))).toThrow();
  });
  it("từ chối tiền ứng không hợp lệ và lưu rõ số dư âm khi ứng vượt lương", () => {
    for (const amount of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])
      expect(() => saveAdvance(fixture(), advance(amount))).toThrow();
    expect(() => saveAdvance(fixture(), advance(1000, "2025-12-31"))).toThrow();
    const data = finalizeWages(saveAdvance(fixture(), advance(200000)), employee.id, range, 30000, "");
    expect(data.wageCalculations[0].netAmount).toBe(-95000);
    expect(restore(serialize(data))).toEqual(data);
  });
  it("backup tháng giữ khoản ứng đi kèm lần tính vượt tháng", () => {
    let data = fixture();
    data.attendance["2026-12"] = [shift("2026-12-01")];
    data = saveAdvance(data, advance(30000, "2026-12-01"));
    data = finalizeWages(data, employee.id, { start: "2026-11-01", end: "2026-12-06" }, 30000, "");
    const restored = restore(serialize(monthBackup(data, "2026-11")));
    expect(restored.salaryAdvances).toHaveLength(1);
    expect(restored.wageCalculations[0].netAmount).toBe(180000);
  });
  it("3 giờ 30 phút x 30.000 = 105.000đ, chỉ xử lý nhân viên được chọn", () => {
    const data = saveAttendance(fixture(), shift("2026-11-16", "employee-2"));
    const next = finalizeWages(data, employee.id, range, 30000, "Đợt 1");
    expect(next.wageCalculations[0]).toMatchObject({
      employeeId: employee.id,
      minutes: 210,
      hourlyRate: 30000,
      amount: 105000,
      notes: "Đợt 1",
    });
    expect(pendingShifts(next, employee.id, range)).toHaveLength(0);
    expect(pendingShifts(next, "employee-2", range)).toHaveLength(1);
    expect(data.wageCalculations).toHaveLength(0);
  });
  it("bấm lại không tạo thêm kết quả và không tính trùng khi đổi tuần/tháng", () => {
    const next = finalizeWages(
      fixture(),
      employee.id,
      { start: "2026-11-16", end: "2026-11-22" },
      30000,
      "",
    );
    expect(() => finalizeWages(next, employee.id, range, 30000, "")).toThrow(
      "không còn",
    );
    expect(pendingShifts(next, employee.id, range)).toHaveLength(0);
  });
  it("có ca mới thì chỉ tính riêng phần công mới", () => {
    let next = finalizeWages(fixture(), employee.id, range, 30000, "");
    next = saveAttendance(next, shift("2026-11-17"));
    expect(pendingShifts(next, employee.id, range)).toHaveLength(1);
    next = finalizeWages(next, employee.id, range, 40000, "Đơn giá đợt mới");
    expect(next.wageCalculations.map((r) => r.amount)).toEqual([
      105000, 140000,
    ]);
    expect(pendingShifts(next, employee.id, range)).toHaveLength(0);
  });
  it("kỳ sau có công mới không bị khóa bởi kỳ cũ", () => {
    let next = finalizeWages(fixture(), employee.id, range, 30000, "");
    next = saveAttendance(next, shift("2026-12-01"));
    expect(
      pendingShifts(next, employee.id, {
        start: "2026-12-01",
        end: "2026-12-31",
      }),
    ).toHaveLength(1);
  });
  it("ca đã tính bị khóa sửa/xóa; snapshot giữ nguyên", () => {
    const data = finalizeWages(fixture(), employee.id, range, 30000, ""),
      old = data.attendance["2026-11"][0];
    expect(() => saveAttendance(data, { ...old, notes: "Sửa" })).toThrow(
      "đã tính lương",
    );
    expect(() => removeAttendance(data, old)).toThrow("đã tính lương");
    expect(data.wageCalculations[0].amount).toBe(105000);
  });
  it("snapshot không đổi khi sửa tên và đơn giá trong hồ sơ", () => {
    const data = finalizeWages(fixture(), employee.id, range, 30000, "");
    data.employees[0] = {
      ...employee,
      name: "Tên mới",
      rates: [{ effectiveFrom: employee.startDate, amount: 50000 }],
    };
    expect(data.wageCalculations[0].employeeName).toBe("Huy");
    expect(data.wageCalculations[0].amount).toBe(105000);
  });
  it("từ chối đơn giá âm, 0, lẻ đồng, vô hạn và khoảng ngày sai", () => {
    for (const rate of [-1, 0, 1.5, NaN, Infinity])
      expect(() =>
        finalizeWages(fixture(), employee.id, range, rate, ""),
      ).toThrow();
    expect(() =>
      finalizeWages(
        fixture(),
        employee.id,
        { start: "2026-12-01", end: "2026-11-01" },
        30000,
        "",
      ),
    ).toThrow();
  });
  it("giờ công thay đổi trong khi đang xem form thì phải kiểm tra lại", () => {
    const data = fixture(),
      signature = shiftSignature(pendingShifts(data, employee.id, range)),
      next = saveAttendance(data, shift("2026-11-17"));
    expect(() =>
      finalizeWages(next, employee.id, range, 30000, "", signature),
    ).toThrow("đã thay đổi");
  });
  it("backup/restore giữ nguyên kết quả và trạng thái đã tính", () => {
    const data = finalizeWages(
        fixture(),
        employee.id,
        range,
        30000,
        "Đã kiểm tra",
      ),
      restored = restore(serialize(data));
    expect(restored).toEqual(data);
    expect(pendingShifts(restored, employee.id, range)).toHaveLength(0);
    expect(calculationsInRange(restored, employee.id, range)).toHaveLength(1);
  });
  it("backup một tháng giữ cả snapshot tuần vượt tháng và ca nguồn cần thiết", () => {
    let data = saveAttendance(
      { ...emptyData(), employees: [employee] },
      shift("2026-11-30"),
    );
    // Preserve support for historical/imported weekly calculations that span months.
    data.attendance["2026-12"] = [shift("2026-12-01")];
    data = finalizeWages(
      data,
      employee.id,
      { start: "2026-11-30", end: "2026-12-06" },
      30000,
      "Tuần giao tháng",
    );
    const restored = restore(serialize(monthBackup(data, "2026-11")));
    expect(restored.attendance["2026-11"]).toHaveLength(1);
    expect(restored.attendance["2026-12"]).toHaveLength(1);
    expect(restored.wageCalculations[0].amount).toBe(210000);
  });
  it("từ chối backup sửa số tiền, sửa ca đã tính hoặc có kết quả trùng", () => {
    const data = finalizeWages(fixture(), employee.id, range, 30000, "");
    const wrongAmount = structuredClone(data);
    wrongAmount.wageCalculations[0].amount++;
    expect(() => restore(serialize(wrongAmount))).toThrow();
    const wrongShift = structuredClone(data);
    wrongShift.attendance["2026-11"][0].notes = "Giả mạo";
    expect(() => restore(serialize(wrongShift))).toThrow();
    const duplicate = structuredClone(data);
    duplicate.wageCalculations.push({
      ...duplicate.wageCalculations[0],
      id: crypto.randomUUID(),
    });
    expect(() => restore(serialize(duplicate))).toThrow();
  });
  it("migration v3 thêm danh sách kết quả trống, giữ nguyên công và lương cũ", () => {
    const data = fixture(),
      old = { ...data, version: 3, wageCalculations: undefined };
    const next = migrate(old);
    expect(next.version).toBe(4);
    expect(next.wageCalculations).toEqual([]);
    expect(next.attendance).toEqual(data.attendance);
    expect(next.payroll).toEqual(data.payroll);
  });
});
