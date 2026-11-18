import { test, expect } from "@playwright/test";
import { setupAdmin } from "./helpers";
test("Hướng dẫn có từ trang đăng nhập, tìm kiếm và đóng bằng Escape", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const launcher = page.getByRole("button", {
    name: "Hướng dẫn sử dụng",
    exact: true,
  });
  await launcher.click();
  const dialog = page.getByRole("dialog", {
    name: "Hướng dẫn sử dụng",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Tài khoản & bảo mật", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Chấm công & giờ nghỉ", exact: true })
    .click();
  await expect(dialog.locator(".help-content")).toContainText("3 giờ 30 phút");
  await dialog
    .getByRole("searchbox", { name: "Tìm trong hướng dẫn", exact: true })
    .fill("khong-co-chu-de-nay-xyz");
  await expect(
    dialog.getByRole("heading", {
      name: "Không tìm thấy hướng dẫn",
      exact: true,
    }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Xem tất cả chủ đề", exact: true })
    .click();
  await dialog
    .getByRole("searchbox", { name: "Tìm trong hướng dẫn", exact: true })
    .fill("nghi trua");
  await expect(
    dialog.getByRole("button", { name: "Chấm công & giờ nghỉ", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(launcher).toBeFocused();
  expect(errors).toEqual([]);
});
test("Giao diện 3 bước, hướng dẫn tính lương và liên kết mở đúng trang", async ({
  page,
}) => {
  await setupAdmin(page);
  await expect(
    page.getByRole("region", { name: "Ba bước sử dụng chính" }),
  ).toBeVisible();
  await page
    .locator(".quick-start")
    .getByRole("link", { name: /Tính lương/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tổng hợp giờ công", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".task-callout")).toContainText(
    "Tính lương ở ngay dòng nhân viên",
  );
  await page.getByRole("button", { name: "Xem cách làm", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Hướng dẫn sử dụng",
    exact: true,
  });
  await expect(
    dialog.getByRole("heading", {
      name: "Tính lương & nút bị khóa",
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog.locator(".help-content")).toContainText("105.000đ");
  await dialog.getByRole("button", { name: "Tiếp", exact: true }).click();
  await expect(
    dialog.getByRole("heading", {
      name: "Xem tuần, tháng & lịch sử",
      exact: true,
    }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Trước", exact: true }).click();
  await expect(
    dialog.getByRole("heading", {
      name: "Tính lương & nút bị khóa",
      exact: true,
    }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Câu hỏi thường gặp", exact: true })
    .click();
  await dialog
    .locator("summary")
    .filter({ hasText: "Vì sao nút tính lương bị khóa?" })
    .click();
  await expect(dialog.locator("details[open]")).toContainText("Xem kết quả");
  await dialog
    .getByRole("button", { name: "Sao lưu & khôi phục", exact: true })
    .click();
  await dialog
    .getByRole("link", { name: "Mở cài đặt & sao lưu", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Cài đặt & sao lưu", exact: true }),
  ).toBeVisible();
});
test("Hướng dẫn và thanh thao tác nhanh hoạt động trên mobile, tablet và desktop", async ({
  page,
}) => {
  await setupAdmin(page);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByRole("button", { name: "Hướng dẫn sử dụng", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Hướng dẫn sử dụng",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: "Chấm công & giờ nghỉ", exact: true })
      .click();
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/huong-dan-${width}.png`,
      fullPage: true,
    });
    await dialog.getByRole("button", { name: "Đã hiểu", exact: true }).click();
  }
  const mobile = page.getByRole("navigation", {
    name: "Điều hướng nhanh trên điện thoại",
    exact: true,
  });
  await mobile
    .getByRole("link", { name: "Chấm công nhanh", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Chấm công", exact: true }),
  ).toBeVisible();
  await mobile
    .getByRole("link", { name: "Tính lương nhân viên", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tổng hợp giờ công", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hướng dẫn sử dụng", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Tính lương & nút bị khóa",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đã hiểu", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
});
