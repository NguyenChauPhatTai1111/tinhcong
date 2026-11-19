import { test, expect } from "@playwright/test";
import { ADMIN_PASSWORD, setupAdmin, signIn } from "./helpers";

test("In bảng lương A4 đủ ngày công, ứng lương và nhiều trang từ dữ liệu đã chốt", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-18T03:00:00Z"));
  await setupAdmin(page);
  await page.evaluate(async (password) => {
    const vaultPath = "/src/services/security/vault.ts";
    const storagePath = "/src/services/storage/index.ts";
    const wagesPath = "/src/services/wages.ts";
    const timePath = "/src/utils/timeCalculator.ts";
    const advancesPath = "/src/services/advances.ts";
    const { unlockVault, encryptVault } = await import(vaultPath);
    const { emptyData, saveAttendance } = await import(storagePath);
    const { finalizeWages } = await import(wagesPath);
    const { localISO } = await import(timePath);
    const { saveAdvance } = await import(advancesPath);
    const session = await unlockVault(localStorage.getItem("congviet:data")!, password);
    let data = emptyData();
    data.settings = { theme: "dark", company: "Cửa hàng kiểm thử" };
    data.employees = [{ id: "huy", name: "Nguyễn Văn Huy", code: "NV001", phone: "", startDate: "2026-01-01", active: true, archived: false, notes: "", rates: [] }];
    for (let day = 1; day <= 30; day++) {
      const date = `2026-11-${String(day).padStart(2, "0")}`;
      data = saveAttendance(data, {
        id: `shift-${day}`, employeeId: "huy", date, start: localISO(date, "08:00"), end: localISO(date, "17:00"),
        breakMinutes: 60, actualMinutes: 480, breakKind: "lunch", adjustmentReason: "", hourlyRate: 0, amount: 0,
        notes: `Ghi chú ngày ${day}: phụ trách bán hàng, kiểm kê và bàn giao ca.`,
      });
    }
    data = saveAdvance(data, { id: "advance-1", employeeId: "huy", date: "2026-11-05", amount: 500000, notes: "Ứng sinh hoạt" });
    data = finalizeWages(data, "huy", { start: "2026-11-01", end: "2026-11-30" }, 30000, "Lương tháng 11");
    data = saveAttendance(data, {
      id: "extra", employeeId: "huy", date: "2026-11-30", start: localISO("2026-11-30", "20:00"), end: localISO("2026-12-01", "02:00"),
      breakMinutes: 0, actualMinutes: 360, breakKind: "other", adjustmentReason: "", hourlyRate: 0, amount: 0, notes: "Ca qua đêm",
    });
    data = finalizeWages(data, "huy", { start: "2026-11-30", end: "2026-11-30" }, 40000, "Ca bổ sung");
    // Payslips must retain the employee identity saved when wages were finalized.
    data.employees[0].name = "Tên đã đổi sau tính lương";
    localStorage.setItem("congviet:data", JSON.stringify(await encryptVault(data, session.key, session.envelope)));
  }, ADMIN_PASSWORD);
  await page.reload();
  await signIn(page);
  await page.goto("/#/tong-hop");
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  const payslip = page.locator("#print-payslip");
  await expect(payslip.locator(".payslip-sheet")).toHaveCount(2);
  await expect(payslip).toContainText("Nguyễn Văn Huy");
  await expect(payslip).not.toContainText("Tên đã đổi sau tính lương");
  await expect(payslip).toContainText("6.700.000đ");
  await expect(payslip).toContainText("Ứng sinh hoạt");
  await expect(payslip).toContainText("Ra ngày 01/12/2026");
  await expect(payslip.locator(".payslip-days tbody tr")).toHaveCount(31);
  await page.evaluate(() => {
    (window as unknown as { printCalls: number }).printCalls = 0;
    window.print = () => { (window as unknown as { printCalls: number }).printCalls++; };
  });
  await page.getByRole("button", { name: "In bảng lương A4" }).click();
  expect(await page.evaluate(() => (window as unknown as { printCalls: number }).printCalls)).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ media: "print" });
  await expect(payslip).toBeVisible();
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator("dialog > footer")).toBeHidden();
  await expect(page.locator(".payslip-screen-note")).toBeHidden();
  expect(await payslip.locator(".payslip-sheet").first().evaluate((el) => getComputedStyle(el).breakInside)).toBe("auto");
  expect(await payslip.locator(".payslip-sheet").nth(1).evaluate((el) => getComputedStyle(el).breakBefore)).toBe("page");
  const pdf = await page.pdf({ path: "artifacts/bang-luong-a4.pdf", preferCSSPageSize: true, displayHeaderFooter: false });
  const raw = pdf.toString("latin1");
  const boxes = [...raw.matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].map((match) => match[1].trim().split(/\s+/).map(Number));
  expect(boxes.length).toBeGreaterThan(2);
  for (const [, , width, height] of boxes) {
    expect(width).toBeCloseTo(595.28, 0);
    expect(height).toBeCloseTo(841.89, 0);
  }
});
