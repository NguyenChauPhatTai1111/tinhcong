import { useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Database,
  FileJson,
  HardDrive,
  Moon,
  ShieldCheck,
  Sun,
  Upload,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import {
  Button,
  Confirm,
  Field,
  MonthPicker,
  PageHeading,
  Submit,
  Modal,
} from "../components/common/UI";
import { download, money, monthLabel, today } from "../utils/format";
import {
  ensureMonth,
  monthBackup,
  restore,
  serialize,
  STORAGE_KEY,
} from "../services/storage";
import type { AppData } from "../types";
import { sum } from "../utils/salaryCalculator";
import { currentMonth } from "../utils/format";
import { useAuth } from "../contexts/AuthContext";
import {
  isVault,
  parseEnvelope,
  unlockVault,
} from "../services/security/vault";
import { SecuritySettings } from "../components/common/SecuritySettings";
export default function Settings() {
  const auth = useAuth();
  const [encryptedBackup, setEncryptedBackup] = useState<string | null>(null),
    [backupPassword, setBackupPassword] = useState(""),
    [backupBusy, setBackupBusy] = useState(false),
    [backupError, setBackupError] = useState("");
  const { data, month, mutate, toast, storageError } = useApp(),
    [company, setCompany] = useState(data.settings.company),
    [pending, setPending] = useState<AppData | null>(null),
    [reading, setReading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const size = new Blob([serialize(data)]).size;
  const backup = async (monthly = false) => {
    try {
      download(
        await auth.backup(monthly ? monthBackup(data, month) : data),
        `cong-viet-${monthly ? month : `toan-bo-${today()}`}.json`,
        "application/json;charset=utf-8",
      );
      toast("Đã xuất file sao lưu JSON mã hóa.");
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (selected.size > 25 * 1024 * 1024)
      return toast("File quá lớn. Giới hạn nhập 25 MB.", true);
    setReading(true);
    try {
      const raw = await selected.text();
      if (isVault(JSON.parse(raw))) {
        parseEnvelope(raw);
        setEncryptedBackup(raw);
        setBackupPassword("");
        setBackupError("");
      } else setPending(restore(raw));
    } catch (e) {
      toast(`Không thể nhập: ${(e as Error).message}`, true);
    } finally {
      setReading(false);
    }
  }
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (company.trim())
      mutate(
        (d) => ({ ...d, settings: { ...d.settings, company: company.trim() } }),
        "Đã lưu cài đặt.",
      );
  };
  return (
    <>
      <PageHeading
        title="Cài đặt & sao lưu"
        description="Tùy chỉnh không gian làm việc và bảo vệ dữ liệu của bạn."
      />
      <div className="alert warning">
        <AlertTriangle size={21} />
        <div>
          <strong>Dữ liệu được lưu trên trình duyệt này</strong>
          <p>
            Xóa dữ liệu trình duyệt, dùng chế độ ẩn danh hoặc đổi thiết bị có
            thể làm mất dữ liệu. Hãy tải bản sao lưu JSON định kỳ và cất giữ ở
            nơi an toàn.
          </p>
        </div>
      </div>
      <div className="settings-grid">
        <div>
          <SecuritySettings />
          <section className="card settings-card">
            <div className="section-heading">
              <div>
                <h2>Không gian làm việc</h2>
                <p>Thông tin và giao diện của ứng dụng</p>
              </div>
              <SettingsIcon />
            </div>
            <form onSubmit={save}>
              <Field label="Tên không gian làm việc">
                <input
                  required
                  maxLength={80}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </Field>
              <div className="theme-options">
                <button
                  type="button"
                  className={data.settings.theme === "light" ? "selected" : ""}
                  onClick={() =>
                    mutate((d) => ({
                      ...d,
                      settings: { ...d.settings, theme: "light" },
                    }))
                  }
                >
                  <Sun size={22} />
                  <span>Giao diện sáng</span>
                  {data.settings.theme === "light" && (
                    <CheckCircle2 size={16} />
                  )}
                </button>
                <button
                  type="button"
                  className={data.settings.theme === "dark" ? "selected" : ""}
                  onClick={() =>
                    mutate((d) => ({
                      ...d,
                      settings: { ...d.settings, theme: "dark" },
                    }))
                  }
                >
                  <Moon size={22} />
                  <span>Giao diện tối</span>
                  {data.settings.theme === "dark" && <CheckCircle2 size={16} />}
                </button>
              </div>
              <Submit>Lưu cài đặt</Submit>
            </form>
          </section>
          <section className="card settings-card">
            <div className="section-heading">
              <div>
                <h2>Xuất bản sao lưu</h2>
                <p>File JSON mã hóa, dùng mật khẩu đăng nhập hiện tại</p>
              </div>
              <ArrowDownToLine size={22} className="text-blue" />
            </div>
            <div className="backup-option">
              <span className="stat-icon blue">
                <Database size={22} />
              </span>
              <div>
                <h3>Toàn bộ dữ liệu</h3>
                <p>
                  Nhân viên, chấm công, bảng lương và cài đặt của tất cả các
                  tháng.
                </p>
              </div>
              <Button className="primary" onClick={() => backup()}>
                <ArrowDownToLine size={16} /> Xuất JSON
              </Button>
            </div>
            <div className="backup-option monthly-backup">
              <span className="stat-icon purple">
                <FileJson size={22} />
              </span>
              <div>
                <h3>Dữ liệu từng tháng</h3>
                <p>Hồ sơ nhân viên và dữ liệu của kỳ được chọn.</p>
              </div>
              <div className="monthly-controls">
                <MonthPicker />
                <Button onClick={() => backup(true)}>Xuất tháng</Button>
              </div>
            </div>
            <p className="hint">
              Bản xuất theo tháng chỉ chứa một kỳ. Khi khôi phục sẽ thay thế
              toàn bộ dữ liệu hiện tại, không gộp dữ liệu.
            </p>
          </section>
        </div>
        <div>
          <section className="card settings-card">
            <div className="section-heading">
              <div>
                <h2>Khôi phục dữ liệu</h2>
                <p>Nhập lại bản sao lưu của Công Việt</p>
              </div>
              <Upload size={21} className="text-blue" />
            </div>
            <input
              className="sr-only"
              type="file"
              accept=".json,application/json"
              ref={file}
              onChange={importFile}
              aria-label="Chọn file sao lưu"
            />
            <button
              className="upload-zone"
              disabled={reading}
              onClick={() => file.current?.click()}
            >
              <span className="upload-icon">
                <Upload size={25} />
              </span>
              <strong>
                {reading
                  ? "Đang kiểm tra file…"
                  : "Chọn file JSON để khôi phục"}
              </strong>
              <span>Tối đa 25 MB · Kiểm tra cấu trúc và số tiền</span>
              <span className="btn">Chọn file sao lưu</span>
            </button>
            <p className="info-note">
              Dữ liệu chỉ được thay thế sau khi file vượt qua kiểm tra và bạn
              xác nhận. Nên xuất bản sao lưu hiện tại trước khi khôi phục.
            </p>
            {storageError && (
              <Button
                onClick={() => {
                  try {
                    download(
                      localStorage.getItem(STORAGE_KEY) ?? "",
                      `cong-viet-du-lieu-goc-${today()}.json`,
                      "application/json",
                    );
                  } catch {
                    toast(
                      "Trình duyệt đang chặn quyền đọc dữ liệu. Hãy bật quyền lưu trữ cho trang này.",
                      true,
                    );
                  }
                }}
              >
                Tải dữ liệu gốc đang lỗi
              </Button>
            )}
          </section>
          <section className="card settings-card storage-card">
            <span className="stat-icon green">
              <HardDrive size={22} />
            </span>
            <h3>Lưu trữ trên thiết bị</h3>
            <dl className="detail-list">
              <div>
                <dt>Dung lượng dữ liệu</dt>
                <dd>{(size / 1024).toFixed(1)} KB</dd>
              </div>
              <div>
                <dt>Phiên bản schema</dt>
                <dd>v{data.version}</dd>
              </div>
              <div>
                <dt>Nhân viên</dt>
                <dd>{data.employees.length}</dd>
              </div>
              <div>
                <dt>Ca làm đã lưu</dt>
                <dd>{Object.values(data.attendance).flat().length}</dd>
              </div>
              <div>
                <dt>Kỳ dữ liệu</dt>
                <dd>
                  {
                    new Set([
                      ...Object.keys(data.attendance),
                      ...Object.keys(data.payroll),
                    ]).size
                  }
                </dd>
              </div>
            </dl>
            <p className="hint">
              <ShieldCheck size={15} /> Dữ liệu không được gửi đến máy chủ.
            </p>
          </section>
        </div>
      </div>
      {encryptedBackup && (
        <Modal
          title="Mở bản sao lưu mã hóa"
          subtitle="Nhập mật khẩu đã dùng khi xuất bản sao lưu này."
          onClose={() => {
            if (!backupBusy) {
              setEncryptedBackup(null);
              setBackupPassword("");
            }
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBackupBusy(true);
              setBackupError("");
              try {
                const open = await unlockVault(encryptedBackup, backupPassword);
                setPending(open.data);
                setEncryptedBackup(null);
                setBackupPassword("");
              } catch (e) {
                setBackupError((e as Error).message);
              } finally {
                setBackupBusy(false);
              }
            }}
          >
            <div className="modal-body">
              <Field label="Mật khẩu bản sao lưu">
                <input
                  required
                  type="password"
                  autoComplete="off"
                  value={backupPassword}
                  disabled={backupBusy}
                  onChange={(e) => setBackupPassword(e.target.value)}
                />
              </Field>
              {backupError && (
                <p className="alert error" role="alert">
                  {backupError}
                </p>
              )}
            </div>
            <footer>
              <Button
                disabled={backupBusy}
                onClick={() => {
                  setEncryptedBackup(null);
                  setBackupPassword("");
                }}
              >
                Hủy
              </Button>
              <Button type="submit" className="primary" loading={backupBusy}>
                Mở bản sao lưu
              </Button>
            </footer>
          </form>
        </Modal>
      )}
      {pending && (
        <Confirm
          title="Khôi phục và ghi đè dữ liệu?"
          label="Khôi phục dữ liệu"
          danger
          onClose={() => setPending(null)}
          onConfirm={async () => {
            if (
              await mutate(
                () => ensureMonth(pending, currentMonth()),
                "Đã khôi phục dữ liệu thành công.",
                true,
              )
            ) {
              setCompany(pending.settings.company);
              setPending(null);
            }
          }}
        >
          File hợp lệ có {pending.employees.length} nhân viên,{" "}
          {Object.values(pending.attendance).flat().length} ca làm, tổng tiền
          các ca{" "}
          {money(
            sum(Object.values(pending.attendance).flat(), (s) => s.amount),
          )}
          . Các kỳ:{" "}
          {Object.keys(pending.attendance).map(monthLabel).join("; ") ||
            "Chưa có"}
          . Toàn bộ dữ liệu hiện tại sẽ được thay thế. Hãy chắc chắn bạn đã sao
          lưu trước khi tiếp tục.
        </Confirm>
      )}
    </>
  );
}
function SettingsIcon() {
  return <ShieldCheck size={22} className="muted" />;
}
