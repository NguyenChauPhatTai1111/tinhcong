import { decryptWithKey, parseEnvelope, type OpenVault } from "./vault";

const SESSION_KEY = "congviet:tab-session";
export const IDLE_LOCK_MS = 15 * 60 * 1000;
interface TabSession {
  id: string;
  lastActive: number;
  username: string;
  salt: string;
}

// IndexedDB can retain a non-exportable CryptoKey without storing the password.
// Only this tab's sessionStorage holds the random identifier used to retrieve it.
async function keyStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("congviet-sessions", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("keys");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Không thể mở phiên đã lưu."));
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("keys", mode);
      const request = operation(transaction.objectStore("keys"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export function clearTabSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as TabSession;
      if (typeof saved.id === "string")
        void keyStore("readwrite", (store) => store.delete(saved.id)).catch(() => {});
    }
  } catch {
    // Storage can be disabled; in-memory login still works.
  }
}

export async function saveTabSession(open: OpenVault) {
  clearTabSession();
  const saved: TabSession = {
    id: crypto.randomUUID(),
    lastActive: Date.now(),
    username: open.envelope.username,
    salt: open.envelope.salt,
  };
  try {
    await keyStore("readwrite", (store) => store.put(open.key, saved.id));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(saved));
  } catch {
    void keyStore("readwrite", (store) => store.delete(saved.id)).catch(() => {});
  }
}

export function touchTabSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as TabSession;
    const now = Date.now();
    if (now - saved.lastActive >= 1000) {
      saved.lastActive = now;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(saved));
    }
  } catch {
    clearTabSession();
  }
}

export async function restoreTabSession(raw: string | null): Promise<(OpenVault & { lastActive: number }) | null> {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored || !raw) {
      clearTabSession();
      return null;
    }
    const saved = JSON.parse(stored) as TabSession;
    const age = Date.now() - saved.lastActive;
    if (typeof saved.id !== "string" || !Number.isFinite(age) || age < 0 || age >= IDLE_LOCK_MS)
      throw new Error("Phiên đã hết hạn.");
    const envelope = parseEnvelope(raw);
    if (saved.username !== envelope.username || saved.salt !== envelope.salt)
      throw new Error("Tài khoản đã thay đổi.");
    const key = await keyStore<CryptoKey | undefined>("readonly", (store) => store.get(saved.id));
    if (!key) throw new Error("Không còn khóa phiên.");
    const data = await decryptWithKey(envelope, key);
    if (sessionStorage.getItem(SESSION_KEY) !== stored) return null;
    return { data, key, envelope, lastActive: saved.lastActive };
  } catch {
    clearTabSession();
    return null;
  }
}
