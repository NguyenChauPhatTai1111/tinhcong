import { describe, expect, it } from "vitest";
import type { AppData, Attendance, Employee } from "../types";
import {
  emptyData,
  ensureMonth,
  restore,
  saveAttendance,
  serialize,
} from "../services/storage";
import {
  assertPreviousPayrollComplete,
  outstandingPayrollBefore,
} from "../services/monthlyPayrollGate";
import { finalizeWages } from "../services/wages";
import { localISO } from "../utils/timeCalculator";
const employee: Employee = {
  id: "e1",
  name: "Huy",
  code: "NV001",
  startDate: "2026-01-01",
  phone: "",
  notes: "",
  active: true,
  archived: false,
  rates: [],
};
function shift(date = "2026-11-16", employeeId = employee.id): Attendance {
  return {
    id: crypto.randomUUID(),
    employeeId,
    date,
    start: localISO(date, "04:00"),
    end: localISO(date, "08:00"),
    breakMinutes: 30,
    actualMinutes: 210,
    adjustmentReason: "",
    hourlyRate: 0,
    amount: 0,
    notes: "",
    breakKind: "lunch",
  };
}
function fixture(): AppData {
  return saveAttendance(
    {
      ...emptyData(),
      employees: [
        employee,
        { ...employee, id: "e2", code: "NV002", name: "Mai" },
      ],
    },
    shift(),
  );
}
const november = { start: "2026-11-01", end: "2026-11-30" };
describe("Bắt buộc hoàn tất lương cũ trước khi chấm công tháng mới", () => {
  it("còn công tháng 11 thì không tạo được ca tháng 12", () => {
    const data = fixture();
    expect(() => saveAttendance(data, shift("2026-12-01"))).toThrow(
      "tính xong lương tháng 11/2026",
    );
    expect(data.attendance["2026-12"]).toBeUndefined();
  });
  it("tính xong tháng cũ thì tự mở khóa, không cần cờ lưu riêng", () => {
    let data = finalizeWages(fixture(), employee.id, november, 30000, "");
    expect(outstandingPayrollBefore(data, "2026-12")).toEqual([]);
    data = saveAttendance(data, shift("2026-12-01"));
    expect(data.attendance["2026-12"]).toHaveLength(1);
  });
  it("tính một người chưa đủ, phải hoàn tất tất cả người có công cũ", () => {
    let data = saveAttendance(fixture(), shift("2026-11-16", "e2"));
    data = finalizeWages(data, "e1", november, 30000, "");
    expect(outstandingPayrollBefore(data, "2026-12")[0].employeeIds).toEqual([
      "e2",
    ]);
    expect(() => saveAttendance(data, shift("2026-12-01", "e1"))).toThrow();
    data = finalizeWages(data, "e2", november, 40000, "");
    expect(() => saveAttendance(data, shift("2026-12-01", "e1"))).not.toThrow();
  });
  it("tuần đã tính nhưng còn ca khác trong tháng vẫn chặn", () => {
    let data = saveAttendance(fixture(), shift("2026-11-23"));
    data = finalizeWages(
      data,
      "e1",
      { start: "2026-11-16", end: "2026-11-22" },
      30000,
      "Tuần 1",
    );
    expect(outstandingPayrollBefore(data, "2026-12")[0]).toMatchObject({
      shiftCount: 1,
      minutes: 210,
    });
    expect(() => saveAttendance(data, shift("2026-12-01"))).toThrow();
    data = finalizeWages(data, "e1", november, 30000, "Phần còn lại");
    expect(() => saveAttendance(data, shift("2026-12-01"))).not.toThrow();
  });
  it("vẫn cho bổ sung/sửa công ở tháng đang cần hoàn tất", () => {
    const data = fixture(),
      old = data.attendance["2026-11"][0];
    expect(() => saveAttendance(data, shift("2026-11-17"))).not.toThrow();
    const changed = saveAttendance(data, { ...old, notes: "Kiểm tra công cũ" });
    expect(changed.attendance["2026-11"][0].notes).toBe("Kiểm tra công cũ");
  });
  it("tính xong rồi bổ sung công cũ thì tháng mới bị chặn lại", () => {
    let data = finalizeWages(fixture(), "e1", november, 30000, "");
    data = saveAttendance(data, shift("2026-11-17"));
    expect(() => saveAttendance(data, shift("2026-12-01"))).toThrow();
  });
  it("không bỏ sót nhiều tháng trước và sắp xếp kỳ cũ nhất trước", () => {
    const data = fixture();
    data.attendance["2026-10"] = [shift("2026-10-30", "e2")];
    expect(
      outstandingPayrollBefore(data, "2027-01").map((p) => p.month),
    ).toEqual(["2026-10", "2026-11"]);
    let next = finalizeWages(data, "e1", november, 30000, "");
    expect(() => saveAttendance(next, shift("2027-01-01"))).toThrow("10/2026");
    next = finalizeWages(
      next,
      "e2",
      { start: "2026-10-01", end: "2026-10-31" },
      30000,
      "",
    );
    expect(() => saveAttendance(next, shift("2027-01-01"))).not.toThrow();
  });
  it("tháng 12 sang tháng 1 năm mới không lọt ràng buộc", () => {
    let data = saveAttendance(
      { ...emptyData(), employees: [employee] },
      shift("2026-12-31"),
    );
    expect(() => saveAttendance(data, shift("2027-01-01"))).toThrow("12/2026");
    data = finalizeWages(
      data,
      "e1",
      { start: "2026-12-01", end: "2026-12-31" },
      30000,
      "",
    );
    expect(() => saveAttendance(data, shift("2027-01-01"))).not.toThrow();
  });
  it("không có ca hoặc tổng phút thực tế bằng 0 thì không bắt tính lương", () => {
    const data = { ...emptyData(), employees: [employee] };
    data.attendance["2026-11"] = [
      { ...shift(), breakMinutes: 240, actualMinutes: 0 },
    ];
    expect(outstandingPayrollBefore(data, "2026-12")).toEqual([]);
    expect(() => saveAttendance(data, shift("2026-12-01"))).not.toThrow();
  });
  it("nhân viên đã nghỉ/lưu trữ vẫn cần được tính công cũ", () => {
    const data = fixture();
    data.employees = data.employees.map((e) => ({
      ...e,
      active: false,
      archived: true,
    }));
    expect(outstandingPayrollBefore(data, "2026-12")[0].employeeIds).toContain(
      "e1",
    );
  });
  it("reload/restore và mở ứng dụng trễ vẫn giữ ràng buộc, không xóa công", () => {
    const data = ensureMonth(restore(serialize(fixture())), "2027-03");
    expect(data.attendance["2026-11"]).toHaveLength(1);
    expect(data.attendance["2027-03"]).toEqual([]);
    expect(() => saveAttendance(data, shift("2027-03-10"))).toThrow("11/2026");
  });
  it("không thể sửa ca tháng mới đã có sẵn để né backlog từ bản sao lưu", () => {
    const data = fixture(),
      newShift = shift("2026-12-01");
    data.attendance["2026-12"] = [newShift];
    expect(() =>
      saveAttendance(data, { ...newShift, notes: "Đổi ghi chú" }),
    ).toThrow("11/2026");
    expect(data.attendance["2026-12"][0].notes).toBe("");
  });
  it("ca đã tính theo tuần vượt tháng được nhận diện đúng bằng ID", () => {
    const data = fixture();
    data.attendance["2026-12"] = [shift("2026-12-01")];
    const next = finalizeWages(
      data,
      "e1",
      { start: "2026-11-01", end: "2026-12-06" },
      30000,
      "Kỳ vượt tháng",
    );
    expect(outstandingPayrollBefore(next, "2027-01")).toEqual([]);
  });
  it("từ chối tháng không hợp lệ", () =>
    expect(() => assertPreviousPayrollComplete(fixture(), "2026-13")).toThrow(
      "không hợp lệ",
    ));
});
