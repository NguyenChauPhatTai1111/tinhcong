import { describe, expect, it } from "vitest";
import type { AppData, Attendance, Employee } from "../types";
import {
  emptyData,
  ensureMonth,
  migrate,
  monthBackup,
  removeAttendance,
  restore,
  saveAttendance,
  serialize,
} from "../services/storage";
import {
  assertNoOverlap,
  localISO,
  shiftMinutes,
  validDate,
} from "../utils/timeCalculator";
import { calculatePayroll } from "../utils/salaryCalculator";
import { duration, monthDays } from "../utils/format";
import {
  csvContent,
  hoursCSV,
  lunchLabel,
  periodRange,
  shiftsInRange,
  summarizeHours,
  totalMinutes,
} from "../utils/timeSummary";
const employee: Employee = {
  id: "employee-1",
  name: "Nguyễn Văn Huy",
  code: "NV001",
  phone: "",
  startDate: "2026-01-01",
  active: true,
  archived: false,
  notes: "",
  rates: [],
};
function fixture(): AppData {
  return { ...emptyData(), employees: [structuredClone(employee)] };
}
function shift(
  date = "2026-11-16",
  start = "04:00",
  end = "08:00",
  rest = 30,
  endDate = date,
): Attendance {
  const s = localISO(date, start),
    e = localISO(endDate, end);
  return {
    id: crypto.randomUUID(),
    employeeId: employee.id,
    date,
    start: s,
    end: e,
    breakMinutes: rest,
    actualMinutes: shiftMinutes(s, e, rest),
    adjustmentReason: "",
    hourlyRate: 0,
    amount: 0,
    notes: "",
    ...(rest ? { breakKind: "lunch" as const } : {}),
  };
}
describe("Giờ làm và nghỉ tùy từng ca", () => {
  it("04:00–08:00 nghỉ nửa tiếng = 3 giờ 30 phút theo hội thoại", () => {
    expect(shift().actualMinutes).toBe(210);
    expect(duration(210)).toBe("3 giờ 30 phút");
  });
  it("04:00–08:00 không nghỉ = 4 giờ", () =>
    expect(shift("2026-11-16", "04:00", "08:00", 0).actualMinutes).toBe(240));
  it("08:00–20:00 nghỉ 1 giờ = 11 giờ", () =>
    expect(shift("2026-11-16", "08:00", "20:00", 60).actualMinutes).toBe(660));
  it("08:00–16:00 không nghỉ = 8 giờ, không áp dụng giờ cố định", () =>
    expect(shift("2026-11-17", "08:00", "16:00", 0).actualMinutes).toBe(480));
  it("20:00–06:00 hôm sau nghỉ 1,5 giờ = 8 giờ 30 phút", () =>
    expect(
      shift("2026-11-16", "20:00", "06:00", 90, "2026-11-17").actualMinutes,
    ).toBe(510));
  it("không cho nghỉ vượt ca, âm hoặc lẻ phút", () => {
    for (const rest of [241, -1, 0.5, NaN])
      expect(() => shift("2026-11-16", "04:00", "08:00", rest)).toThrow();
  });
  it("ngày, giờ nhập sai bị từ chối", () => {
    expect(() => localISO("2026-02-30", "08:00")).toThrow();
    expect(() => localISO("2026-11-16", "24:30")).toThrow();
    expect(validDate("2026-02-29")).toBe(false);
  });
  it("kết thúc trước bắt đầu bị từ chối nếu chưa chọn hôm sau", () =>
    expect(() => shift("2026-11-16", "20:00", "06:00", 0)).toThrow());
  it("hai ca trùng giờ bị chặn; ca liền nhau được phép", () => {
    expect(() => assertNoOverlap(shift(), [shift()])).toThrow("trùng");
    expect(() =>
      assertNoOverlap(shift("2026-11-16", "08:00", "12:00", 0), [shift()]),
    ).not.toThrow();
  });
  it("phát hiện ca trùng qua đêm và qua tháng", () => {
    const d = saveAttendance(
      fixture(),
      shift("2026-11-30", "20:00", "06:00", 30, "2026-12-01"),
    );
    expect(() =>
      saveAttendance(d, shift("2026-12-01", "05:00", "08:00", 0)),
    ).toThrow("trùng");
  });
  it("điều chỉnh giờ phải có lý do và không vượt thời gian có mặt", () => {
    const row = shift();
    expect(() =>
      saveAttendance(fixture(), { ...row, actualMinutes: 200 }),
    ).toThrow("lý do");
    expect(() =>
      saveAttendance(fixture(), {
        ...row,
        actualMinutes: 200,
        adjustmentReason: "Về sớm",
      }),
    ).not.toThrow();
    expect(() =>
      saveAttendance(fixture(), {
        ...row,
        actualMinutes: 500,
        adjustmentReason: "Sai",
      }),
    ).toThrow();
  });
  it("không tạo ca trước ngày vào làm hoặc cho nhân viên đã nghỉ", () => {
    expect(() =>
      saveAttendance(
        { ...fixture(), employees: [{ ...employee, startDate: "2026-12-01" }] },
        shift(),
      ),
    ).toThrow("bắt đầu");
    expect(() =>
      saveAttendance(
        { ...fixture(), employees: [{ ...employee, active: false }] },
        shift(),
      ),
    ).toThrow("nghỉ việc");
  });
  it("lưu ghi chú và loại nghỉ riêng cho từng ca", () => {
    const s = {
      ...shift(),
      breakKind: "other" as const,
      notes: "Đi việc riêng",
    };
    const next = saveAttendance(fixture(), s);
    expect(next.attendance["2026-11"][0].notes).toBe("Đi việc riêng");
    expect(lunchLabel(s)).toBe("Không nghỉ trưa");
    expect(lunchLabel(shift())).toBe("Có nghỉ trưa");
    expect(lunchLabel({ ...shift(), breakKind: undefined })).toBe(
      "Chưa ghi rõ loại nghỉ",
    );
  });
});
describe("Tổng hợp tuần, tháng, khoảng ngày", () => {
  it("tuần bắt đầu thứ Hai và kết thúc Chủ nhật, vượt tháng", () =>
    expect(periodRange("week", "", "2026-11-30", "", "")).toEqual({
      start: "2026-11-30",
      end: "2026-12-06",
    }));
  it("tuần vượt năm vẫn giữ đủ ngày", () =>
    expect(periodRange("week", "", "2027-01-01", "", "")).toEqual({
      start: "2026-12-28",
      end: "2027-01-03",
    }));
  it.each([
    ["2027-02", 28],
    ["2028-02", 29],
    ["2026-04", 30],
    ["2026-01", 31],
  ])("tháng %s có %i ngày", (month, days) => {
    expect(monthDays(String(month))).toBe(days);
    expect(periodRange("month", String(month), "", "", "").end).toBe(
      `${month}-${days}`,
    );
  });
  it("lọc khoảng ngày lấy cả hai đầu, bỏ ca ngoài kỳ", () => {
    let d = fixture();
    for (const date of ["2026-11-16", "2026-11-17", "2026-11-18"])
      d = saveAttendance(d, shift(date));
    const rows = shiftsInRange(
      d,
      periodRange("custom", "", "", "2026-11-16", "2026-11-17"),
    );
    expect(rows).toHaveLength(2);
    expect(totalMinutes(rows)).toBe(420);
  });
  it("từ chối khoảng đảo ngày hoặc ngày/tháng sai", () => {
    expect(() =>
      periodRange("custom", "", "", "2026-11-18", "2026-11-16"),
    ).toThrow();
    expect(() => periodRange("month", "2026-13", "", "", "")).toThrow();
    expect(() => periodRange("week", "", "", "", "")).toThrow();
  });
  it("tuần có thể cộng ca từ hai kỳ lưu trữ", () => {
    let d = saveAttendance(fixture(), shift("2026-11-30"));
    // Imported history may already span months before the monthly gate was introduced.
    d.attendance["2026-12"] = [shift("2026-12-01")];
    const rows = shiftsInRange(
      d,
      periodRange("week", "", "2026-12-01", "", ""),
    );
    expect(rows).toHaveLength(2);
    expect(totalMinutes(rows)).toBe(420);
  });
  it("nhiều ca trong ngày chỉ đếm một ngày; cộng đủ nghỉ và giờ thực tế", () => {
    const a = shift(),
      b = shift("2026-11-16", "13:00", "17:00", 0);
    const rows = summarizeHours(fixture(), [a, b]);
    expect(rows[0]).toMatchObject({
      days: 1,
      presence: 480,
      breaks: 30,
      actual: 450,
    });
  });
  it("ca qua tháng được tính theo ngày bắt đầu", () => {
    const d = saveAttendance(
      fixture(),
      shift("2026-11-30", "20:00", "06:00", 60, "2026-12-01"),
    );
    expect(
      shiftsInRange(d, { start: "2026-11-01", end: "2026-11-30" }),
    ).toHaveLength(1);
    expect(
      shiftsInRange(d, { start: "2026-12-01", end: "2026-12-31" }),
    ).toHaveLength(0);
  });
  it("hồ sơ lưu trữ vẫn xuất hiện khi có ca trong kỳ", () => {
    const d = fixture();
    d.employees[0].archived = true;
    expect(summarizeHours(d, [shift()])).toHaveLength(1);
    expect(summarizeHours(d, [])).toHaveLength(0);
  });
});
describe("Lưu trữ, sửa lịch sử và bảo toàn dữ liệu cũ", () => {
  it("nhân viên mới không cần đơn giá", () =>
    expect(restore(serialize(fixture())).employees[0].rates).toEqual([]));
  it("sửa/xóa ca cập nhật giờ, không thay đổi bản lưu tiền lương cũ", () => {
    const original = { ...shift(), hourlyRate: 30000, amount: 105000 };
    let d = saveAttendance(fixture(), original);
    const payroll = {
      ...calculatePayroll(employee, "2026-11", [original]),
      confirmed: true,
      confirmedAt: "2026-12-01T00:00:00.000Z",
    };
    d.payroll["2026-11"] = [payroll];
    const before = JSON.stringify(d.payroll);
    d = saveAttendance(d, {
      ...original,
      actualMinutes: 200,
      adjustmentReason: "Sửa công cũ",
    });
    expect(totalMinutes(d.attendance["2026-11"])).toBe(200);
    expect(JSON.stringify(d.payroll)).toBe(before);
    d = removeAttendance(d, d.attendance["2026-11"][0]);
    expect(totalMinutes(d.attendance["2026-11"])).toBe(0);
    expect(JSON.stringify(d.payroll)).toBe(before);
    expect(restore(serialize(d)).payroll["2026-11"][0]).toEqual(payroll);
  });
  it("migration v2 sang v3 giữ toàn bộ ca và bản lương cũ", () => {
    const row = { ...shift(), hourlyRate: 30000, amount: 105000 },
      e = {
        ...employee,
        rates: [{ effectiveFrom: employee.startDate, amount: 30000 }],
      };
    const old = {
      ...fixture(),
      version: 2,
      employees: [e],
      attendance: { "2026-11": [row] },
      payroll: { "2026-11": [calculatePayroll(e, "2026-11", [row])] },
    };
    const migrated = migrate(old);
    expect(migrated.version).toBe(4);
    expect(migrated.employees).toEqual(old.employees);
    expect(migrated.attendance).toEqual(old.attendance);
    expect(migrated.payroll).toEqual(old.payroll);
  });
  it("migration v1 bổ sung cài đặt và giữ giờ", () => {
    const old = {
      ...fixture(),
      version: 1,
      settings: undefined,
      employees: [
        {
          ...employee,
          rates: [{ effectiveFrom: employee.startDate, amount: 30000 }],
        },
      ],
    };
    expect(migrate(old).version).toBe(4);
    expect(migrate(old).settings.theme).toBe("light");
  });
  it("đổi tháng 12 sang tháng 1 hoặc mở muộn không xóa dữ liệu", () => {
    const d = saveAttendance(fixture(), shift("2026-12-31"));
    const next = ensureMonth(d, "2027-01");
    expect(next.attendance["2026-12"]).toHaveLength(1);
    expect(next.attendance["2027-01"]).toEqual([]);
    expect(ensureMonth(next, "2027-04").attendance["2026-12"]).toHaveLength(1);
  });
  it("backup/restore không sai tổng phút và nghỉ trưa", () => {
    const d = saveAttendance(fixture(), shift());
    expect(restore(serialize(d))).toEqual(d);
    expect(totalMinutes(restore(serialize(d)).attendance["2026-11"])).toBe(210);
  });
  it("backup một tháng vẫn giữ hồ sơ dùng chung", () => {
    let d = saveAttendance(fixture(), shift());
    d.attendance["2026-12"] = [shift("2026-12-01")];
    const restored = restore(serialize(monthBackup(d, "2026-11")));
    expect(Object.keys(restored.attendance)).toEqual(["2026-11"]);
    expect(restored.employees).toHaveLength(1);
  });
  it("từ chối JSON, phiên bản, bản ghi trùng và loại nghỉ sai", () => {
    expect(() => restore("{")).toThrow();
    expect(() => migrate({ version: 99 })).toThrow("Phiên bản");
    const d = saveAttendance(fixture(), shift());
    d.attendance["2026-11"].push(shift());
    expect(() => restore(serialize(d))).toThrow();
    const d2 = saveAttendance(fixture(), shift());
    (
      d2.attendance["2026-11"][0] as unknown as { breakKind: string }
    ).breakKind = "invalid";
    expect(() => restore(serialize(d2))).toThrow();
  });
});
describe("CSV giờ công", () => {
  it("BOM UTF8, cột giờ và phút chính xác, không có cột tiền", () => {
    const content = hoursCSV(summarizeHours(fixture(), [shift()]), {
      start: "2026-11-16",
      end: "2026-11-16",
    });
    expect(content.charCodeAt(0)).toBe(0xfeff);
    expect(content).toContain('"210","3.5"');
    expect(content).not.toContain("Lương");
    expect(content).not.toContain("Đơn giá");
  });
  it("chặn công thức Excel và escape ký tự đặc biệt", () => {
    const content = csvContent([['=HYPERLINK("x")', "Ghi chú, có dấu"]]);
    expect(content).toContain(`"'=HYPERLINK(""x"")"`);
    expect(content).toContain('"Ghi chú, có dấu"');
  });
});
