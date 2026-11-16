import { useState, type FormEvent } from "react";
import {
  Clock3,
  Eye,
  EyeOff,
  FileDown,
  LockKeyhole,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button, Field } from "../components/common/UI";
import { download, today } from "../utils/format";
import { restore, STORAGE_KEY } from "../services/storage";
import { isVault, parseEnvelope } from "../services/security/vault";
export default function Login() {
  const auth = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [replacement, setReplacement] = useState<{
      raw: string;
      encrypted: boolean;
      name: string;
    } | null>(null),
    [acknowledge, setAcknowledge] = useState(false);
  const setup = replacement ? !replacement.encrypted : auth.mode === "setup";
  const recovery = auth.mode === "recovery" && !replacement;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (setup && password !== confirm) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    if ((setup || replacement) && !acknowledge) {
      setError(
        "Vui lòng xác nhận lưu mật khẩu và việc bảo vệ/khôi phục dữ liệu.",
      );
      return;
    }
    setBusy(true);
    try {
      if (setup) await auth.setup(username.trim(), password, replacement?.raw);
      else await auth.login(username.trim(), password, replacement?.raw);
      setPassword("");
      setConfirm("");
      const from = location.state?.from;
      navigate(
        typeof from === "string" &&
          /^\/(nhan-vien|cham-cong|bang-luong|lich-su|cai-dat)?$/.test(from)
          ? from
          : "/",
        { replace: true },
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function chooseFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 25 * 1024 * 1024)
        throw new Error("File vượt quá giới hạn 25 MB.");
      const raw = await file.text(),
        parsed: unknown = JSON.parse(raw),
        encrypted = isVault(parsed);
      if (encrypted) {
        const envelope = parseEnvelope(raw);
        setUsername(envelope.username);
      } else restore(raw);
      setReplacement({ raw, encrypted, name: file.name });
      setPassword("");
      setConfirm("");
      setAcknowledge(false);
    } catch (e) {
      setError(`Không thể đọc bản sao lưu: ${(e as Error).message}`);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-icon">
            <Clock3 size={27} />
          </span>
          <span>
            Công<span className="brand-blue">Việt</span>
            <small>CHẤM CÔNG & TÍNH LƯƠNG</small>
          </span>
        </div>
        <div>
          <span className="auth-eyebrow">KHÔNG GIAN QUẢN TRỊ</span>
          <h1>
            Đội ngũ của bạn.
            <br />
            Dữ liệu của bạn.
          </h1>
          <p>
            Quản lý giờ công và thu nhập trong một không gian được bảo vệ bằng
            mật khẩu.
          </p>
          <div className="auth-shield">
            <ShieldCheck size={74} />
            <span>
              <i /> Mã hóa trên thiết bị
            </span>
          </div>
        </div>
        <small>Công Việt · Quản lý gọn gàng, vận hành nhẹ nhàng.</small>
      </section>
      <section className="auth-content">
        <div className="auth-card">
          <span className="auth-lock">
            <LockKeyhole size={25} />
          </span>
          <h1>
            {recovery
              ? "Khôi phục dữ liệu"
              : setup
                ? "Thiết lập quản trị viên"
                : "Đăng nhập quản trị viên"}
          </h1>
          <p className="auth-description">
            {setup
              ? auth.hasLegacy && !replacement
                ? "Dữ liệu hiện có sẽ được mã hóa bằng mật khẩu của bạn, giữ nguyên nhân viên, giờ công và bảng lương."
                : "Tạo tài khoản để bảo vệ dữ liệu trên trình duyệt này."
              : "Nhập tài khoản và mật khẩu để mở khóa không gian làm việc."}
          </p>
          {auth.notice && <p className="info-note">{auth.notice}</p>}
          {auth.issue && (
            <p className="alert error" role="alert">
              Không thể mở dữ liệu: {auth.issue} Dữ liệu gốc được giữ nguyên.
              Hãy tải bản gốc hoặc chọn bản sao lưu để khôi phục.
            </p>
          )}
          {replacement && (
            <p className="alert warning">
              Đã chọn: {replacement.name}. Khi xác nhận, dữ liệu hiện tại trên
              thiết bị sẽ được thay thế bằng bản sao lưu này.
            </p>
          )}
          {!recovery && (
            <form onSubmit={submit}>
              <Field label="Tên đăng nhập">
                <div className="auth-input">
                  <UserRound size={17} />
                  <input
                    aria-label="Tên đăng nhập"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={40}
                    value={username}
                    disabled={busy}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tên đăng nhập quản trị viên"
                  />
                </div>
              </Field>
              <label className="field" htmlFor="auth-password">
                <span>
                  {replacement?.encrypted
                    ? "Mật khẩu của bản sao lưu"
                    : "Mật khẩu"}
                </span>
                <div className="auth-input">
                  <LockKeyhole size={17} />
                  <input
                    id="auth-password"
                    aria-label={
                      replacement?.encrypted
                        ? "Mật khẩu của bản sao lưu"
                        : "Mật khẩu"
                    }
                    required
                    type={visible ? "text" : "password"}
                    minLength={setup ? 12 : undefined}
                    maxLength={128}
                    autoComplete={setup ? "new-password" : "current-password"}
                    value={password}
                    disabled={busy}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      setup ? "Tối thiểu 12 ký tự" : "Nhập mật khẩu của bạn"
                    }
                  />
                  <button
                    type="button"
                    aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setVisible((v) => !v)}
                  >
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              {setup && (
                <Field label="Xác nhận mật khẩu">
                  <input
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirm}
                    disabled={busy}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </Field>
              )}
              {(setup || replacement) && (
                <label className="check-field auth-ack">
                  <input
                    type="checkbox"
                    required
                    checked={acknowledge}
                    onChange={(e) => setAcknowledge(e.target.checked)}
                  />
                  <span>
                    {replacement
                      ? "Tôi xác nhận ghi đè dữ liệu hiện tại bằng bản sao lưu này."
                      : "Tôi đã lưu mật khẩu ở nơi an toàn. Quên mật khẩu sẽ không thể giải mã dữ liệu nếu không có bản sao lưu truy cập được."}
                  </span>
                </label>
              )}
              <Button
                type="submit"
                className="primary auth-submit"
                loading={busy}
              >
                <LockKeyhole size={17} />
                {setup
                  ? "Tạo tài khoản & mã hóa dữ liệu"
                  : replacement
                    ? "Mở khóa & khôi phục"
                    : "Đăng nhập"}
              </Button>
            </form>
          )}
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          <div className="auth-recovery">
            <label className="btn">
              <Upload size={15} /> Khôi phục bản sao lưu
              <input
                type="file"
                accept=".json,application/json"
                className="sr-only"
                aria-label="Chọn bản sao lưu để khôi phục"
                disabled={busy}
                onChange={(e) => {
                  void chooseFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <Button
              disabled={busy}
              onClick={() => {
                try {
                  const raw = localStorage.getItem(STORAGE_KEY);
                  if (!raw) throw new Error("Chưa có dữ liệu để tải.");
                  download(
                    raw,
                    `cong-viet-ban-goc-${today()}.json`,
                    "application/json",
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <FileDown size={15} /> Tải dữ liệu gốc
            </Button>
            {replacement && (
              <Button
                onClick={() => {
                  setReplacement(null);
                  setAcknowledge(false);
                  setPassword("");
                  setConfirm("");
                }}
              >
                Hủy khôi phục
              </Button>
            )}
          </div>
          <p className="auth-footnote">
            <ShieldCheck size={14} /> Khóa giải mã chỉ được giữ trong phiên đăng
            nhập. Tải lại trang sẽ cần đăng nhập lại.
          </p>
        </div>
      </section>
    </div>
  );
}
