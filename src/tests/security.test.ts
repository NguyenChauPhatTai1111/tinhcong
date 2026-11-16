import { describe, expect, it } from "vitest";
import { emptyData } from "../services/storage";
import {
  createVault,
  decryptWithKey,
  encryptVault,
  parseEnvelope,
  unlockVault,
  validateCredentials,
} from "../services/security/vault";

const password = "Mat-khau-kiem-thu-2026!";
describe("Mã hóa dữ liệu và mật khẩu quản trị", () => {
  it("mã hóa/giải mã toàn bộ dữ liệu, không chứa thông tin đọc được hoặc mật khẩu", async () => {
    const data = emptyData();
    data.settings.company = "Công ty bảo mật Nguyễn Văn Huy";
    const vault = await createVault(data, "admin", password),
      raw = JSON.stringify(vault.envelope);
    expect(raw).not.toContain(data.settings.company);
    expect(raw).not.toContain(password);
    expect(raw).not.toContain("employees");
    expect((await unlockVault(raw, password)).data).toEqual(data);
    expect(vault.key.extractable).toBe(false);
  });
  it("mật khẩu sai không mở được dữ liệu", async () => {
    const vault = await createVault(emptyData(), "admin", password);
    await expect(
      unlockVault(JSON.stringify(vault.envelope), "Mat-khau-sai-2026!"),
    ).rejects.toThrow("Mật khẩu");
  });
  it("mỗi lần lưu dùng IV ngẫu nhiên khác nhau", async () => {
    const vault = await createVault(emptyData(), "admin", password),
      next = await encryptVault(emptyData(), vault.key, vault.envelope);
    expect(next.iv).not.toBe(vault.envelope.iv);
    expect(next.ciphertext).not.toBe(vault.envelope.ciphertext);
    expect(await decryptWithKey(next, vault.key)).toEqual(emptyData());
  });
  it("chặn thay đổi ciphertext, username hoặc IV", async () => {
    const vault = await createVault(emptyData(), "admin", password),
      e = vault.envelope;
    const ciphertext =
      (e.ciphertext[0] === "A" ? "B" : "A") + e.ciphertext.slice(1);
    await expect(
      decryptWithKey({ ...e, ciphertext }, vault.key),
    ).rejects.toThrow();
    await expect(
      decryptWithKey({ ...e, username: "attacker" }, vault.key),
    ).rejects.toThrow();
    const iv = (e.iv[0] === "A" ? "B" : "A") + e.iv.slice(1);
    await expect(decryptWithKey({ ...e, iv }, vault.key)).rejects.toThrow();
  });
  it("đổi mật khẩu dùng salt mới, mật khẩu cũ không mở được bản mới; backup cũ vẫn mở bằng mật khẩu cũ", async () => {
    const old = await createVault(emptyData(), "admin", password);
    const next = await createVault(old.data, "quantri", "Mat-khau-moi-2026!");
    expect(next.envelope.salt).not.toBe(old.envelope.salt);
    await expect(
      unlockVault(JSON.stringify(next.envelope), password),
    ).rejects.toThrow();
    expect(
      (await unlockVault(JSON.stringify(old.envelope), password)).data,
    ).toEqual(old.data);
    expect(
      (await unlockVault(JSON.stringify(next.envelope), "Mat-khau-moi-2026!"))
        .envelope.username,
    ).toBe("quantri");
  });
  it("từ chối phiên bản, thuật toán và work factor khác định dạng hỗ trợ", async () => {
    const { envelope } = await createVault(emptyData(), "admin", password);
    for (const changed of [
      { version: 9 },
      { iterations: 1 },
      { cipher: "AES-CBC" },
      { salt: "AAAA" },
      { iv: "AAAA" },
    ])
      expect(() =>
        parseEnvelope(JSON.stringify({ ...envelope, ...changed })),
      ).toThrow();
  });
  it("không chấp nhận mật khẩu yếu hoặc tên đăng nhập sai định dạng", () => {
    expect(() => validateCredentials("admin", "123456")).toThrow("12");
    expect(() => validateCredentials("admin", "            ")).toThrow();
    expect(() => validateCredentials("ad min", password)).toThrow("Tên");
    expect(() => validateCredentials("admin", password)).not.toThrow();
  });
});
