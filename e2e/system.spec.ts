import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  ADMIN_PASSWORD,
  fillSetup,
  readData,
  setupAdmin,
} from "./helpers";
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (e) => list.push(e.message));
  await page.clock.setFixedTime(new Date("2026-11-18T03:00:00Z"));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
async function addEmployee(page: Page) {
  await page.goto("/#/nhan-vien");
  await page
    .getByRole("button", { name: "Thêm nhân viên", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Lương theo giờ (đ) *")).toHaveCount(0);
  await page.getByLabel("Họ và tên *").fill("Nguyễn Văn Huy");
  await page.getByLabel("Ngày bắt đầu *").fill("2026-01-01");
  await page
    .getByRole("button", { name: "Lưu nhân viên", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
}
async function addShift(
  page: Page,
  date: string,
  start: string,
  end: string,
  rest?: string,
) {
  await page
    .getByRole("button", { name: "Chấm công mới", exact: true })
    .first()
    .click();
  await page.getByLabel("Ngày làm việc *").fill(date);
  await page
    .getByLabel("Nhân viên *", { exact: true })
    .selectOption({ label: "Nguyễn Văn Huy · NV001" });
  await page.getByLabel("Giờ bắt đầu *").fill(start);
  await page.getByLabel("Giờ kết thúc *").fill(end);
  if (rest) {
    await page.getByLabel("Có nghỉ trưa / nghỉ giữa ca").check();
    await page.getByLabel("Thời gian nghỉ (giờ)").fill(rest);
  }
  await page
    .getByLabel("Ghi chú", { exact: true })
    .fill(rest ? "Nghỉ trưa theo giờ báo lại" : "Không nghỉ trưa");
  await page
    .getByRole("button", { name: "Lưu chấm công", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
}
test("Giờ công theo hội thoại: nghỉ linh hoạt, tuần/tháng/khoảng ngày, sửa/xóa và backup", async ({
  page,
}) => {
  await setupAdmin(page);
  await addEmployee(page);
  await page.goto("/#/cham-cong");
  await page.getByLabel("Chọn tháng và năm").fill("2026-11");
  await addShift(page, "2026-11-16", "04:00", "08:00", "0,5");
  await expect(page.locator("tbody")).toContainText("3 giờ 30 phút");
  await page.getByRole("button", { name: "Xem chấm công" }).click();
  await expect(page.locator("dialog .detail-entry-list")).toContainText("Có nghỉ trưa");
  await page.getByRole("button", { name: "Đóng", exact: true }).last().click();
  await addShift(page, "2026-11-17", "04:00", "09:00");
  await addShift(page, "2026-11-18", "20:00", "06:00", "1.5");
  await page.getByRole("button", { name: "Xem chấm công" }).click();
  await expect(page.locator("dialog .detail-entry-list")).toContainText("8 giờ 30 phút");
  await expect(page.locator("dialog .detail-entry-list")).toContainText("Không nghỉ trưa");
  await page.getByRole("button", { name: "Đóng", exact: true }).last().click();
  await page.getByRole("button", { name: "Xem lịch" }).click();
  await expect(
    page.locator(".calendar-day").filter({ hasText: "1 ca làm" }),
  ).toHaveCount(3);
  await page.goto("/#/tong-hop");
  await expect(page.getByTestId("summary-worked")).toHaveText("17 giờ");
  await page.getByRole("button", { name: "Theo tuần", exact: true }).click();
  await page.getByLabel("Chọn ngày trong tuần").fill("2026-11-18");
  await expect(page.getByTestId("summary-worked")).toHaveText("17 giờ");
  await page.getByRole("button", { name: "Khoảng ngày", exact: true }).click();
  await page.getByLabel("Từ ngày", { exact: true }).fill("2026-11-16");
  await page.getByLabel("Đến ngày", { exact: true }).fill("2026-11-16");
  await expect(page.getByTestId("summary-worked")).toHaveText("3 giờ 30 phút");
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  const csv = await readFile((await (await csvDownload).path())!, "utf8");
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('"210","3.5"');
  expect(csv).not.toContain("Thực nhận");
  await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
  await expect(page.locator("#print-payslip")).toContainText(
    "Nghỉ trưa theo giờ báo lại",
  );
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.goto("/#/cham-cong");
  await page.getByRole("button", { name: "Xem chấm công" }).click();
  await page
    .getByRole("button", {
      name: "Sửa ca Nguyễn Văn Huy 2026-11-16",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Thời gian nghỉ (giờ)")).toHaveValue("0.5");
  await page.getByLabel("Giờ kết thúc *").fill("09:00");
  await expect(page.locator(".calculation")).toContainText("4 giờ 30 phút");
  await page
    .getByRole("button", { name: "Lưu chấm công", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Xóa ca Nguyễn Văn Huy 2026-11-17",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Xóa ca làm", exact: true }).click();
  await expect(page.locator("dialog")).toHaveCount(1);
  await page.goto("/#/tong-hop");
  await expect(page.getByTestId("summary-worked")).toHaveText("13 giờ");
  await page.reload();
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByTestId("summary-worked")).toHaveText("13 giờ");
  const data = await readData(page);
  expect(data.version).toBe(4);
  expect(data.employees[0].rates).toEqual([]);
  expect(data.attendance["2026-11"][0].amount).toBe(0);
  await page.goto("/#/cai-dat");
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất JSON", exact: true }).click();
  const encrypted = await readFile(
    (await (await jsonDownload).path())!,
    "utf8",
  );
  expect(encrypted).not.toContain("Nguyễn Văn Huy");
  await page
    .getByLabel("Chọn file sao lưu", { exact: true })
    .setInputFiles({
      name: "gio-cong.json",
      mimeType: "application/json",
      buffer: Buffer.from(encrypted),
    });
  await page
    .getByLabel("Mật khẩu bản sao lưu", { exact: true })
    .fill(ADMIN_PASSWORD);
  await page
    .getByRole("button", { name: "Mở bản sao lưu", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Khôi phục dữ liệu", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.goto("/#/tong-hop");
  await expect(page.getByTestId("summary-worked")).toHaveText("13 giờ");
});
test("Đổi năm khi đang mở và xem/sửa tháng cũ", async ({ page }) => {
  await setupAdmin(page);
  await addEmployee(page);
  await page.goto("/#/cham-cong");
  await addShift(page, "2026-11-16", "04:00", "08:00", "0.5");
  await page.clock.setFixedTime(new Date("2027-01-01T03:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".month-picker")).toContainText("Tháng 1, 2027");
  await expect
    .poll(async () => Object.keys((await readData(page)).attendance))
    .toContain("2027-01");
  await page.getByLabel("Chọn tháng và năm").fill("2026-11");
  await expect(page.locator("tbody")).toContainText("3 giờ 30 phút");
  await page.goto("/#/lich-su");
  await expect(page.getByTestId("summary-worked")).toHaveText("3 giờ 30 phút");
  await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#print-payslip")).toBeVisible();
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.pdf({ path: "artifacts/tong-hop-gio-cong.pdf", format: "A4" });
});
test("Responsive và chế độ tối, giao diện không có chức năng tính tiền", async ({
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
    await expect(page.locator("main")).not.toContainText("Tiền lương");
    await page.screenshot({
      path: `artifacts/dashboard-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page
    .getByRole("link", { name: "Tổng hợp giờ công", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tổng hợp giờ công", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Bật chế độ tối", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.reload();
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(page.getByRole('heading', { name: 'Tổng hợp giờ công', exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/tong-hop-mobile-dark.png",
    fullPage: true,
  });
});
test("Dữ liệu hỏng được giữ nguyên, chỉ ghi đè sau khi chọn backup hợp lệ", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("congviet:data", "du-lieu-hong"),
  );
  await page.goto("/");
  await expect(page.locator(".auth-card>.alert.error")).toContainText(
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
  await expect(page.locator(".auth-card>.alert.error").last()).toContainText(
    "Phiên bản dữ liệu không được hỗ trợ",
  );
  const backup = {
    version: 3,
    employees: [],
    attendance: {},
    payroll: {},
    settings: { theme: "light", company: "Đã khôi phục" },
  };
  await page
    .getByLabel("Chọn bản sao lưu để khôi phục", { exact: true })
    .setInputFiles({
      name: "tot.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await fillSetup(page);
  expect((await readData(page)).settings.company).toBe("Đã khôi phục");
});
