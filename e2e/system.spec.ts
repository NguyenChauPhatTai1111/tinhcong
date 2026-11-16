import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  ADMIN_PASSWORD,
  fillSetup,
  readData,
  setupAdmin,
  signIn,
} from "./helpers";
const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-11-16T03:00:00Z"));
});
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});
test("Dữ liệu hỏng không bị ghi đè; từ chối backup sai và khôi phục bản hợp lệ", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("congviet:data", "du-lieu-hong"),
  );
  await page.goto("/#/cai-dat");
  await expect(page.locator(".auth-card > .alert.error")).toContainText(
    "Không thể mở dữ liệu",
  );
  expect(await page.evaluate(() => localStorage.getItem("congviet:data"))).toBe(
    "du-lieu-hong",
  );
  await page
    .getByLabel("Chọn bản sao lưu để khôi phục", { exact: true })
    .setInputFiles({
      name: "sai.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(page.locator(".auth-card > .alert.error").last()).toContainText(
    "Phiên bản dữ liệu không được hỗ trợ",
  );
  await expect(page.locator("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("congviet:data"))).toBe(
    "du-lieu-hong",
  );
  const backup = {
    version: 2,
    employees: [],
    attendance: {},
    payroll: {},
    settings: { theme: "light", company: "Khôi phục hợp lệ" },
  };
  await page
    .getByLabel("Chọn bản sao lưu để khôi phục", { exact: true })
    .setInputFiles({
      name: "tot.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await fillSetup(page);
  await expect(page.locator("main > .alert.error")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("congviet:data")!).format,
    ),
  ).toBe("congviet-vault");
  expect((await readData(page)).settings.company).toBe("Khôi phục hợp lệ");
});
test("Luồng nhân viên → chấm công → lương → snapshot → reload → backup", async ({
  page,
}) => {
  await setupAdmin(page);
  await page.evaluate(() => {
    location.hash = "/";
  });
  await expect(
    page.getByRole("heading", { name: "Tổng quan", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".stat-value").first()).toContainText("00");
  await page.goto("/#/nhan-vien");
  await page
    .getByRole("button", { name: "Thêm nhân viên", exact: true })
    .first()
    .click();
  await page.getByLabel("Họ và tên *").fill("Nguyễn Văn Huy");
  await page.getByLabel("Ngày bắt đầu *").fill("2026-01-01");
  await page.getByLabel("Lương theo giờ (đ) *").fill("30000");
  await page
    .getByRole("button", { name: "Lưu nhân viên", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await expect(page.locator("tbody")).toContainText("Nguyễn Văn Huy");
  await page.reload();
  await signIn(page);
  await expect(page.locator("tbody")).toContainText("Nguyễn Văn Huy");
  await page.goto("/#/cham-cong");
  await page.getByLabel("Chọn tháng và năm").fill("2026-11");
  await page
    .getByRole("button", { name: "Chấm công mới", exact: true })
    .first()
    .click();
  await page.getByLabel("Ngày làm việc *").fill("2026-11-16");
  await page
    .getByLabel("Nhân viên *", { exact: true })
    .selectOption({ label: "Nguyễn Văn Huy · NV001" });
  await page.getByLabel("Giờ kết thúc *").fill("20:00");
  await page.getByLabel("Có nghỉ trưa / nghỉ giữa ca").check();
  await page.getByLabel("Thời gian nghỉ (giờ)").fill("0,5");
  await expect(page.locator(".calculation")).toContainText("11,5 giờ");
  await expect(page.locator(".calculation")).toContainText("345.000đ");
  await page.getByLabel("Thời gian nghỉ (giờ)").fill("1.5");
  await expect(page.locator(".calculation")).toContainText("10,5 giờ");
  await expect(page.locator(".calculation")).toContainText("315.000đ");
  await page.getByLabel("Thời gian nghỉ (giờ)").fill("1");
  await expect(page.locator(".calculation")).toContainText("330.000đ");
  await page.getByRole("button", { name: "Lưu chấm công" }).click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await expect(page.locator("tbody")).toContainText("11 giờ");
  await page
    .getByRole("button", { name: "Sửa ca Nguyễn Văn Huy 2026-11-16" })
    .click();
  await expect(page.getByLabel("Thời gian nghỉ (giờ)")).toHaveValue("1");
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("button", { name: "Xem lịch" }).click();
  await expect(
    page.locator(".calendar-day").filter({ hasText: "1 ca làm" }),
  ).toHaveCount(1);
  await page.goto("/#/bang-luong");
  await page.getByRole("button", { name: "Tính lương tất cả" }).click();
  await expect(page.locator("tbody")).toContainText("330.000đ");
  await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
  await page.getByLabel("Thưởng (đ)").fill("50000");
  await page.getByLabel("Ghi chú điều chỉnh").fill("Thưởng chuyên cần");
  await page
    .getByRole("button", { name: "Lưu bảng lương", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await expect(page.locator("tbody")).toContainText("380.000đ");
  await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
  await page
    .getByRole("button", { name: "Chốt bảng lương", exact: true })
    .click();
  await page.getByRole("button", { name: "Chốt và khóa dữ liệu" }).click();
  await expect(page.getByLabel("Thưởng (đ)")).toBeDisabled();
  await page.getByRole("button", { name: "Đánh dấu đã thanh toán" }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.locator("#print-payslip")).toContainText("Đã thanh toán");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.reload();
  await signIn(page);
  await expect(page.locator("tbody")).toContainText("Đã thanh toán");
  await page.goto("/#/cham-cong");
  await expect(
    page.getByRole("button", { name: "Sửa ca Nguyễn Văn Huy 2026-11-16" }),
  ).toBeDisabled();
  await page.goto("/#/cai-dat");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất JSON", exact: true }).click();
  const downloaded = await download;
  await expect(downloaded.suggestedFilename()).toMatch(/cong-viet-toan-bo/);
  const raw = await page.evaluate(() => localStorage.getItem("congviet:data"));
  expect(raw).not.toContain("Nguyễn Văn Huy");
  expect(raw).not.toContain(ADMIN_PASSWORD);
  expect((await readData(page)).payroll["2026-11"][0].total).toBe(380000);
  const backupRaw = await readFile((await downloaded.path())!, "utf8");
  expect(JSON.parse(backupRaw).format).toBe("congviet-vault");
  expect(backupRaw).not.toContain("Nguyễn Văn Huy");
  await page.getByLabel("Chọn file sao lưu", { exact: true }).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backupRaw),
  });
  await page
    .getByLabel("Mật khẩu bản sao lưu", { exact: true })
    .fill(ADMIN_PASSWORD);
  await page
    .getByRole("button", { name: "Mở bản sao lưu", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Khôi phục và ghi đè dữ liệu?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Khôi phục dữ liệu", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = "/";
  });
  await expect(page.locator(".stat-value").nth(4)).toContainText("380.000đ");
});
test("Responsive và chế độ tối trên desktop, tablet, mobile", async ({
  page,
}) => {
  await setupAdmin(page);
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => {
      location.hash = "/";
    });
    await expect(
      page.getByRole("heading", { name: "Tổng quan", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBeTruthy();
    await page.screenshot({
      path: `artifacts/dashboard-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page
    .getByRole("link", { name: "Nhân viên", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Quản lý nhân viên", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bật chế độ tối" }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.reload();
  await signIn(page);
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(
    page.getByRole("heading", { name: "Quản lý nhân viên", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/mobile-dark.png", fullPage: true });
});
test("Giờ công theo từng ngày, sửa/xóa ca cũ và chuyển năm khi trang đang mở", async ({
  page,
}) => {
  await setupAdmin(page);
  await page.goto("/#/nhan-vien");
  await page
    .getByRole("button", { name: "Thêm nhân viên", exact: true })
    .first()
    .click();
  await page.getByLabel("Họ và tên *").fill("Trần Mai");
  await page.getByLabel("Ngày bắt đầu *").fill("2026-01-01");
  await page
    .getByRole("button", { name: "Lưu nhân viên", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.goto("/#/cham-cong");
  for (const [day, end, expected] of [
    ["2026-11-16", "20:00", "12 giờ"],
    ["2026-11-17", "16:00", "8 giờ"],
  ]) {
    await page
      .getByRole("button", { name: "Chấm công mới", exact: true })
      .first()
      .click();
    await page.getByLabel("Ngày làm việc *").fill(day);
    await page
      .getByLabel("Nhân viên *", { exact: true })
      .selectOption({ label: "Trần Mai · NV001" });
    await page.getByLabel("Giờ kết thúc *").fill(end);
    await page.getByLabel("Có nghỉ trưa / nghỉ giữa ca").uncheck();
    await expect(page.locator(".calculation")).toContainText(expected);
    await page.getByRole("button", { name: "Lưu chấm công" }).click();
    await expect(page.locator("dialog")).toHaveCount(0);
  }
  await page.goto("/#/bang-luong");
  await page.getByRole("button", { name: "Tính lương tất cả" }).click();
  await expect(page.locator("tbody")).toContainText("600.000đ");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "artifacts/bang-luong-mobile.png",
    fullPage: true,
  });
  await page.clock.setFixedTime(new Date("2027-01-01T03:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".month-picker")).toContainText("Tháng 1, 2027");
  await expect(
    page.getByRole("heading", { name: "Chưa có bảng lương phù hợp" }),
  ).toBeVisible();
  await expect
    .poll(async () => Object.keys((await readData(page)).attendance))
    .toContain("2027-01");
  const current = await readData(page);
  expect(current.attendance["2027-01"]).toEqual([]);
  expect(current.payroll["2026-11"][0].confirmed).toBe(false);
  await page.goto("/#/cham-cong");
  await page.getByLabel("Chọn tháng và năm").fill("2026-11");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "artifacts/cham-cong-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Sửa ca Trần Mai 2026-11-16" })
    .click();
  await page.getByLabel("Giờ kết thúc *").fill("19:00");
  await expect(page.locator(".calculation")).toContainText("11 giờ");
  await page.getByRole("button", { name: "Lưu chấm công" }).click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.goto("/#/bang-luong");
  await expect(page.locator("tbody")).toContainText("570.000đ");
  await page.goto("/#/cham-cong");
  await page
    .getByRole("button", { name: "Xóa ca Trần Mai 2026-11-17" })
    .click();
  await page.getByRole("button", { name: "Xóa ca làm", exact: true }).click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.goto("/#/bang-luong");
  await expect(page.locator("tbody")).toContainText("330.000đ");
  await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#print-payslip")).toBeVisible();
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.pdf({ path: "artifacts/phieu-luong.pdf", format: "A4" });
});
