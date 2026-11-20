import { test, expect, type Download } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { ADMIN_PASSWORD, readData, setupAdmin } from "./helpers";

test("Nút lưu toàn bộ tải file mã hóa đủ mọi tháng và khôi phục được", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-20T03:00:00Z"));
  await setupAdmin(page);
  await page.evaluate(async (password) => {
    const vaultPath = "/src/services/security/vault.ts";
    const storagePath = "/src/services/storage/index.ts";
    const timePath = "/src/utils/timeCalculator.ts";
    const advancesPath = "/src/services/advances.ts";
    const wagesPath = "/src/services/wages.ts";
    const { unlockVault, encryptVault } = await import(vaultPath);
    const { saveAttendance } = await import(storagePath);
    const { localISO } = await import(timePath);
    const { saveAdvance } = await import(advancesPath);
    const { finalizeWages } = await import(wagesPath);
    const open = await unlockVault(localStorage.getItem("congviet:data")!, password);
    let data = open.data;
    data.settings.company = "Dữ liệu cần giữ cuối ngày";
    data.employees = [{ id: "huy", name: "Nguyễn Văn Huy", code: "NV001", phone: "", startDate: "2026-01-01", active: true, archived: false, notes: "", rates: [] }];
    for (const date of ["2026-10-20", "2026-11-20"]) {
      data = saveAttendance(data, {
        id: date, employeeId: "huy", date, start: localISO(date, "08:00"), end: localISO(date, "17:00"),
        breakMinutes: 60, actualMinutes: 480, breakKind: "lunch", adjustmentReason: "", hourlyRate: 0, amount: 0, notes: "Đã hoàn tất ca làm",
      });
      if (date.startsWith("2026-10")) {
        data = saveAdvance(data, { id: "advance-1", employeeId: "huy", date: "2026-10-20", amount: 50000, notes: "Ứng cuối ngày" });
        data = finalizeWages(data, "huy", { start: "2026-10-01", end: "2026-10-31" }, 30000, "Lương tháng 10");
      }
    }
    localStorage.setItem("congviet:data", JSON.stringify(await encryptVault(data, open.key, open.envelope)));
  }, ADMIN_PASSWORD);
  await page.reload();
  await expect(page.locator("main")).toBeVisible();
  const original = await readData(page);
  const downloads: Download[] = [];
  page.on("download", (file) => downloads.push(file));
  const downloaded = page.waitForEvent("download");
  const save = page.getByRole("button", { name: "Lưu toàn bộ dữ liệu", exact: true });
  await save.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  const file = await downloaded;
  expect(file.suggestedFilename()).toMatch(/^cong-viet-toan-bo-2026-11-20-\d+-\d+\.json$/);
  const content = await readFile((await file.path())!, "utf8");
  expect(content).not.toContain("Nguyễn Văn Huy");
  expect(content).not.toContain(ADMIN_PASSWORD);
  const restored = await page.evaluate(async ({ content, password }) => {
    const vaultPath = "/src/services/security/vault.ts";
    const { unlockVault } = await import(vaultPath);
    return (await unlockVault(content, password)).data;
  }, { content, password: ADMIN_PASSWORD });
  expect(restored).toEqual(original);
  await expect(page.locator(".save-all-copy")).toContainText("Vừa tạo bản sao lưu lúc");
  await expect(save).toBeEnabled();
  expect(downloads).toHaveLength(1);
  await page.locator(".save-all-panel").screenshot({ path: "artifacts/luu-toan-bo-desktop.png", animations: "disabled" });
  await page.goto("/#/cai-dat");
  await expect(page.locator(".save-all-copy")).toContainText("Vừa tạo bản sao lưu lúc");
  await page.getByLabel("Tên không gian làm việc").fill("Thay đổi sau khi sao lưu");
  await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu cài đặt" })).toBeVisible();
  await page.getByLabel("Chọn file sao lưu", { exact: true }).setInputFiles({ name: file.suggestedFilename(), mimeType: "application/json", buffer: Buffer.from(content) });
  await page.getByLabel("Mật khẩu bản sao lưu", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Mở bản sao lưu", exact: true }).click();
  await page.getByRole("button", { name: "Khôi phục dữ liệu", exact: true }).click();
  await expect(page.locator("dialog")).toHaveCount(0);
  expect(await readData(page)).toEqual(original);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(save).toBeVisible();
  await save.scrollIntoViewIfNeeded();
  await save.click({ trial: true });
  await expect(save).toBeInViewport();
  const bounds = await save.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(58);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.locator(".save-all-panel").screenshot({ path: "artifacts/luu-toan-bo-mobile.png", animations: "disabled" });
});

test("Lưu thất bại giữ dữ liệu cũ và không báo đã tạo bản sao lưu", async ({ page }) => {
  await setupAdmin(page);
  const original = await page.evaluate(() => localStorage.getItem("congviet:data"));
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.evaluate(() => {
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "congviet:data") throw new DOMException("Không đủ dung lượng", "QuotaExceededError");
      return originalSet.call(this, key, value);
    };
  });
  const save = page.getByRole("button", { name: "Lưu toàn bộ dữ liệu", exact: true });
  await save.click();
  await expect(page.locator(".toast.error")).toContainText("Chưa lưu được toàn bộ dữ liệu");
  await expect(save).toBeEnabled();
  await expect(page.locator(".save-all-copy")).not.toContainText("Vừa tạo bản sao lưu lúc");
  expect(await page.evaluate(() => localStorage.getItem("congviet:data"))).toBe(original);
  expect(downloads).toBe(0);
});
