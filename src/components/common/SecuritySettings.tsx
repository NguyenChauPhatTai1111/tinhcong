import { useState, type FormEvent } from "react";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import { Button, Field, Modal } from "./UI";
export function SecuritySettings() {
  const { session, changeCredentials, lock } = useAuth(),
    { saving } = useApp();
  const [open, setOpen] = useState(false),
    [username, setUsername] = useState(session?.envelope.username ?? ""),
    [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function close() {
    if (!busy) {
      setOpen(false);
      setCurrent("");
      setPassword("");
      setConfirmation("");
      setError("");
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    setBusy(true);
    try {
      await changeCredentials(current, username.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="card settings-card">
        <div className="section-heading">
          <div>
            <h2>Bảo mật & đăng nhập</h2>
            <p>Quản trị viên: {session?.envelope.username}</p>
          </div>
          <ShieldCheck size={22} className="text-blue" />
        </div>
        <p className="info-note">
          Dữ liệu được mã hóa bằng mật khẩu. Phiên tự khóa sau 15 phút không
          hoạt động; tải lại trang cần đăng nhập lại.
        </p>
        <div className="security-actions">
          <Button disabled={saving} onClick={() => setOpen(true)}>
            <KeyRound size={16} /> Đổi thông tin đăng nhập
          </Button>
          <Button onClick={() => lock()}>
            <LockKeyhole size={16} /> Khóa ngay
          </Button>
        </div>
        <p className="hint">
          Mật khẩu không được lưu trên trình duyệt. Không có chức năng lấy lại
          mật khẩu nếu thiếu bản sao lưu có thể mở được. CSV và phiếu lương đã
          xuất là dữ liệu đọc được, hãy cất giữ cẩn thận.
        </p>
      </section>
      {open && (
        <Modal
          title="Đổi thông tin đăng nhập"
          subtitle="Dữ liệu sẽ được mã hóa lại bằng mật khẩu mới."
          onClose={close}
        >
          <form onSubmit={submit}>
            <div className="modal-body form-grid">
              <Field label="Mật khẩu hiện tại" className="full">
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  disabled={busy}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </Field>
              <Field label="Tên đăng nhập mới" className="full">
                <input
                  required
                  autoComplete="username"
                  maxLength={40}
                  value={username}
                  disabled={busy}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
              <Field label="Mật khẩu mới" className="full">
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="Xác nhận mật khẩu mới" className="full">
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={confirmation}
                  disabled={busy}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </Field>
              <p className="info-note full">
                Sau khi đổi thành công, bạn sẽ đăng xuất. Bản sao lưu cũ vẫn
                dùng mật khẩu tại thời điểm xuất; hãy tạo bản sao lưu mới sau
                khi đăng nhập lại.
              </p>
              {error && (
                <p className="alert error full" role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer>
              <Button disabled={busy} onClick={close}>
                Hủy
              </Button>
              <Button type="submit" className="primary" loading={busy}>
                Lưu và đăng xuất
              </Button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
