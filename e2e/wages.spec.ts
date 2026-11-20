import { test, expect } from "@playwright/test";
import { readData, setupAdmin } from "./helpers";
test("Nút tính lương từng người: xác nhận, khóa sau khi lưu, không trùng kỳ và tính ca mới", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.setFixedTime(new Date("2026-11-18T03:00:00Z"));
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
  async function addShift(name: string, date: string) {
    await page
      .getByRole("button", { name: "Chấm công mới", exact: true })
      .first()
      .click();
    await page.getByLabel("Ngày làm việc *").fill(date);
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
  await addShift("Nguyễn Văn Huy · NV001", "2026-11-16");
  await addShift("Trần Mai · NV002", "2026-11-16");
  await page.goto("/#/tong-hop");
  const huy = page.locator("tbody>tr").filter({ hasText: "Nguyễn Văn Huy" }),
    mai = page.locator("tbody>tr").filter({ hasText: "Trần Mai" });
  await expect(
    huy.getByRole("button", { name: "Tính lương", exact: true }),
  ).toBeEnabled();
  await expect(
    mai.getByRole("button", { name: "Tính lương", exact: true }),
  ).toBeEnabled();
  await huy.getByRole("button", { name: "Tính lương", exact: true }).click();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(
    huy.getByRole("button", { name: "Tính lương", exact: true }),
  ).toBeEnabled();
  await huy.getByRole("button", { name: "Tính lương", exact: true }).click();
  await page.getByLabel("Đơn giá của nhân viên (đ/giờ) *").fill("30000");
  await expect(page.locator(".modal .payroll-total")).toContainText("105.000đ");
  const before = await page.evaluate(() =>
    localStorage.getItem("congviet:data"),
  );
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreStorage: () => void }).restoreStorage =
      () => {
        Storage.prototype.setItem = original;
      };
    Storage.prototype.setItem = function (key, value) {
      if (key === "congviet:data")
        throw new DOMException("Không đủ dung lượng", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page
    .getByRole("button", { name: "Xác nhận tính lương", exact: true })
    .click();
  await expect(page.locator(".toast.error")).toContainText(
    "Không đủ dung lượng",
  );
  await expect(
    page.getByRole("button", { name: "Xác nhận tính lương", exact: true }),
  ).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem("congviet:data"))).toBe(
    before,
  );
  await page.evaluate(() =>
    (window as unknown as { restoreStorage: () => void }).restoreStorage(),
  );
  await page
    .getByRole("button", { name: "Xác nhận tính lương", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await expect(
    huy.getByRole("button", { name: "Đã tính lương", exact: true }),
  ).toBeDisabled();
  await expect(
    mai.getByRole("button", { name: "Tính lương", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(page.locator("main")).toBeVisible();
  await expect(
    huy.getByRole("button", { name: "Đã tính lương", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Theo tuần", exact: true }).click();
  await page.getByLabel("Chọn ngày trong tuần").fill("2026-11-18");
  await expect(
    huy.getByRole("button", { name: "Đã tính lương", exact: true }),
  ).toBeDisabled();
  await huy.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.locator("#print-payslip")).toContainText("105.000đ");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await mai.getByRole("button", { name: "Tính lương", exact: true }).click();
  await page.getByLabel("Đơn giá của nhân viên (đ/giờ) *").fill("40000");
  await page
    .getByRole("button", { name: "Xác nhận tính lương", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await expect(
    mai.getByRole("button", { name: "Đã tính lương", exact: true }),
  ).toBeDisabled();
  await page.goto("/#/cham-cong");
  await page.locator("tbody>tr").filter({ hasText: "Nguyễn Văn Huy" }).getByRole("button", { name: "Xem chấm công" }).click();
  await expect(
    page.getByRole("button", {
      name: "Sửa ca Nguyễn Văn Huy 2026-11-16",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Đóng", exact: true }).last().click();
  await addShift("Nguyễn Văn Huy · NV001", "2026-11-17");
  await page.goto("/#/tong-hop");
  await huy.getByRole("button", { name: "Tính lương", exact: true }).click();
  await expect(page.locator(".calculation")).toContainText(
    "Đã bỏ qua 3 giờ 30 phút",
  );
  await page.getByLabel("Đơn giá của nhân viên (đ/giờ) *").fill("50000");
  await expect(page.locator(".modal .payroll-total")).toContainText("175.000đ");
  await page
    .getByRole("button", { name: "Xác nhận tính lương", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await expect(
    huy.getByRole("button", { name: "Đã tính lương", exact: true }),
  ).toBeDisabled();
  const data = await readData(page);
  expect(
    data.wageCalculations
      .map((r: { amount: number }) => r.amount)
      .sort((a: number, b: number) => a - b),
  ).toEqual([105000, 140000, 175000]);
  await page.setViewportSize({ width: 390, height: 900 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "artifacts/nut-tinh-luong-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
