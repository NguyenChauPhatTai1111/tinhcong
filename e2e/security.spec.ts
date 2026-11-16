import { test, expect } from "@playwright/test";
import {
  ADMIN_PASSWORD,
  fillSetup,
  readData,
  setupAdmin,
  signIn,
} from "./helpers";
const legacy = JSON.stringify({
  version: 2,
  employees: [
    {
      id: "legacy-employee",
      name: "Nhân viên cần giữ lại",
      code: "NV001",
      phone: "",
      startDate: "2026-01-01",
      active: true,
      archived: false,
      notes: "",
      rates: [{ effectiveFrom: "2026-01-01", amount: 30000 }],
    },
  ],
  attendance: {},
  payroll: {},
  settings: { theme: "light", company: "Dữ liệu lịch sử" },
});

test("Chuyển dữ liệu cũ sang mã hóa, đăng xuất, chặn URL riêng và mật khẩu sai", async ({
  page,
}) => {
  await page.addInitScript((raw) => {
    if (localStorage.getItem("congviet:data") === null)
      localStorage.setItem("congviet:data", raw);
  }, legacy);
  await page.goto("/#/nhan-vien");
  await expect(
    page.getByRole("heading", { name: "Thiết lập quản trị viên", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".auth-description")).toContainText(
    "Dữ liệu hiện có",
  );
  expect(await page.evaluate(() => localStorage.getItem("congviet:data"))).toBe(
    legacy,
  );
  await fillSetup(page);
  await page.goto("/#/nhan-vien");
  await expect(page.locator("tbody")).toContainText("Nhân viên cần giữ lại");
  const raw = await page.evaluate(() => localStorage.getItem("congviet:data"));
  expect(raw).not.toContain("Nhân viên cần giữ lại");
  expect(raw).not.toContain(ADMIN_PASSWORD);
  expect((await readData(page)).employees).toHaveLength(1);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đăng nhập quản trị viên", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("admin");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Mat-khau-sai-2026!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".auth-card>.alert.error")).toContainText(
    "Mật khẩu không đúng",
  );
  expect(await page.evaluate(() => localStorage.getItem("congviet:data"))).toBe(
    raw,
  );
  await page.evaluate(() => {
    localStorage.setItem("isLoggedIn", "true");
    location.hash = "/bang-luong";
  });
  await expect(
    page.getByRole("heading", { name: "Đăng nhập quản trị viên", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveCount(0);
  await signIn(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Đăng nhập quản trị viên", exact: true }),
  ).toBeVisible();
  await signIn(page);
  await page.goto("/#/nhan-vien");
  await expect(page.locator("tbody")).toContainText("Nhân viên cần giữ lại");
});

test("Ghi mã hóa thất bại không xóa dữ liệu cũ hoặc báo đăng nhập thành công", async ({
  page,
}) => {
  await page.addInitScript(
    (raw) => localStorage.setItem("congviet:data", raw),
    legacy,
  );
  await page.goto("/");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Không đủ dung lượng", "QuotaExceededError");
    };
  });
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
  await expect(page.locator(".auth-card>.alert.error")).toContainText(
    "Không đủ dung lượng",
  );
  expect(await page.evaluate(() => localStorage.getItem("congviet:data"))).toBe(
    legacy,
  );
  await expect(page.locator("main")).toHaveCount(0);
});

test("Đổi thông tin đăng nhập mã hóa lại dữ liệu; bản sao lưu cũ dùng mật khẩu cũ", async ({
  page,
}) => {
  await setupAdmin(page);
  const oldBackup = await page.evaluate(() =>
    localStorage.getItem("congviet:data"),
  );
  await page.goto("/#/cai-dat");
  await page
    .getByRole("button", { name: "Đổi thông tin đăng nhập", exact: true })
    .click();
  await page
    .getByLabel("Mật khẩu hiện tại", { exact: true })
    .fill(ADMIN_PASSWORD);
  await page.getByLabel("Tên đăng nhập mới", { exact: true }).fill("quantri");
  await page
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("Mat-khau-moi-CongViet-2026!");
  await page
    .getByLabel("Xác nhận mật khẩu mới", { exact: true })
    .fill("Mat-khau-moi-CongViet-2026!");
  await page
    .getByRole("button", { name: "Lưu và đăng xuất", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đăng nhập quản trị viên", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("admin");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".auth-card>.alert.error")).toBeVisible();
  await signIn(page, "quantri", "Mat-khau-moi-CongViet-2026!");
  await page.goto("/#/cai-dat");
  await page
    .getByLabel("Chọn file sao lưu", { exact: true })
    .setInputFiles({
      name: "backup-cu.json",
      mimeType: "application/json",
      buffer: Buffer.from(oldBackup!),
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
  expect(
    (await readData(page, "Mat-khau-moi-CongViet-2026!")).settings.company,
  ).toBe("Không gian làm việc");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await signIn(page, "quantri", "Mat-khau-moi-CongViet-2026!");
});

test("Tự khóa sau 15 phút không hoạt động và khóa khi dữ liệu đổi ở tab khác", async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date("2026-11-16T03:00:00Z") });
  await setupAdmin(page);
  await page.clock.fastForward(15 * 60 * 1000 + 10000);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập quản trị viên", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".info-note")).toContainText("15 phút");
  await signIn(page);
  const other = await context.newPage();
  await other.goto("/");
  await signIn(other);
  await other.goto("/#/cai-dat");
  await other
    .getByLabel("Tên không gian làm việc")
    .fill("Tab khác đã cập nhật");
  await other.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đăng nhập quản trị viên", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".info-note")).toContainText("tab khác");
  await other.close();
});

test("Trang đăng nhập hiển thị trên desktop và mobile", async ({ page }) => {
  await page.goto("/");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("heading", {
        name: "Thiết lập quản trị viên",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/dang-nhap-${width}.png`,
      fullPage: true,
    });
  }
});
