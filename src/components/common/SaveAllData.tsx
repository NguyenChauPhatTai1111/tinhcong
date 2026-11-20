import { Download, HardDriveDownload } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { dateLabel } from "../../utils/format";
import { Button } from "./UI";

export function SaveAllData() {
  const { saving, saveAllData, lastBackupAt } = useApp();
  return (
    <section className="save-all-panel" aria-label="Lưu và sao lưu toàn bộ dữ liệu">
      <span className="save-all-icon"><HardDriveDownload size={26} /></span>
      <div className="save-all-copy">
        <h2>Làm xong rồi? Lưu một bản để giữ lại.</h2>
        <p>Dữ liệu đã xác nhận được tự động lưu. Bấm nút để lưu và tải bản sao lưu tất cả các tháng về máy.</p>
        <small aria-live="polite">{lastBackupAt
          ? `Vừa tạo bản sao lưu lúc ${dateLabel(lastBackupAt, "HH:mm:ss · dd/MM/yyyy")}. Giữ file JSON để khôi phục trong Cài đặt & sao lưu.`
          : "Nếu đang nhập biểu mẫu, hãy bấm Lưu trong biểu mẫu trước."}</small>
      </div>
      <Button className="primary save-all-button" loading={saving} onClick={saveAllData}>
        {!saving && <Download size={22} />}
        {saving ? "Đang lưu dữ liệu…" : "Lưu toàn bộ dữ liệu"}
      </Button>
    </section>
  );
}
