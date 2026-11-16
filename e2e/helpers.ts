import { expect, type Page } from "@playwright/test";
export const ADMIN_PASSWORD = "Kiem-thu-CongViet-2026!";
export async function setupAdmin(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Thiết lập quản trị viên", exact: true }),
  ).toBeVisible();
  await fillSetup(page);
}
export async function fillSetup(page: Page) {
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("admin");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(ADMIN_PASSWORD);
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill(ADMIN_PASSWORD);
  await page.locator(".auth-ack input").check();
  await page
    .getByRole("button", {
      name: "Tạo tài khoản & mã hóa dữ liệu",
      exact: true,
    })
    .click();
  await expect(page.locator(".auth-page")).toHaveCount(0);
}
export async function signIn(
  page: Page,
  username = "admin",
  password = ADMIN_PASSWORD,
) {
  await expect(
    page.getByRole("heading", { name: "Đăng nhập quản trị viên", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill(username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".auth-page")).toHaveCount(0);
}
export async function readData(page: Page, password = ADMIN_PASSWORD) {
  return page.evaluate(async (password) => {
    const path = "/src/services/security/vault.ts";
    const { unlockVault } = await import(path);
    return (await unlockVault(localStorage.getItem("congviet:data")!, password))
      .data;
  }, password);
}
