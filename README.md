# Công Việt — Chấm công & tổng hợp giờ làm

Ứng dụng React + TypeScript chạy trên trình duyệt, không có backend hay API nghiệp vụ. Admin ghi nhận giờ làm, giờ nghỉ, tổng hợp giờ công và bấm tính lương riêng cho từng nhân viên bằng đơn giá tự nhập. Mặc định không có dữ liệu demo.

## Cài đặt và chạy

Yêu cầu Node.js 22.12+ (khuyến nghị Node.js 24), npm và trình duyệt hiện đại.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Mở URL Local mà Vite hiển thị. Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd` thay cho `npm`. Build nằm trong `dist/`, có thể phục vụ bằng máy chủ static/Laragon. Dùng HashRouter nên không cần rewrite đường dẫn.

**Mã hóa yêu cầu localhost hoặc HTTPS**. Với tên miền Laragon như `tinhcong.test`, hãy bật HTTPS. Không mở trực tiếp qua `file://`.

## Cách sử dụng

Bấm nút xanh **Hướng dẫn sử dụng** ở góc dưới bên phải để mở popup, kể cả tại trang đăng nhập. Popup tự chọn chủ đề phù hợp với trang đang xem, có tìm kiếm hỗ trợ tiếng Việt có/không dấu, 8 nhóm hướng dẫn, ví dụ giờ nghỉ/tính lương và câu hỏi thường gặp. Dùng nút Trước/Tiếp, chọn chủ đề hoặc bấm liên kết để mở đúng trang cần thao tác. Đóng bằng Đã hiểu, dấu X hoặc Escape.

Trang Tổng quan có 3 ô **Thêm nhân viên → Chấm công → Tính lương**, kèm số liệu và gợi ý bước tiếp theo từ dữ liệu hiện có. Trên điện thoại, thanh điều hướng dưới cùng cho mở nhanh Tổng quan/Nhân viên/Chấm công/Tính lương. Ở trang Tổng hợp giờ công, bấm **Xem cách làm** để mở thẳng hướng dẫn nút tính lương.

1. **Đăng nhập**: lần đầu tự tạo tài khoản quản trị viên, không có mật khẩu mặc định. Tên đăng nhập 3–40 ký tự chữ không dấu, số, `.`, `_`, `-`; mật khẩu tối thiểu 12 ký tự. Lần mở tiếp theo nhập tài khoản đã tạo.
2. **Nhân viên**: nhập tên, mã riêng, ngày bắt đầu và thông tin liên hệ/ghi chú tùy chọn. Không cần nhập đơn giá. Có tìm kiếm, sửa, xem chi tiết, bật/tắt làm việc và lưu trữ mềm để giữ lịch sử.
3. **Chấm công**: chọn ngày, nhân viên, giờ vào và giờ ra. Mặc định không trừ giờ nghỉ. Nếu có nghỉ, bật “Có nghỉ trưa / nghỉ giữa ca”, nhập số giờ nghỉ thực tế và chọn loại nghỉ. Có thể nhập `0,5`, `0.5`, `1,5`... Mỗi ca có thời gian nghỉ khác nhau.
4. **Ghi chú**: chọn “Có nghỉ trưa” hoặc “Nghỉ giữa ca / việc riêng” và nhập ghi chú thêm. Bảng chấm công hiển thị rõ giờ nghỉ, trạng thái nghỉ trưa, ghi chú và giờ thực tế.
5. **Tổng hợp giờ công / Tính lương**: chọn theo tháng, theo tuần hoặc khoảng ngày bất kỳ. Tuần bắt đầu thứ Hai, kết thúc Chủ nhật. Mỗi dòng nhân viên có nút **Tính lương**: nhập đơn giá riêng cho lần này, xem tiền dự kiến và bấm **Xác nhận tính lương**. Tiền = tổng phút chưa tính × đơn giá / 60, làm tròn đến đồng. Không cần thiết lập đơn giá trong hồ sơ.
   Sau khi lưu thành công, nút đổi thành **Đã tính lương** và bị disable; vẫn giữ trạng thái sau reload/đăng nhập lại. Nhân viên khác không bị ảnh hưởng. Bấm **Xem kết quả** để xem giờ/đơn giá/tiền đã lưu, in hoặc xuất CSV. Bấm Hủy hoặc lưu thất bại không đánh dấu đã tính.
   Hệ thống theo dõi từng ca đã tính để không tính trùng khi đổi bộ lọc tuần/tháng/khoảng ngày. Nếu có ca mới, nút được bật để tính riêng phần công mới; giờ cũ được bỏ qua. Các ca đã tính lương bị khóa sửa/xóa để giữ đúng kết quả. “Đã tính lương” chỉ xác nhận đã tính, không phải thao tác chuyển tiền hay xác nhận đã thanh toán.
6. **Chi tiết / in / CSV**: xem chi tiết từng ngày, in bảng giờ công hoặc xuất CSV tổng hợp/chi tiết có BOM UTF-8 cho Excel. CSV giờ công có số phút và số giờ; CSV trong “Xem kết quả” có thêm đơn giá, số tiền và thời điểm tính lương.
7. **Lịch sử giờ công**: xem lại các tháng cũ. Sửa/xóa ca chưa tính lương sẽ cập nhật tổng giờ của các bộ lọc liên quan. Ca đã tính lương giữ nguyên snapshot.
8. **Cài đặt & sao lưu**: đổi thông tin đăng nhập, sáng/tối, tên không gian làm việc; xuất/nhập JSON mã hóa toàn bộ hoặc từng tháng.

Ví dụ đúng theo nhu cầu:

| Giờ làm             | Thời gian nghỉ | Giờ thực tế   |
| ------------------- | -------------- | ------------- |
| 04:00–08:00         | 0,5 giờ        | 3 giờ 30 phút |
| 04:00–08:00         | Không nghỉ     | 4 giờ         |
| 08:00–20:00         | 1 giờ          | 11 giờ        |
| 20:00–06:00 hôm sau | 1,5 giờ        | 8 giờ 30 phút |

## Quy tắc thời gian

**Bắt buộc hoàn tất lương tháng cũ:** trước khi tạo hoặc sửa ca thuộc tháng mới, hệ thống kiểm tra toàn bộ giờ công của các tháng trước đó. Chỉ cần còn một ca có giờ thực tế lớn hơn 0 chưa được xác nhận tính lương của bất kỳ nhân viên nào (kể cả đã nghỉ/lưu trữ), việc lưu ca tháng mới sẽ bị chặn. Ràng buộc dùng chung cho tất cả nhân viên và được kiểm tra cả ở form lẫn hàm lưu dữ liệu; không phụ thuộc một cờ mở khóa trong giao diện.

Thông báo chỉ rõ tháng, số người và giờ công còn thiếu. Nút **Tính lương tháng MM/YYYY** đưa về đúng tháng cũ nhất còn thiếu, đặt chế độ Theo tháng và bỏ lọc nhân viên để xử lý đầy đủ. Khi tính đủ mọi ca còn lại, chấm công tháng mới tự mở. Tính theo tuần đã xong một phần tháng chưa đủ để mở nếu còn ca khác. Tháng không có công hoặc chỉ có 0 phút thực tế không cần tính lương.

Có thể bổ sung/sửa công trong tháng cũ đang hoàn tất (ca đã tính lương vẫn khóa sửa/xóa). Nếu thêm công cũ chưa tính, ràng buộc tháng mới sẽ áp dụng lại. Quy tắc vẫn đúng khi bỏ lỡ nhiều tháng, đổi tháng 12 sang tháng 1 hoặc tải lại/khôi phục dữ liệu. Kỳ mới vẫn được tạo nhưng không tự chốt lương, không xóa dữ liệu cũ; dữ liệu tháng mới đã có sẵn trong bản sao lưu vẫn được giữ để xem.

- Không có số giờ làm/nghỉ cố định mỗi ngày. Tổng giờ thực tế = thời gian có mặt − thời gian nghỉ của chính ca đó.
- Thời gian nghỉ nhập theo giờ, hỗ trợ dấu phẩy hoặc chấm thập phân; quy đổi và làm tròn đến phút khi lưu. Toàn bộ tổng hợp cộng số phút nguyên trước khi hiển thị giờ/phút.
- Giờ ra sớm hơn hoặc bằng giờ vào được hiểu là ngày hôm sau. Có ô chọn ngày kết thúc riêng nếu cần.
- Không cho phép nghỉ vượt thời gian có mặt, phút âm, ca trùng giờ hoặc tạo ca trước ngày vào làm. Nhiều ca trong một ngày được phép nếu không trùng nhau.
- Có thể điều chỉnh phút thực tế thủ công, phải có lý do và không vượt toàn bộ thời gian có mặt.
- Ca qua tháng/tuần được tính toàn bộ theo **ngày bắt đầu ca**, không chia ca giữa hai kỳ. Giờ vào/ra lưu ISO UTC, form hiển thị giờ địa phương của thiết bị.
- Mỗi 15 giây và khi quay lại tab/cửa sổ, nhận biết ngày mới và khởi tạo kỳ tháng hiện tại nếu chưa có. Không xóa các tháng/năm cũ.
- Các bộ lọc theo tuần và khoảng ngày lấy ca từ tất cả kỳ lưu trữ, nên hỗ trợ đầy đủ tuần vượt tháng/năm.

## Bảo mật và sao lưu

Dữ liệu trong localStorage và JSON sao lưu được mã hóa bằng AES-256-GCM. Mỗi lần ghi dùng IV ngẫu nhiên 12 byte mới. Khóa được dẫn xuất từ mật khẩu bằng PBKDF2-HMAC-SHA256 600.000 vòng, salt ngẫu nhiên 32 byte; khóa không cho export và chỉ nằm trong bộ nhớ phiên. Metadata quan trọng được xác thực qua additional authenticated data. Tham khảo [Web Crypto trên MDN](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey) và [OWASP về PBKDF2](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2).

- Mọi trang quản lý đều cần đăng nhập, kể cả mở URL trực tiếp. Tải lại trang phải đăng nhập lại. Có đăng xuất/khóa ngay và tự khóa sau 15 phút không hoạt động.
- Đổi mật khẩu yêu cầu mật khẩu hiện tại, mã hóa lại dữ liệu với salt/khóa mới rồi đăng xuất. Không ghi mật khẩu/khóa vào localStorage, sessionStorage hay cookie.
- Ghi mã hóa thành công trước khi UI thông báo đã lưu. Ghi thất bại giữ nguyên dữ liệu cũ. Khi dữ liệu đổi ở tab khác, khóa phiên và yêu cầu đăng nhập lại để tránh ghi đè dữ liệu cũ.
- JSON sao lưu dùng mật khẩu tại lúc xuất. Khi nhập, hỏi mật khẩu file, kiểm tra cấu trúc/giá trị/tham chiếu rồi mới xác nhận ghi đè. Vẫn hỗ trợ bản sao lưu chưa mã hóa từ phiên bản cũ. Import dữ liệu không đổi tài khoản hiện tại.
- **Khôi phục thay thế toàn bộ dữ liệu**, kể cả bản sao lưu một tháng; không tự gộp kỳ. Hãy sao lưu toàn bộ trước khi nhập. File tháng kèm hồ sơ nhân viên dùng chung. Nếu có lần tính lương theo tuần vượt tháng, file kèm toàn bộ snapshot và các ca nguồn của lần tính đó, kể cả phần ngày ở tháng kế cận, để giữ đúng kết quả và tránh tính trùng.
- Không có chức năng lấy lại mật khẩu. Quên mật khẩu có thể không mở được dữ liệu nếu không có bản sao lưu truy cập được. Backup cũ vẫn cần mật khẩu cũ; nên tạo backup mới sau khi đổi mật khẩu.
- CSV và bản in/PDF là dữ liệu đọc được, hãy tự cất giữ an toàn.

Đây là bảo vệ dữ liệu cục bộ trên thiết bị. Không có xác thực/phân quyền tập trung của máy chủ; không chống được mã độc/XSS/extension độc hại trong phiên đã mở khóa, mật khẩu yếu bị đoán offline hoặc người có quyền xóa dữ liệu trình duyệt. Muốn nhiều tài khoản, dữ liệu dùng chung hoặc phân quyền trên máy chủ cần backend.

localStorage không phải lưu trữ vĩnh viễn. Xóa dữ liệu trình duyệt, chế độ ẩn danh, đổi hồ sơ hoặc đổi origin (giao thức/tên miền/cổng) có thể khiến dữ liệu không còn truy cập được. Dữ liệu `localhost:5173` khác `localhost:5174` và tên miền Laragon. Hãy sao lưu định kỳ.

## Schema và tương thích phiên bản cũ

Key duy nhất `congviet:data` chứa envelope mã hóa phiên bản 1. Payload sau giải mã dùng schema nghiệp vụ **v4**, gồm `employees`, `attendance` theo `YYYY-MM`, `payroll` lưu trữ từ phiên bản cũ, `wageCalculations` chứa kết quả tính lương theo từng nhân viên và `settings`. Envelope và schema nghiệp vụ có phiên bản độc lập.

`migrate()` hỗ trợ v1/v2/v3 → v4, giữ hồ sơ và các ca đã ghi, bổ sung `wageCalculations: []`. Dữ liệu lương/đơn giá cũ không bị xóa: các trường `rates`, `hourlyRate`, `amount` và `payroll` tiếp tục được giữ trong sao lưu để bảo toàn lịch sử. Hồ sơ mới có `rates: []`; ca mới có các trường tiền bằng 0 để tương thích cấu trúc cũ. Lần tính mới dùng đơn giá admin nhập trong modal và lưu snapshot riêng trong `wageCalculations`.

Các bảng lương v1/v2 tiếp tục là bản lưu độc lập. Các kết quả tính bằng nút mới lưu tên/mã nhân viên, khoảng ngày, bản sao các ca, tổng phút, đơn giá, số tiền, ghi chú và thời điểm tính. Không cho cùng một ca xuất hiện trong hai kết quả. Import kiểm tra số tiền và snapshot trùng với ca nguồn trước khi ghi đè. `breakKind` lưu loại nghỉ; ca cũ chưa có loại nghỉ hiển thị “Chưa ghi rõ loại nghỉ” đến khi admin cập nhật.

Migration/import kiểm tra phiên bản, kiểu dữ liệu, ngày, số phút, tham chiếu nhân viên, mã trùng, ca trùng và dữ liệu lịch sử. Bản gốc chỉ bị thay thế sau khi mã hóa và ghi thành công. Dữ liệu hỏng không bị âm thầm đặt lại thành dữ liệu trống; trang đăng nhập cho tải bản gốc và chọn backup để khôi phục.

## Mã nguồn và kiểm thử

```text
src/
  components/common/     # Field, modal, nút, bảo mật
  components/layout/     # Sidebar, header, menu mobile
  components/attendance/ # Form giờ vào/ra, nghỉ, ghi chú, tự tính giờ
  contexts/              # Đăng nhập, phiên, ghi mã hóa, đổi tháng
  pages/                 # Tổng quan, nhân viên, chấm công, tổng hợp, lịch sử, cài đặt
  services/security/     # Web Crypto và envelope
  services/storage/      # Validation, migration, ghi nhận/xóa ca, sao lưu
  utils/timeSummary.ts   # Khoảng ngày, tổng hợp giờ, CSV
  tests/                 # Unit test nghiệp vụ và mã hóa
e2e/                     # Playwright: luồng thực tế, bảo mật, responsive
```

Stack: React, TypeScript, Vite, Tailwind CSS, Lucide React, React Router DOM, date-fns, Recharts. Không gọi API nghiệp vụ hay tải font bên ngoài.

```sh
npx playwright install chromium
npm run test:e2e
```

E2E dùng cổng 5174, có thể tái sử dụng dev server của đúng project trên cổng đó. Có thể dùng Chromium sẵn có qua biến `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Ảnh QA và PDF nằm trong `artifacts/` sau khi chạy.

Unit test bao gồm ví dụ 04:00–08:00 nghỉ nửa tiếng, nghỉ linh hoạt, ca đêm, nhiều ca/ngày, trùng ca, tuần vượt tháng/năm, tháng 28/29/30/31 ngày, sửa/xóa công, migration giữ lịch sử cũ, backup/restore, CSV và mã hóa. E2E kiểm tra toàn bộ luồng nhân viên → công → tổng hợp tuần/tháng/khoảng ngày → sửa/xóa → reload/đăng nhập → CSV/in/backup, cùng các trường hợp bảo mật và responsive.
