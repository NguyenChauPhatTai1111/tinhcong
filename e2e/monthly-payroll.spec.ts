import { test, expect } from "@playwright/test";
import { readData, setupAdmin, signIn } from "./helpers";
test("Đầu năm mới bắt tính xong lương cũ cho tất cả người làm rồi mới lưu công mới", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.setFixedTime(new Date("2026-12-31T03:00:00Z"));
  await setupAdmin(page);
  await page.goto("/#/nhan-vien");
  for (const name of ["Nguyễn Văn Huy", "Trần Mai"]) {
    await page
      .getByRole("button", { name: "Thêm nhân viên", exact: true })
      .first()
      .click();
    await page.getByLabel("Họ và tên *").fill(name);
    await page.getByLabel("Ngày bắt đầu *").fill("2026-01-01");
    await page
      .getByRole("button", { name: "Lưu nhân viên", exact: true })
      .click();
    await expect(page.locator("dialog")).toHaveCount(0);
  }
  await page.goto("/#/cham-cong");
  async function addShift(name: string, day: string) {
    await page
      .getByRole("button", { name: "Chấm công mới", exact: true })
      .first()
      .click();
    await page.getByLabel("Ngày làm việc *").fill(day);
    await page
      .getByLabel("Nhân viên *", { exact: true })
      .selectOption({ label: name });
    await page.getByLabel("Giờ bắt đầu *").fill("04:00");
    await page.getByLabel("Giờ kết thúc *").fill("08:00");
    await page.getByLabel("Có nghỉ trưa / nghỉ giữa ca").check();
    await page.getByLabel("Thời gian nghỉ (giờ)").fill("0.5");
    await page
      .getByRole("button", { name: "Lưu chấm công", exact: true })
      .click();
    await expect(page.locator("dialog")).toHaveCount(0);
  }
  await addShift("Nguyễn Văn Huy · NV001", "2026-12-31");
  await addShift("Trần Mai · NV002", "2026-12-31");
  await page.clock.setFixedTime(new Date("2027-01-01T03:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator("main>.monthly-payroll-notice")).toContainText(
    "2 nhân viên",
  );
  await expect(page.locator("main>.monthly-payroll-notice")).toContainText(
    "01/2027",
  );
  await page.reload();
  await signIn(page);
  await expect(page.locator("main>.monthly-payroll-notice")).toContainText(
    "12/2026",
  );
  await page
    .getByRole("button", { name: "Chấm công mới", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Lưu chấm công", exact: true }),
  ).toBeDisabled();
  await page
    .locator("dialog")
    .getByRole("button", { name: "Tính lương tháng 12/2026", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tổng hợp giờ công", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".month-picker")).toContainText("Tháng 12, 2026");
  async function calculate(name: string, rate: string) {
    await page
      .locator("tbody>tr")
      .filter({ hasText: name })
      .getByRole("button", { name: "Tính lương", exact: true })
      .click();
    await page.getByLabel("Đơn giá của nhân viên (đ/giờ) *").fill(rate);
    await page
      .getByRole("button", { name: "Xác nhận tính lương", exact: true })
      .click();
    await expect(page.locator("dialog")).toHaveCount(0);
  }
  await calculate("Nguyễn Văn Huy", "30000");
  await expect(page.locator("main>.monthly-payroll-notice")).toContainText(
    "1 nhân viên",
  );
  await page.getByRole("button", { name: "Theo tuần", exact: true }).click();
  await page.goto("/#/cham-cong");
  await page.getByLabel("Chọn tháng và năm").fill("2027-01");
  await page
    .getByRole("button", { name: "Chấm công mới", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Lưu chấm công", exact: true }),
  ).toBeDisabled();
  await page
    .locator("dialog")
    .getByRole("button", { name: "Tính lương tháng 12/2026", exact: true })
    .click();
  await expect(page.locator(".month-picker")).toContainText("Tháng 12, 2026");
  await expect(page.locator(".time-filters select")).toHaveValue("all");
  await calculate("Trần Mai", "40000");
  await expect(page.locator("main>.monthly-payroll-notice")).toHaveCount(0);
  await page.goto("/#/cham-cong");
  await page.getByLabel("Chọn tháng và năm").fill("2027-01");
  await addShift("Nguyễn Văn Huy · NV001", "2027-01-01");
  await expect(page.locator("tbody")).toContainText("3 giờ 30 phút");
  await page.reload();
  await signIn(page);
  await expect(page.locator("main>.monthly-payroll-notice")).toHaveCount(0);
  const data = await readData(page);
  expect(data.attendance["2026-12"]).toHaveLength(2);
  expect(data.attendance["2027-01"]).toHaveLength(1);
  expect(data.wageCalculations).toHaveLength(2);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "artifacts/mo-khoa-thang-moi.png",
    fullPage: true,
  });
});
