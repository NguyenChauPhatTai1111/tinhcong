import { describe, expect, it } from "vitest";
import type { AppData, Attendance, Employee, Payroll } from "../types";
import {
  emptyData,
  ensureMonth,
  migrate,
  monthBackup,
  removeAttendance,
  restore,
  saveAttendance,
  savePayroll,
  serialize,
} from "../services/storage";
import {
  assertNoOverlap,
  localISO,
  shiftMinutes,
  validDate,
} from "../utils/timeCalculator";
import {
  calculatePayroll,
  monthlyPayroll,
  rateAt,
  salary,
} from "../utils/salaryCalculator";
import { monthDays } from "../utils/format";
import { payrollCSV } from "../utils/csv";
const employee: Employee = {
  id: "employee-1",
  name: "Nguyễn Văn Huy",
  code: "NV001",
  phone: "",
  startDate: "2026-01-01",
  active: true,
  archived: false,
  notes: "",
  rates: [{ effectiveFrom: "2026-01-01", amount: 30000 }],
};
function shift(
  date = "2026-11-16",
  start = "08:00",
  end = "20:00",
  breakMinutes = 60,
  endDate = date,
  rate = 30000,
): Attendance {
  const s = localISO(date, start),
    e = localISO(endDate, end),
    actualMinutes = shiftMinutes(s, e, breakMinutes);
  return {
    id: crypto.randomUUID(),
    employeeId: employee.id,
    date,
    start: s,
    end: e,
    breakMinutes,
    actualMinutes,
    adjustmentReason: "",
    hourlyRate: rate,
    amount: salary(actualMinutes, rate),
    notes: "",
  };
}
function fixture(): AppData {
  return { ...emptyData(), employees: [structuredClone(employee)] };
}
function withPayroll(confirmed = false): {
  data: AppData;
  row: Attendance;
  payroll: Payroll;
} {
  let data = fixture();
  const row = shift();
  data = saveAttendance(data, row);
  const payroll = {
    ...calculatePayroll(employee, "2026-11", [row]),
    confirmed,
    confirmedAt: confirmed ? "2026-12-01T00:00:00.000Z" : null,
  };
  data = savePayroll(data, payroll);
  return { data, row, payroll };
}
describe("Tính giờ và lương", () => {
  it("08:00–20:00, nghỉ 60 phút = 11 giờ", () =>
    expect(shift().actualMinutes).toBe(660));
  it("08:00–17:00, không nghỉ = 9 giờ", () =>
    expect(shift("2026-11-16", "08:00", "17:00", 0).actualMinutes).toBe(540));
  it("giờ thực tế thay đổi theo từng ngày: 08–20 là 12 giờ, hôm sau 08–16 là 8 giờ nếu không nghỉ", () => {
    const a = shift("2026-11-16", "08:00", "20:00", 0);
    const b = shift("2026-11-17", "08:00", "16:00", 0);
    expect(a.actualMinutes).toBe(720);
    expect(b.actualMinutes).toBe(480);
    const p = calculatePayroll(employee, "2026-11", [a, b]);
    expect(p.minutes).toBe(1200);
    expect(p.base).toBe(600000);
  });
  it("20:00–06:00 hôm sau, nghỉ 60 phút = 9 giờ", () =>
    expect(
      shift("2026-11-16", "20:00", "06:00", 60, "2026-11-17").actualMinutes,
    ).toBe(540));
  it("30.000đ/giờ × 11 giờ = 330.000đ", () =>
    expect(salary(660, 30000)).toBe(330000));
  it("làm tròn từng ca đến đồng", () => expect(salary(1, 1000)).toBe(17));
  it("nghỉ vượt ca phải báo lỗi", () =>
    expect(() => shift("2026-11-16", "08:00", "09:00", 61)).toThrow(
      "Thời gian nghỉ",
    ));
  it("nghỉ âm và số phút lẻ bị từ chối", () => {
    expect(() => shift("2026-11-16", "08:00", "09:00", -1)).toThrow();
    expect(() => shift("2026-11-16", "08:00", "09:00", 0.5)).toThrow();
  });
  it("giờ, ngày không hợp lệ bị từ chối", () => {
    expect(() => localISO("2026-02-30", "08:00")).toThrow();
    expect(() => localISO("2026-11-16", "24:30")).toThrow();
    expect(validDate("2026-02-29")).toBe(false);
  });
  it("kết thúc trước bắt đầu bị từ chối", () =>
    expect(() => shift("2026-11-16", "20:00", "06:00", 0)).toThrow());
  it("cộng đúng đơn giá thay đổi giữa tháng", () => {
    const e = {
      ...employee,
      rates: [
        ...employee.rates,
        { effectiveFrom: "2026-11-15", amount: 40000 },
      ],
    };
    const a = shift(
      "2026-11-14",
      "08:00",
      "17:00",
      60,
      "2026-11-14",
      rateAt(e, "2026-11-14"),
    );
    const b = shift(
      "2026-11-16",
      "08:00",
      "17:00",
      60,
      "2026-11-16",
      rateAt(e, "2026-11-16"),
    );
    expect(calculatePayroll(e, "2026-11", [a, b]).base).toBe(560000);
    expect(a.hourlyRate).toBe(30000);
    expect(b.hourlyRate).toBe(40000);
  });
  it("đơn giá tương lai không áp dụng sớm", () =>
    expect(
      rateAt(
        {
          ...employee,
          rates: [
            ...employee.rates,
            { effectiveFrom: "2027-01-01", amount: 50000 },
          ],
        },
        "2026-12-31",
      ),
    ).toBe(30000));
});
describe("Ca làm và kỳ dữ liệu", () => {
  it("hai ca trùng phải báo lỗi", () =>
    expect(() => assertNoOverlap(shift(), [shift()])).toThrow("trùng"));
  it("cho phép hai ca liền nhau", () =>
    expect(() =>
      assertNoOverlap(shift("2026-11-16", "12:00", "17:00", 0), [
        shift("2026-11-16", "08:00", "12:00", 0),
      ]),
    ).not.toThrow());
  it("phát hiện ca qua đêm trùng sang tháng tiếp theo", () => {
    const d = saveAttendance(
      fixture(),
      shift("2026-11-30", "20:00", "06:00", 60, "2026-12-01"),
    );
    expect(() =>
      saveAttendance(d, shift("2026-12-01", "05:00", "08:00", 0)),
    ).toThrow("trùng");
  });
  it("chuyển tháng 12 sang tháng 1 giữ lịch sử và không chốt lương", () => {
    const d = saveAttendance(fixture(), shift("2026-12-31"));
    const next = ensureMonth(d, "2027-01");
    expect(next.attendance["2026-12"]).toHaveLength(1);
    expect(next.attendance["2027-01"]).toEqual([]);
    expect(next.payroll["2027-01"]).toEqual([]);
  });
  it("khởi tạo kỳ khi mở muộn không xóa tháng cũ", () => {
    const d = saveAttendance(fixture(), shift("2026-11-16"));
    const next = ensureMonth(d, "2027-04");
    expect(next.attendance["2026-11"]).toHaveLength(1);
    expect(next.attendance["2027-04"]).toEqual([]);
    expect(ensureMonth(next, "2027-04")).toBe(next);
  });
  it.each([
    ["2027-02", 28],
    ["2028-02", 29],
    ["2026-04", 30],
    ["2026-01", 31],
  ])("tháng %s có %i ngày", (month, days) =>
    expect(monthDays(String(month))).toBe(days),
  );
  it("giờ điều chỉnh cần lý do và không vượt thời gian ca", () => {
    const row = shift();
    expect(() =>
      saveAttendance(fixture(), { ...row, actualMinutes: 600, amount: 300000 }),
    ).toThrow("lý do");
    expect(() =>
      saveAttendance(fixture(), {
        ...row,
        actualMinutes: 600,
        amount: 300000,
        adjustmentReason: "Về sớm",
      }),
    ).not.toThrow();
    expect(() =>
      saveAttendance(fixture(), {
        ...row,
        actualMinutes: 1000,
        adjustmentReason: "Sai",
      }),
    ).toThrow();
  });
  it("ngày làm trước ngày vào làm bị chặn", () =>
    expect(() =>
      saveAttendance(
        { ...fixture(), employees: [{ ...employee, startDate: "2026-12-01" }] },
        shift(),
      ),
    ).toThrow("bắt đầu"));
});
describe("Bảng lương nháp và snapshot", () => {
  it("sửa tháng cũ tính lại bản nháp", () => {
    const { data, row } = withPayroll();
    const updated = saveAttendance(ensureMonth(data, "2027-01"), {
      ...row,
      actualMinutes: 600,
      amount: 300000,
      adjustmentReason: "Về sớm",
    });
    expect(updated.payroll["2026-11"][0].base).toBe(300000);
    expect(updated.attendance["2027-01"]).toHaveLength(0);
  });
  it("xóa ca tính lại bảng lương chưa chốt, giữ thưởng", () => {
    const { data, row } = withPayroll();
    data.payroll["2026-11"][0].bonus = 50000;
    data.payroll["2026-11"][0].total += 50000;
    const updated = removeAttendance(data, row);
    expect(updated.payroll["2026-11"][0].total).toBe(50000);
    expect(updated.payroll["2026-11"][0].minutes).toBe(0);
  });
  it("không xóa ca nếu khấu trừ làm thực nhận âm, không tự sửa khấu trừ", () => {
    const { data, row } = withPayroll();
    data.payroll["2026-11"][0].deduction = 100000;
    data.payroll["2026-11"][0].total -= 100000;
    expect(() => removeAttendance(data, row)).toThrow("khấu trừ");
    expect(data.attendance["2026-11"]).toHaveLength(1);
    expect(data.payroll["2026-11"][0].deduction).toBe(100000);
  });
  it("không thay đổi snapshot khi mức lương hoặc dữ liệu nguồn thay đổi", () => {
    const { payroll } = withPayroll(true);
    const saved = serialize({
      ...fixture(),
      payroll: { "2026-11": [payroll] },
    });
    expect(
      calculatePayroll(
        { ...employee, name: "Tên mới" },
        "2026-11",
        [],
        payroll,
      ),
    ).toBe(payroll);
    expect(serialize({ ...fixture(), payroll: { "2026-11": [payroll] } })).toBe(
      saved,
    );
  });
  it("không sửa, xóa, thêm ca hoặc sửa lương trong kỳ đã chốt", () => {
    const { data, row, payroll } = withPayroll(true);
    expect(() => saveAttendance(data, row)).toThrow("đã chốt");
    expect(() => removeAttendance(data, row)).toThrow("đã chốt");
    expect(() => saveAttendance(data, shift("2026-11-17"))).toThrow("đã chốt");
    expect(() => savePayroll(data, { ...payroll, bonus: 50000 })).toThrow(
      "đã chốt",
    );
  });
  it("không chuyển ca ra khỏi kỳ khóa", () => {
    const { data, row } = withPayroll(true);
    expect(() =>
      saveAttendance(data, { ...shift("2026-12-01"), id: row.id }),
    ).toThrow("đã chốt");
  });
  it("thực nhận gồm thưởng, phụ cấp, khấu trừ", () => {
    const { data, payroll } = withPayroll();
    const p = {
      ...payroll,
      bonus: 100000,
      allowance: 50000,
      deduction: 30000,
      notes: "Thưởng và phụ cấp",
      total: 450000,
    };
    expect(savePayroll(data, p).payroll["2026-11"][0].total).toBe(450000);
  });
  it("bảng lương từ ca đã lưu dùng đúng đơn giá gốc", () => {
    const d = saveAttendance(fixture(), shift());
    d.employees[0].rates[0].amount = 90000;
    expect(monthlyPayroll(d, "2026-11")[0].base).toBe(330000);
  });
});
describe("Sao lưu, migration và CSV", () => {
  it("backup và restore giữ nguyên snapshot và số tiền", () => {
    const { data } = withPayroll(true);
    expect(restore(serialize(data))).toEqual(data);
    expect(restore(serialize(data)).payroll["2026-11"][0].total).toBe(330000);
  });
  it("sao lưu từng tháng không mang ca tháng khác", () => {
    const { data } = withPayroll();
    const next = saveAttendance(data, shift("2026-12-01"));
    const backup = restore(serialize(monthBackup(next, "2026-11")));
    expect(Object.keys(backup.attendance)).toEqual(["2026-11"]);
    expect(backup.employees).toHaveLength(1);
  });
  it("migration v1 bổ sung settings, không đổi số tiền", () => {
    const { data } = withPayroll();
    const old = { ...data, version: 1, settings: undefined };
    expect(migrate(old).version).toBe(2);
    expect(migrate(old).settings.theme).toBe("light");
    expect(migrate(old).payroll["2026-11"][0].total).toBe(330000);
  });
  it("từ chối phiên bản lạ và JSON sai cấu trúc", () => {
    expect(() => restore("{")).toThrow();
    expect(() => migrate({ version: 99 })).toThrow("Phiên bản");
    expect(() => migrate({ version: 2, employees: [] })).toThrow();
  });
  it("từ chối tiền bị sửa trong file backup", () => {
    const { data } = withPayroll(true);
    data.attendance["2026-11"][0].amount++;
    expect(() => restore(serialize(data))).toThrow();
  });
  it("từ chối snapshot đã chốt bị thay đổi so với ca nguồn", () => {
    const { data } = withPayroll(true);
    data.payroll["2026-11"][0].shifts[0].notes = "Bị sửa";
    expect(() => restore(serialize(data))).toThrow();
  });
  it("từ chối ca trùng và hồ sơ trùng trong backup", () => {
    const { data } = withPayroll();
    data.attendance["2026-11"].push(shift());
    expect(() => restore(serialize(data))).toThrow();
    const d = fixture();
    d.employees.push(structuredClone(employee));
    expect(() => restore(serialize(d))).toThrow();
  });
  it("CSV có BOM, escape dấu ngoặc kép và chặn công thức Excel", () => {
    const { payroll } = withPayroll();
    const content = payrollCSV([
      { ...payroll, employeeName: '=HYPERLINK("x")' },
    ]);
    expect(content.charCodeAt(0)).toBe(0xfeff);
    expect(content).toContain(`"'=HYPERLINK(""x"")"`);
    expect(content).toContain("330000");
  });
});
