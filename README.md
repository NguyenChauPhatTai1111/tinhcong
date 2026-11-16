# Công Việt — Quản lý chấm công & tính lương

Ứng dụng React + TypeScript chạy hoàn toàn trên trình duyệt, không cần backend, database hay API. Mặc định dữ liệu trống. Không có số liệu demo trong thống kê.

## Cài đặt và chạy

Yêu cầu Node.js 22.12+ (khuyến nghị Node.js 24), npm, trình duyệt hiện đại.

```sh
npm ci
npm run dev
```

Mở URL Local do Vite hiển thị. Trên PowerShell nếu `npm.ps1` bị chặn, dùng `npm.cmd` thay `npm`.

```sh
npm test             # Unit test logic nghiệp vụ
npm run build        # Kiểm tra TypeScript + build production
npm run preview      # Xem bản production
npx playwright install chromium
npm run test:e2e     # Kiểm thử trình duyệt
```

E2E dùng cổng 5174, có thể tái sử dụng dev server của project trên cổng đó. Không dùng cổng này cho ứng dụng khác khi chạy E2E. Có thể chỉ định Chromium sẵn có bằng biến môi trường `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Build xuất vào `dist/`. Có thể phục vụ thư mục này bằng máy chủ static hoặc Laragon. Ứng dụng dùng HashRouter nên reload đường dẫn không cần cấu hình rewrite. **Mã hóa yêu cầu HTTPS hoặc localhost**. Với tên miền Laragon như `tinhcong.test`, hãy bật HTTPS; HTTP trên tên miền thông thường không cung cấp Web Crypto. Không mở `index.html` bằng `file://`.

## Đăng nhập và bảo mật

- Mở lần đầu sẽ vào trang **Thiết lập quản trị viên**. Tự đặt tên đăng nhập và mật khẩu dài tối thiểu 12 ký tự; không có tài khoản/mật khẩu mặc định. Tên đăng nhập gồm 3–40 ký tự chữ không dấu, số, `.`, `_`, `-`.
- Nếu đã có dữ liệu từ bản cũ, hồ sơ/ca làm/bảng lương được kiểm tra, mã hóa và thay thế nguyên tử trong cùng key. Không xóa dữ liệu cũ trước khi bản mã được ghi thành công. Nếu hết dung lượng hoặc dữ liệu cũ hỏng, giữ nguyên bản gốc; có thể tải bản gốc hoặc khôi phục file từ trang đăng nhập.
- Đăng nhập để mở các trang quản lý. Đăng xuất/khóa ngay ở header hoặc Cài đặt. Khóa giải mã chỉ nằm trong bộ nhớ phiên, không ghi vào localStorage/sessionStorage/cookie. Tải lại trang phải đăng nhập lại. Truy cập trực tiếp URL riêng cũng cần đăng nhập.
- Tự khóa sau 15 phút không hoạt động. Khi dữ liệu thay đổi ở tab khác, khóa phiên hiện tại để tránh tiếp tục làm việc trên dữ liệu cũ; đăng nhập lại để đọc bản mới.
- **Cài đặt → Bảo mật & đăng nhập → Đổi thông tin đăng nhập**: nhập mật khẩu hiện tại và mật khẩu mới. Toàn bộ dữ liệu được mã hóa lại với salt/khóa mới, sau đó yêu cầu đăng nhập lại. Nếu ghi thất bại, bản mã và mật khẩu cũ vẫn có hiệu lực.
- JSON sao lưu toàn bộ/tháng mặc định được mã hóa, mở bằng mật khẩu tại thời điểm xuất. Nhập file sẽ hỏi mật khẩu của bản sao lưu, kiểm tra nội dung rồi mới yêu cầu xác nhận ghi đè. Import không đổi tài khoản hiện tại. Vẫn hỗ trợ JSON chưa mã hóa từ bản cũ. Có thể khôi phục từ trang đăng nhập khi mất dữ liệu trình duyệt hoặc chuyển thiết bị.
- **Không thể lấy lại mật khẩu** từ ứng dụng. Hãy cất mật khẩu và bản sao lưu ở nơi an toàn. Backup xuất trước khi đổi mật khẩu vẫn cần mật khẩu cũ. Tạo backup mới sau khi đổi mật khẩu. CSV và phiếu lương/PDF được xuất ở dạng đọc được, cần tự bảo vệ.

Mã hóa dùng Web Crypto: AES-256-GCM, IV ngẫu nhiên 12 byte mới cho mỗi lần ghi; khóa dẫn xuất từ mật khẩu bằng PBKDF2-HMAC-SHA256 600.000 vòng với salt ngẫu nhiên 32 byte. Khóa không cho phép export; metadata quan trọng được xác thực qua additional authenticated data. GCM phát hiện thay đổi trái phép đối với dữ liệu mã hóa. Tham khảo [Web Crypto trên MDN](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey) và [hướng dẫn PBKDF2 của OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2).

Đây là đăng nhập mở khóa dữ liệu **trên thiết bị**, không phải xác thực/phân quyền do máy chủ kiểm soát. Mã hóa giúp bảo vệ dữ liệu khi chưa đăng nhập, không chống được mã độc/XSS/extension độc hại đang chạy trong phiên đã mở khóa, mật khẩu yếu bị đoán offline, hoặc người có quyền xóa/ghi đè dữ liệu trình duyệt. Không có chống brute-force hoặc thu hồi phiên tập trung như hệ thống backend. Nếu cần nhiều tài khoản, dữ liệu dùng chung hoặc bảo mật phía máy chủ, cần bổ sung backend.

## Luồng sử dụng

1. **Nhân viên**: thêm họ tên, mã riêng, ngày bắt đầu và lương theo giờ. Có tìm kiếm, xem chi tiết, sửa thông tin và bật/tắt làm việc. Lưu trữ là xóa mềm; có thể khôi phục, lịch sử không bị xóa.
2. **Chấm công**: chọn tháng/ngày, nhân viên, giờ vào/ra và số giờ nghỉ (có thể nhập 0,5 hoặc 1,5; cũng hỗ trợ dấu chấm). Giờ công không cố định theo ngày: 08:00–20:00 là 12 giờ, hôm sau 08:00–16:00 là 8 giờ nếu không nghỉ. Mặc định không trừ giờ nghỉ; bật nghỉ giữa ca để nhập số giờ cần trừ. Giờ nghỉ được quy đổi và làm tròn đến phút khi tính/lưu, giữ nguyên cấu trúc dữ liệu cũ. Giờ ra sớm hơn hoặc bằng giờ vào mặc định thuộc ngày kế tiếp. Chọn ngày kết thúc riêng cho ca cần nhập rõ ngày. Một nhân viên có nhiều ca/ngày, nhưng không được trùng thời gian kể cả qua tháng. Bảng và lịch tháng dùng chung dữ liệu.
3. **Bảng lương**: chọn kỳ và nhân viên hoặc tất cả, nhấn tính lương. Các ca được cộng theo số tiền đã lưu, không nhân tổng giờ với lương hiện tại. Có thưởng, phụ cấp, khấu trừ và ghi chú bắt buộc nếu điều chỉnh. Có thể xem từng ca, in phiếu và xuất CSV UTF-8 có BOM.
4. **Chốt lương**: sau xác nhận, snapshot được giữ nguyên; khóa thêm/sửa/xóa chấm công và điều chỉnh lương của nhân viên trong kỳ. Chốt là thao tác cuối, ứng dụng không có tự động mở khóa. Cần kiểm tra kỹ trước khi chốt.
5. **Thanh toán**: chỉ bảng lương đã chốt mới được đánh dấu đã trả. Lưu thời điểm thanh toán; chuyển lại chưa trả cần xác nhận và xóa thời điểm đã trả. Việc này không thay đổi tiền trong snapshot.
6. **Lịch sử lương**: chọn bất kỳ kỳ nào hoặc bấm thẻ kỳ để xem nhân viên, giờ công, số tiền và tình trạng thanh toán. Không xóa dữ liệu khi đổi tháng/năm.
7. **Cài đặt & sao lưu**: xuất JSON mã hóa toàn bộ hoặc một tháng, nhập JSON có kiểm tra dữ liệu, xem trước và xác nhận ghi đè. Đổi thông tin đăng nhập, giao diện sáng/tối và tên không gian làm việc.

Mọi thao tác được mã hóa và ghi vào localStorage trước khi UI báo thành công. Nếu ghi thất bại do dung lượng/quyền lưu trữ, ứng dụng báo lỗi và giữ dữ liệu cũ. Ghi dữ liệu được tuần tự hóa, dùng Web Locks khi trình duyệt hỗ trợ và kiểm tra bản đang lưu để tránh ghi đè âm thầm. Khi có thay đổi từ tab khác, yêu cầu đăng nhập lại. Không đóng/tải lại trang khi còn hiển thị “Đang mã hóa…”.

## Quy tắc tính toán

- Lưu giờ vào/ra dưới dạng ISO UTC; form hiển thị giờ địa phương của thiết bị. `date` là ngày bắt đầu ca được chọn và quyết định kỳ tính lương. Ca qua tháng được tính **toàn bộ vào tháng bắt đầu**, không chia ca giữa hai kỳ.
- Thời gian thực tế lưu bằng số phút nguyên: `(kết thúc − bắt đầu) / 60.000 − phút nghỉ`.
- Thời gian nghỉ không âm, không lẻ phút và không vượt thời lượng ca.
- Điều chỉnh phút làm phải có lý do và trong khoảng 0 đến toàn bộ thời lượng ca.
- Tiền mỗi ca: `Math.round(phút thực tế × đơn giá / 60)`. Tổng tháng cộng các khoản nguyên đồng của từng ca; các khoản thưởng/phụ cấp/khấu trừ là số nguyên đồng.
- Đơn giá có lịch sử `effectiveFrom`. Khi thêm ca, lấy mức gần nhất có hiệu lực vào ngày ca. Sửa giờ/ngày của ca thuộc cùng nhân viên giữ nguyên đơn giá snapshot; đổi nhân viên sẽ lấy đơn giá của nhân viên được chọn. Thay đổi đơn giá không sửa ca cũ, kể cả khi ngày hiệu lực ở quá khứ.
- Bảng lương nháp được tính lại khi sửa/xóa ca. Nếu giảm ca khiến khấu trừ vượt tổng thu nhập, thay đổi bị từ chối; hãy giảm khoản khấu trừ trong bản nháp trước. Ứng dụng không tự ý sửa khoản điều chỉnh.
- Nhân viên nghỉ việc không được tạo ca mới; vẫn sửa được các ca đã có nếu kỳ chưa khóa.
- Thống kê lương bao gồm các bảng lương nháp phát sinh từ ca đã lưu và các bảng lương đã tính. Tổng thanh toán chỉ cộng bảng lương đã đánh dấu trả.
- Mỗi 15 giây và khi quay lại tab/cửa sổ, kiểm tra ngày. Khi sang tháng mới, khởi tạo kỳ mới và chuyển bộ lọc kỳ hiện tại, giữ mọi kỳ cũ; không chốt hoặc trả lương tự động. Nếu ứng dụng đóng, việc này diễn ra khi mở lần tiếp theo.

## Lưu trữ và schema

Một key `congviet:data` chứa envelope mã hóa, ghi nguyên tử bằng một lần `localStorage.setItem`:

```ts
{
  format: 'congviet-vault', version: 1, username: string,
  kdf: 'PBKDF2-SHA256', iterations: 600000, salt: string,
  cipher: 'AES-256-GCM', iv: string, ciphertext: string
}
```

Tên đăng nhập và metadata mã hóa không phải bí mật; mọi dữ liệu nghiệp vụ nằm trong `ciphertext`. Không lưu mật khẩu hoặc khóa giải mã. Sau giải mã, payload có schema nghiệp vụ:

```ts
{
  version: 2,
  employees: Employee[],
  attendance: { [month: 'YYYY-MM']: Attendance[] },
  payroll: { [month: 'YYYY-MM']: Payroll[] },
  settings: { theme: 'light' | 'dark', company: string }
}
```

Interfaces đầy đủ: `src/types/index.ts`. Hồ sơ nhân viên độc lập với kỳ. Mỗi ca lưu đơn giá và số tiền. Bảng lương đã chốt chứa tên/mã, bản sao các ca, phút làm, các khoản điều chỉnh, số tiền và thời điểm chốt/trả.

`migrate()` trong `src/services/storage/index.ts` hỗ trợ schema nghiệp vụ v1 (cùng các entity, thiếu settings) → v2 bằng cách bổ sung cài đặt mặc định. Phiên bản envelope mã hóa độc lập với schema nghiệp vụ. Từ chối phiên bản không hỗ trợ. Sau giải mã, import kiểm tra cấu trúc, kiểu dữ liệu, số nguyên, ngày, tham chiếu, mã trùng, ca trùng, số tiền và tính nhất quán snapshot đã chốt trước khi cho phép ghi đè. JSON hỏng không bị âm thầm thay bằng dữ liệu trống: giữ bản gốc và hướng dẫn khôi phục trên trang đăng nhập.

**Khôi phục là thay thế toàn bộ dữ liệu**, kể cả bản sao lưu chỉ một tháng; không tự gộp các kỳ. Sao lưu đầy đủ trước khi nhập. File tháng vẫn chứa hồ sơ nhân viên dùng chung để bảo toàn tham chiếu.

localStorage phụ thuộc origin (giao thức + tên miền + cổng) và hồ sơ trình duyệt. Dữ liệu ở `localhost:5173` khác `localhost:5174` và tên miền Laragon. Dữ liệu không tự đồng bộ giữa thiết bị và không phải lưu trữ vĩnh viễn. Tự bảo quản bản sao lưu mã hóa và mật khẩu ở nơi phù hợp.

## Cấu trúc mã nguồn

```text
src/
  components/
    common/          # Form, dialog, toast, nút, bộ chọn kỳ
    layout/          # Sidebar, header, menu mobile
    attendance/      # Form chấm công và kết quả tính trực tiếp
    payroll/         # Chi tiết, điều chỉnh, chốt, thanh toán, in
  contexts/          # Phiên đăng nhập, khóa, trạng thái ứng dụng, ghi mã hóa, đổi tháng
  pages/             # Tổng quan, nhân viên, chấm công, lương/lịch sử, cài đặt
  services/storage/  # Schema, validation, migration, khóa kỳ, backup/restore
  services/security/ # Web Crypto, PBKDF2, AES-GCM, kiểm tra envelope
  types/             # Interfaces
  utils/             # Tính giờ/lương, định dạng, xuất CSV
  tests/             # Vitest
e2e/                 # Playwright: thao tác thực tế và responsive
```

Stack: React, TypeScript, Vite, Tailwind CSS, Lucide React, React Router DOM, date-fns, Recharts. Các trang được lazy load. Không gọi API nghiệp vụ hoặc tải font bên ngoài.

## Kiểm thử

Vitest bao gồm các trường hợp bắt buộc: ca thường, ca không nghỉ, ca đêm, lương 11 giờ, thay đổi đơn giá giữa tháng, ca trùng/liền nhau, đổi năm, cập nhật tháng cũ, bảo toàn kỳ đã chốt, backup/restore, tháng 28/29/30/31 ngày và nghỉ vượt ca. Bổ sung validation, migration, làm tròn tiền, CSV, tham chiếu và bảo vệ snapshot.

Unit test bảo mật kiểm tra round-trip mã hóa, mật khẩu sai, IV mới mỗi lần ghi, ciphertext/metadata bị sửa, đổi mật khẩu/salt, phiên bản/thuật toán không hợp lệ và yêu cầu mật khẩu.

Playwright kiểm tra đăng nhập/setup, bảo toàn dữ liệu cũ khi migrate hoặc ghi thất bại, chặn URL khi chưa đăng nhập, đăng xuất/reload, đổi mật khẩu, backup cũ, tự khóa 15 phút và thay đổi từ tab khác. Luồng nghiệp vụ tiếp tục được kiểm tra qua đăng nhập: thêm nhân viên → reload → chấm công → lịch tháng → tính lương → thêm thưởng → chốt → thanh toán → reload → khóa ca → xuất/nhập JSON mã hóa. Responsive ở 1440/1024/768/390 px và lưu giao diện tối sau đăng nhập lại. Ảnh kiểm tra nằm trong `artifacts/` sau khi chạy.
#   t i n h c o n g  
 