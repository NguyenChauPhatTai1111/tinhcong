import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppData } from "../types";
import {
  emptyData,
  ensureMonth,
  restore,
  STORAGE_KEY,
} from "../services/storage";
import {
  createVault,
  encryptVault,
  isVault,
  parseEnvelope,
  requireCrypto,
  unlockVault,
  type OpenVault,
} from "../services/security/vault";
import { currentMonth } from "../utils/format";

export const IDLE_LOCK_MS = 15 * 60 * 1000;
type Session = OpenVault & { id: string; raw: string };
interface Auth {
  session: Session | null;
  mode: "setup" | "login" | "recovery";
  issue: string;
  notice: string;
  hasLegacy: boolean;
  setup: (
    username: string,
    password: string,
    replacement?: string,
  ) => Promise<void>;
  login: (
    username: string,
    password: string,
    replacement?: string,
  ) => Promise<void>;
  lock: (reason?: string) => void;
  commit: (data: AppData) => Promise<void>;
  backup: (data: AppData) => Promise<string>;
  changeCredentials: (
    current: string,
    username: string,
    password: string,
  ) => Promise<void>;
}
const AuthContext = createContext<Auth | null>(null);
function inspect() {
  try {
    requireCrypto();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null)
      return { mode: "setup" as const, issue: "", hasLegacy: false };
    if (isVault(JSON.parse(raw))) {
      parseEnvelope(raw);
      return { mode: "login" as const, issue: "", hasLegacy: false };
    }
    restore(raw);
    return { mode: "setup" as const, issue: "", hasLegacy: true };
  } catch (e) {
    return {
      mode: "recovery" as const,
      issue: (e as Error).message,
      hasLegacy: true,
    };
  }
}
async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  if (navigator.locks)
    return navigator.locks.request("congviet:vault-write", fn);
  return fn();
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(inspect),
    [session, setSession] = useState<Session | null>(null),
    [notice, setNotice] = useState("");
  const ref = useRef<Session | null>(null),
    active = useRef(performance.now()),
    working = useRef(false);
  const lock = useCallback((reason = "Đã đăng xuất. Dữ liệu đã được khóa.") => {
    ref.current = null;
    setSession(null);
    setState(inspect());
    setNotice(reason);
    document.documentElement.classList.remove("dark");
  }, []);
  function establish(open: OpenVault, raw: string) {
    const next = { ...open, raw, id: crypto.randomUUID() };
    ref.current = next;
    active.current = performance.now();
    setSession(next);
    setNotice("");
  }
  async function writeNew(open: OpenVault, expected: string | null) {
    const raw = JSON.stringify(open.envelope);
    await exclusive(async () => {
      if (localStorage.getItem(STORAGE_KEY) !== expected)
        throw new Error(
          "Dữ liệu đã đổi ở tab khác. Hãy tải lại trang trước khi tiếp tục.",
        );
      localStorage.setItem(STORAGE_KEY, raw);
    });
    establish(open, raw);
  }
  async function setup(
    username: string,
    password: string,
    replacement?: string,
  ) {
    const expected = localStorage.getItem(STORAGE_KEY);
    if (!replacement && expected && isVault(JSON.parse(expected)))
      throw new Error("Tài khoản đã được thiết lập. Hãy đăng nhập.");
    const source = replacement ?? expected;
    const data = ensureMonth(
      source ? restore(source) : emptyData(),
      currentMonth(),
    );
    await writeNew(await createVault(data, username, password), expected);
  }
  async function login(
    username: string,
    password: string,
    replacement?: string,
  ) {
    const expected = localStorage.getItem(STORAGE_KEY),
      raw = replacement ?? expected;
    if (!raw) throw new Error("Chưa có tài khoản quản trị viên.");
    const open = await unlockVault(raw, password);
    if (open.envelope.username !== username)
      throw new Error("Tên đăng nhập hoặc mật khẩu không đúng.");
    if (replacement) {
      await writeNew(open, expected);
      return;
    }
    if (localStorage.getItem(STORAGE_KEY) !== raw)
      throw new Error("Dữ liệu đã thay đổi. Hãy đăng nhập lại.");
    establish(open, raw);
  }
  const commit = useCallback(
    async (data: AppData) => {
      if (working.current)
        throw new Error(
          "Đang lưu dữ liệu. Vui lòng đợi thao tác trước hoàn tất.",
        );
      const captured = ref.current;
      if (!captured)
        throw new Error("Phiên làm việc đã khóa. Vui lòng đăng nhập lại.");
      working.current = true;
      try {
        await exclusive(async () => {
          const expected = captured.raw;
          if (localStorage.getItem(STORAGE_KEY) !== expected) {
            lock("Dữ liệu thay đổi ở tab khác. Vui lòng đăng nhập lại.");
            throw new Error("Dữ liệu đã thay đổi.");
          }
          const envelope = await encryptVault(
            data,
            captured.key,
            captured.envelope,
          );
          if (ref.current !== captured)
            throw new Error("Phiên làm việc đã khóa. Thay đổi chưa được lưu.");
          if (localStorage.getItem(STORAGE_KEY) !== expected)
            throw new Error("Dữ liệu đã thay đổi ở tab khác.");
          const raw = JSON.stringify(envelope);
          localStorage.setItem(STORAGE_KEY, raw);
          captured.raw = raw;
          captured.envelope = envelope;
          captured.data = data;
        });
      } finally {
        working.current = false;
      }
    },
    [lock],
  );
  async function backup(data: AppData) {
    const captured = ref.current;
    if (!captured) throw new Error("Vui lòng đăng nhập lại.");
    const envelope = await encryptVault(data, captured.key, captured.envelope);
    if (ref.current !== captured) throw new Error("Phiên làm việc đã khóa.");
    return JSON.stringify(envelope, null, 2);
  }
  async function changeCredentials(
    current: string,
    username: string,
    password: string,
  ) {
    if (working.current) throw new Error("Đang lưu dữ liệu. Hãy thử lại sau.");
    const captured = ref.current;
    if (!captured) throw new Error("Vui lòng đăng nhập lại.");
    working.current = true;
    try {
      const open = await unlockVault(captured.raw, current);
      const next = await createVault(open.data, username, password);
      await exclusive(async () => {
        if (
          ref.current !== captured ||
          localStorage.getItem(STORAGE_KEY) !== captured.raw
        )
          throw new Error("Phiên làm việc hoặc dữ liệu đã thay đổi.");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next.envelope));
      });
      lock("Đã đổi thông tin đăng nhập. Hãy đăng nhập bằng mật khẩu mới.");
    } finally {
      working.current = false;
    }
  }
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null)
        lock("Dữ liệu hoặc tài khoản đã đổi ở tab khác. Hãy đăng nhập lại.");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [lock]);
  useEffect(() => {
    if (!session) return;
    const check = () => {
      if (ref.current && performance.now() - active.current >= IDLE_LOCK_MS) {
        lock("Phiên làm việc đã khóa sau 15 phút không hoạt động.");
        return true;
      }
      return false;
    };
    const activity = () => {
      if (!check()) active.current = performance.now();
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    for (const event of events)
      window.addEventListener(event, activity, {
        passive: true,
        capture: true,
      });
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const timer = setInterval(check, 10000);
    return () => {
      clearInterval(timer);
      for (const event of events)
        window.removeEventListener(event, activity, true);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [session, lock]);
  return (
    <AuthContext.Provider
      value={{
        session,
        ...state,
        notice,
        setup,
        login,
        lock,
        commit,
        backup,
        changeCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Missing authentication provider");
  return value;
}
