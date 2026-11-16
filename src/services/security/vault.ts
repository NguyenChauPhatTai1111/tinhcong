import type { AppData } from "../../types";
import { restore, serialize } from "../storage";

export const VAULT_FORMAT = "congviet-vault";
export const PBKDF2_ITERATIONS = 600_000;
export interface VaultEnvelope {
  format: typeof VAULT_FORMAT;
  version: 1;
  username: string;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  cipher: "AES-256-GCM";
  iv: string;
  ciphertext: string;
}
export interface OpenVault {
  data: AppData;
  key: CryptoKey;
  envelope: VaultEnvelope;
}
const encode = (value: string) => new TextEncoder().encode(value);
export function toBase64(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 8192)
    result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(result);
}
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0)
    throw new Error("Dữ liệu mã hóa không hợp lệ.");
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
export function requireCrypto() {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "Mã hóa cần kết nối HTTPS hoặc localhost. Hãy mở ứng dụng bằng HTTPS để đăng nhập an toàn.",
    );
}
export function validateCredentials(username: string, password: string) {
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username))
    throw new Error(
      "Tên đăng nhập từ 3–40 ký tự, gồm chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.",
    );
  if (password.length < 12 || password.length > 128 || !password.trim())
    throw new Error(
      "Mật khẩu cần từ 12 đến 128 ký tự. Nên dùng một cụm từ dài, khó đoán.",
    );
}
export function isVault(value: unknown): value is VaultEnvelope {
  return (
    value !== null &&
    typeof value === "object" &&
    "format" in value &&
    value.format === VAULT_FORMAT
  );
}
export function parseEnvelope(raw: string): VaultEnvelope {
  const v: unknown = JSON.parse(raw);
  if (
    !isVault(v) ||
    v.version !== 1 ||
    v.kdf !== "PBKDF2-SHA256" ||
    v.cipher !== "AES-256-GCM" ||
    v.iterations !== PBKDF2_ITERATIONS ||
    typeof v.username !== "string" ||
    !/^[a-zA-Z0-9._-]{3,40}$/.test(v.username) ||
    typeof v.salt !== "string" ||
    typeof v.iv !== "string" ||
    typeof v.ciphertext !== "string"
  )
    throw new Error(
      "File mã hóa không đúng cấu trúc hoặc phiên bản được hỗ trợ.",
    );
  if (
    fromBase64(v.salt).length !== 32 ||
    fromBase64(v.iv).length !== 12 ||
    fromBase64(v.ciphertext).length < 16
  )
    throw new Error("Dữ liệu mã hóa bị thiếu hoặc hỏng.");
  return v;
}
const metadata = (e: VaultEnvelope) =>
  encode(
    JSON.stringify([
      e.format,
      e.version,
      e.username,
      e.kdf,
      e.iterations,
      e.salt,
      e.cipher,
    ]),
  );
async function derive(
  password: string,
  e: Pick<VaultEnvelope, "salt" | "iterations">,
) {
  requireCrypto();
  const material = await crypto.subtle.importKey(
    "raw",
    encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: e.iterations,
      salt: fromBase64(e.salt),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptVault(
  data: AppData,
  key: CryptoKey,
  previous: VaultEnvelope,
): Promise<VaultEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: metadata(previous), tagLength: 128 },
    key,
    encode(serialize(data)),
  );
  return {
    ...previous,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}
export async function createVault(
  data: AppData,
  username: string,
  password: string,
): Promise<OpenVault> {
  requireCrypto();
  validateCredentials(username, password);
  const header: VaultEnvelope = {
    format: VAULT_FORMAT,
    version: 1,
    username,
    kdf: "PBKDF2-SHA256",
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(crypto.getRandomValues(new Uint8Array(32))),
    cipher: "AES-256-GCM",
    iv: "",
    ciphertext: "",
  };
  const key = await derive(password, header);
  return { data, key, envelope: await encryptVault(data, key, header) };
}
export async function decryptWithKey(
  envelope: VaultEnvelope,
  key: CryptoKey,
): Promise<AppData> {
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(envelope.iv),
      additionalData: metadata(envelope),
      tagLength: 128,
    },
    key,
    fromBase64(envelope.ciphertext),
  );
  return restore(new TextDecoder("utf-8", { fatal: true }).decode(plain));
}
export async function unlockVault(
  raw: string,
  password: string,
): Promise<OpenVault> {
  const envelope = parseEnvelope(raw);
  const key = await derive(password, envelope);
  try {
    return { envelope, key, data: await decryptWithKey(envelope, key) };
  } catch {
    throw new Error(
      "Mật khẩu không đúng hoặc dữ liệu mã hóa đã bị thay đổi/hỏng.",
    );
  }
}
