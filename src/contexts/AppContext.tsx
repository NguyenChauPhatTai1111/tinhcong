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
import { ensureMonth } from "../services/storage";
import { currentMonth, download, today } from "../utils/format";
import { useAuth } from "./AuthContext";
interface Context {
  data: AppData;
  month: string;
  setMonth: (v: string) => void;
  date: string;
  storageError: string;
  saving: boolean;
  saveAllData: () => Promise<void>;
  lastBackupAt: string | null;
  mutate: (
    fn: (data: AppData) => AppData,
    message?: string,
    recovery?: boolean,
  ) => Promise<boolean>;
  toast: (message: string, error?: boolean) => void;
}
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const { session, commit, backup } = useAuth();
  if (!session) throw new Error("Vui lòng đăng nhập.");
  const [data, setData] = useState(() =>
      ensureMonth(session.data, currentMonth()),
    ),
    dataRef = useRef(data);
  const [storageError, setStorageError] = useState(""),
    [lastBackupAt, setLastBackupAt] = useState<string | null>(null),
    [saving, setSaving] = useState(false),
    inFlight = useRef(false);
  const [month, setMonth] = useState(currentMonth()),
    [date, setDate] = useState(today()),
    lastDate = useRef(date);
  const [notifications, setNotifications] = useState<
    { id: number; message: string; error: boolean }[]
  >([]);
  const toast = useCallback((message: string, error = false) => {
    const id = Date.now() + Math.random();
    setNotifications((n) => [...n.slice(-1), { id, message, error }]);
    setTimeout(
      () => setNotifications((n) => n.filter((t) => t.id !== id)),
      5000,
    );
  }, []);
  const mutate = useCallback(
    async (fn: (data: AppData) => AppData, message?: string) => {
      if (inFlight.current) {
        toast("Đang lưu dữ liệu. Vui lòng đợi thao tác trước hoàn tất.", true);
        return false;
      }
      inFlight.current = true;
      setSaving(true);
      try {
        const next = fn(structuredClone(dataRef.current));
        await commit(next);
        dataRef.current = next;
        setData(next);
        setStorageError("");
        if (message) toast(message);
        return true;
      } catch (e) {
        const message = (e as Error).message;
        toast(message, true);
        if (
          e instanceof DOMException &&
          ["QuotaExceededError", "SecurityError"].includes(e.name)
        )
          setStorageError(
            "Không thể lưu dữ liệu mã hóa. Kiểm tra quyền lưu trữ và dung lượng trình duyệt. Thay đổi chưa được lưu.",
          );
        return false;
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
    },
    [commit, toast],
  );
  const saveAllData = async () => {
    if (inFlight.current) {
      toast("Đang lưu dữ liệu. Vui lòng đợi thao tác trước hoàn tất.", true);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    let committed = false;
    try {
      const snapshot = structuredClone(dataRef.current);
      await commit(snapshot);
      committed = true;
      setStorageError("");
      const content = await backup(snapshot);
      const timestamp = new Date();
      const stamp = `${today()}-${String(timestamp.getHours()).padStart(2, "0")}${String(timestamp.getMinutes()).padStart(2, "0")}${String(timestamp.getSeconds()).padStart(2, "0")}-${String(timestamp.getMilliseconds()).padStart(3, "0")}`;
      download(content, `cong-viet-toan-bo-${stamp}.json`, "application/json;charset=utf-8");
      setLastBackupAt(timestamp.toISOString());
      toast("Đã lưu toàn bộ dữ liệu và bắt đầu tải bản sao lưu. Hãy giữ file cùng mật khẩu đăng nhập dùng khi tạo bản sao lưu.");
    } catch (e) {
      toast(`${committed ? "Dữ liệu đã lưu, nhưng chưa tải được bản sao lưu" : "Chưa lưu được toàn bộ dữ liệu"}: ${(e as Error).message}`, true);
      if (!committed && e instanceof DOMException && ["QuotaExceededError", "SecurityError"].includes(e.name))
        setStorageError("Không thể lưu dữ liệu mã hóa. Kiểm tra quyền lưu trữ và dung lượng trình duyệt.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  useEffect(() => {
    if (
      !session.data.attendance[currentMonth()] ||
      !session.data.payroll[currentMonth()]
    )
      void mutate((d) => ensureMonth(d, currentMonth()));
    const check = () => {
      const nextDate = today();
      if (lastDate.current.slice(0, 7) !== nextDate.slice(0, 7))
        setMonth(currentMonth());
      lastDate.current = nextDate;
      setDate(nextDate);
      if (!inFlight.current && !dataRef.current.attendance[currentMonth()])
        void mutate((d) => ensureMonth(d, currentMonth()));
    };
    const timer = setInterval(check, 15000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [session, mutate]);
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      data.settings.theme === "dark",
    );
  }, [data.settings.theme]);
  useEffect(() => {
    const protectSave = (event: BeforeUnloadEvent) => {
      if (inFlight.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protectSave);
    return () => window.removeEventListener("beforeunload", protectSave);
  }, []);
  return (
    <AppContext.Provider
      value={{
        data,
        month,
        setMonth,
        date,
        storageError,
        saving,
        saveAllData,
        lastBackupAt,
        mutate,
        toast,
      }}
    >
      {children}
      <div className="toasts" aria-live="polite">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`toast ${n.error ? "error" : ""}`}
            role={n.error ? "alert" : "status"}
          >
            {n.error ? "!" : "✓"}
            <span>{n.message}</span>
            <button
              aria-label="Đóng thông báo"
              onClick={() =>
                setNotifications((all) => all.filter((t) => t.id !== n.id))
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("Missing provider");
  return c;
}
