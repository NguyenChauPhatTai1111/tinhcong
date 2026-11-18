import {
  BookOpen,
  CalendarCheck2,
  CalendarRange,
  Calculator,
  CircleHelp,
  DatabaseBackup,
  LockKeyhole,
  Users,
  type LucideIcon,
} from "lucide-react";
export type GuideTopicId =
  | "start"
  | "employees"
  | "attendance"
  | "wages"
  | "history"
  | "backup"
  | "account"
  | "faq";
interface GuideTopic {
  id: GuideTopicId;
  title: string;
  description: string;
  icon: LucideIcon;
  steps: { title: string; text: string }[];
  notes?: string[];
  example?: { title: string; rows: [string, string][] };
  faqs?: { question: string; answer: string }[];
  action?: { label: string; path: string };
}
export const guideTopics: GuideTopic[] = [
  {
    id: "start",
    title: "Bắt đầu sử dụng",
    description:
      "Chỉ cần nhớ 3 việc: thêm người làm, ghi nhận ca và tính lương khi cần.",
    icon: BookOpen,
    steps: [
      {
        title: "Thêm nhân viên",
        text: "Vào Nhân viên → Thêm nhân viên. Nhập tên, mã riêng và ngày bắt đầu. Không cần đặt đơn giá lương ở bước này.",
      },
      {
        title: "Chấm công từng ca",
        text: "Vào Chấm công → Chấm công mới. Chọn người làm, ngày, giờ vào và giờ ra. Có nghỉ thì nhập số giờ nghỉ; hệ thống tự trừ để ra giờ thực tế.",
      },
      {
        title: "Tính lương từng người",
        text: "Vào Tổng hợp giờ công. Chọn tháng, tuần hoặc khoảng ngày, tìm dòng nhân viên rồi bấm Tính lương. Nhập đơn giá riêng, kiểm tra tiền và bấm Xác nhận tính lương.",
      },
    ],
    notes: [
      "Lưu xong hãy chờ thông báo thành công. Nếu đang hiện “Đang mã hóa…”, đừng đóng hoặc tải lại trang.",
      "Tải bản sao lưu JSON định kỳ trong Cài đặt & sao lưu để bảo vệ dữ liệu.",
    ],
    action: { label: "Mở danh sách nhân viên", path: "/nhan-vien" },
  },
  {
    id: "employees",
    title: "Thêm & quản lý nhân viên",
    description: "Mỗi người một hồ sơ, không cần nhập mức lương cố định.",
    icon: Users,
    steps: [
      {
        title: "Tạo hồ sơ",
        text: "Bấm Thêm nhân viên. Nhập họ tên, mã nhân viên không trùng nhau và ngày bắt đầu làm việc. Số điện thoại và ghi chú có thể để trống.",
      },
      {
        title: "Lưu nhân viên",
        text: "Bấm Lưu nhân viên và chờ thông báo thành công. Người đang làm việc sẽ xuất hiện trong ô chọn nhân viên khi tạo ca mới.",
      },
      {
        title: "Tìm, sửa hoặc xem chi tiết",
        text: "Dùng ô tìm kiếm theo tên/mã. Bấm biểu tượng con mắt để xem hồ sơ; bấm cây bút để sửa thông tin.",
      },
      {
        title: "Khi nhân viên nghỉ việc",
        text: "Bấm trạng thái Đang làm việc để chuyển sang Đã nghỉ việc. Nút lưu trữ sẽ ẩn hồ sơ khỏi danh sách chính và yêu cầu xác nhận. Lịch sử công được giữ lại; có thể Khôi phục ở cuối trang.",
      },
    ],
    notes: [
      "Nhân viên đã nghỉ/lưu trữ không thể được chọn cho ca mới. Các ca cũ và kết quả tính lương vẫn được giữ.",
      "Mỗi lần tính lương bạn nhập đơn giá riêng cho người đó, phù hợp người mới và người làm lâu có giá khác nhau.",
    ],
    action: { label: "Mở quản lý nhân viên", path: "/nhan-vien" },
  },
  {
    id: "attendance",
    title: "Chấm công & giờ nghỉ",
    description:
      "Giờ làm thay đổi từng ngày; hệ thống không cố định 8 tiếng/ngày hay số giờ nghỉ.",
    icon: CalendarCheck2,
    steps: [
      {
        title: "Chọn ngày và người làm",
        text: "Bấm Chấm công mới. Chọn đúng Ngày làm việc và Nhân viên, sau đó nhập giờ bắt đầu và kết thúc.",
      },
      {
        title: "Ghi nhận nghỉ nếu có",
        text: "Không nghỉ thì để tắt “Có nghỉ trưa / nghỉ giữa ca”. Có nghỉ thì bật lên, nhập số giờ nghỉ, ví dụ 0,5 hoặc 1,5. Hỗ trợ cả dấu phẩy và dấu chấm.",
      },
      {
        title: "Ghi rõ loại nghỉ và ghi chú",
        text: "Chọn Có nghỉ trưa hoặc Nghỉ giữa ca / việc riêng. Điền thêm ghi chú nếu cần để dễ đối chiếu về sau.",
      },
      {
        title: "Kiểm tra giờ thực tế rồi lưu",
        text: "Xem khung Kết quả tự động: thời gian có mặt trừ thời gian nghỉ. Bấm Lưu chấm công. Một người có thể có nhiều ca/ngày, miễn các ca không trùng giờ.",
      },
      {
        title: "Ca qua đêm hoặc cần điều chỉnh",
        text: "Ví dụ 20:00–06:00 sẽ tính ra ngày hôm sau. Có thể chọn ngày kết thúc riêng. Nếu điều chỉnh thủ công phút thực tế, bắt buộc nhập lý do.",
      },
    ],
    example: {
      title: "Ví dụ dễ nhớ",
      rows: [
        ["04:00 → 08:00, không nghỉ", "4 giờ"],
        ["04:00 → 08:00, nghỉ 0,5 giờ", "3 giờ 30 phút"],
        ["08:00 → 20:00, nghỉ 1 giờ", "11 giờ"],
        ["20:00 → 06:00 hôm sau, nghỉ 1,5 giờ", "8 giờ 30 phút"],
      ],
    },
    notes: [
      "Thời gian nghỉ không được lớn hơn toàn bộ ca làm.",
      "Nếu tháng trước còn giờ công chưa tính lương của bất kỳ nhân viên nào, hệ thống sẽ chặn lưu ca ở tháng mới. Bấm Tính lương tháng… trong thông báo, tính đủ phần công còn lại rồi quay về chấm công.",
      "Ca đã tính lương sẽ khóa sửa/xóa. Ca chưa tính có thể sửa hoặc xóa bằng nút ở bên phải dòng chấm công.",
    ],
    action: { label: "Mở trang chấm công", path: "/cham-cong" },
  },
  {
    id: "wages",
    title: "Tính lương & nút bị khóa",
    description:
      "Mỗi nhân viên có nút Tính lương riêng ở trang Tổng hợp giờ công.",
    icon: Calculator,
    steps: [
      {
        title: "Chọn kỳ muốn tính",
        text: "Chọn Theo tháng, Theo tuần hoặc Khoảng ngày. Có thể tính sớm giữa tháng bằng cách chọn tuần hoặc khoảng ngày cần tính. Lọc từng người hoặc để tất cả.",
      },
      {
        title: "Bấm Tính lương ở đúng nhân viên",
        text: "Nút nằm ở bên phải mỗi dòng nhân viên, cạnh Chi tiết. Trên điện thoại, các nút nằm cuối thẻ của người đó.",
      },
      {
        title: "Nhập đơn giá cho lần tính này",
        text: "Ví dụ nhập 30000 nghĩa là 30.000đ/giờ. Hệ thống lấy tổng giờ thực tế chưa tính lương nhân với đơn giá này. Bạn chưa xác nhận thì chưa có kết quả được lưu.",
      },
      {
        title: "Kiểm tra và xác nhận",
        text: "Kiểm tra tên, khoảng ngày, giờ công và tiền. Bấm Xác nhận tính lương để lưu. Bấm Hủy nếu chưa muốn tính; nút của nhân viên vẫn còn dùng được.",
      },
      {
        title: "Xem lại sau khi tính",
        text: "Nút đổi thành Đã tính lương và bị khóa, kể cả sau khi tải lại trang. Bấm Xem kết quả để xem giờ, đơn giá, tiền và thời điểm đã tính; có thể in hoặc xuất CSV.",
      },
    ],
    example: {
      title: "Ví dụ tính tiền",
      rows: [
        ["Giờ thực tế chưa tính", "3 giờ 30 phút"],
        ["Đơn giá tự nhập", "30.000đ/giờ"],
        ["Tiền lương lần này", "105.000đ"],
      ],
    },
    notes: [
      "Khi có ca mới chưa tính, nút được bật để tính riêng phần công mới. Công cũ được bỏ qua, kể cả khi đổi bộ lọc tuần sang tháng.",
      "Đã tính lương không có nghĩa là đã chuyển tiền cho nhân viên.",
      "Trước khi chấm công tháng mới, phải tính đủ lương các tháng cũ cho tất cả người có giờ công. Tính theo tuần mới được một phần tháng thì vẫn cần tính nốt phần còn lại.",
      "Ca đã xác nhận tính lương không thể sửa/xóa. Hãy kiểm tra kỹ trước khi xác nhận.",
    ],
    action: { label: "Mở tổng hợp & tính lương", path: "/tong-hop" },
  },
  {
    id: "history",
    title: "Xem tuần, tháng & lịch sử",
    description: "Xem lại ca làm và tổng giờ mà không cần chờ đến cuối tháng.",
    icon: CalendarRange,
    steps: [
      {
        title: "Xem theo tháng",
        text: "Tại Chấm công hoặc Tổng hợp giờ công, chọn tháng và năm. Dùng mũi tên trái/phải để đổi nhanh sang tháng trước hoặc sau.",
      },
      {
        title: "Xem theo tuần hoặc khoảng ngày",
        text: "Tại Tổng hợp giờ công, chọn Theo tuần rồi chọn một ngày trong tuần muốn xem. Tuần bắt đầu thứ Hai và kết thúc Chủ nhật. Khoảng ngày cho phép nhập ngày bắt đầu và ngày kết thúc tùy ý.",
      },
      {
        title: "Đối chiếu từng ngày",
        text: "Bấm Chi tiết để xem ngày làm, giờ vào/ra, thời gian nghỉ và ghi chú. Nhiều ca trong cùng ngày được cộng thành tổng ngày.",
      },
      {
        title: "Mở lịch sử hoặc lịch tháng",
        text: "Lịch sử giờ công cho xem lại các kỳ cũ. Trong Chấm công, chọn Lịch tháng rồi bấm vào một ngày để xem ca của ngày đó.",
      },
    ],
    notes: [
      "Ca qua tuần/tháng được tính toàn bộ vào ngày bắt đầu ca, không chia ca giữa hai kỳ.",
      "Nếu không thấy dữ liệu, kiểm tra lại tháng/năm, bộ lọc ngày và bộ lọc nhân viên.",
    ],
    action: { label: "Mở lịch sử giờ công", path: "/lich-su" },
  },
  {
    id: "backup",
    title: "Sao lưu & khôi phục",
    description:
      "Dữ liệu nằm trong trình duyệt. Nên tải file sao lưu sau mỗi kỳ quan trọng.",
    icon: DatabaseBackup,
    steps: [
      {
        title: "Xuất toàn bộ dữ liệu",
        text: "Vào Cài đặt & sao lưu → Xuất bản sao lưu → Toàn bộ dữ liệu → Xuất JSON. Cất file ở nơi an toàn. File được mã hóa bằng mật khẩu lúc xuất.",
      },
      {
        title: "Xuất dữ liệu một tháng",
        text: "Chọn tháng tại mục Dữ liệu từng tháng rồi bấm Xuất tháng. Nếu lần tính lương theo tuần vượt tháng, file kèm cả các ca nguồn liên quan để giữ đúng kết quả.",
      },
      {
        title: "Khôi phục từ JSON",
        text: "Chọn file JSON. Với file mã hóa, nhập mật khẩu của bản sao lưu. Kiểm tra nội dung xem trước rồi xác nhận. Có thể khôi phục ngay tại trang đăng nhập khi đổi thiết bị.",
      },
      {
        title: "Dùng CSV hoặc bản in để đối chiếu",
        text: "CSV tổng hợp/chi tiết mở được bằng Excel. CSV và bản in là báo cáo, không thay thế bản sao lưu JSON để khôi phục ứng dụng.",
      },
    ],
    notes: [
      "Khôi phục sẽ thay thế toàn bộ dữ liệu hiện tại, kể cả khi file chỉ chứa một tháng; không tự gộp. Hãy sao lưu đầy đủ trước khi nhập.",
      "Xóa dữ liệu trình duyệt, dùng ẩn danh hoặc đổi thiết bị/tên miền/cổng có thể khiến bạn không thấy dữ liệu cũ.",
      "Backup cũ vẫn cần mật khẩu cũ, kể cả sau khi đã đổi mật khẩu đăng nhập.",
    ],
    action: { label: "Mở cài đặt & sao lưu", path: "/cai-dat" },
  },
  {
    id: "account",
    title: "Tài khoản & bảo mật",
    description:
      "Tự tạo tài khoản trên trình duyệt này và giữ kỹ mật khẩu của bạn.",
    icon: LockKeyhole,
    steps: [
      {
        title: "Đăng nhập",
        text: "Lần đầu bạn tự tạo tên đăng nhập và mật khẩu ít nhất 12 ký tự, không có tài khoản mặc định. Những lần sau dùng thông tin đã tạo.",
      },
      {
        title: "Khóa hoặc đăng xuất",
        text: "Bấm biểu tượng đăng xuất ở góc trên bên phải hoặc Khóa ngay trong Cài đặt. Tải lại trang hoặc không hoạt động 15 phút sẽ cần đăng nhập lại.",
      },
      {
        title: "Đổi thông tin đăng nhập",
        text: "Vào Cài đặt & sao lưu → Bảo mật & đăng nhập → Đổi thông tin đăng nhập. Nhập mật khẩu hiện tại, thông tin mới rồi lưu. Ứng dụng sẽ yêu cầu đăng nhập lại.",
      },
      {
        title: "Đổi giao diện sáng/tối",
        text: "Bấm mặt trăng/mặt trời ở thanh trên hoặc chọn giao diện trong Cài đặt. Chờ lưu xong trước khi tải lại trang.",
      },
    ],
    notes: [
      "Không có chức năng lấy lại mật khẩu. Quên mật khẩu có thể không mở được dữ liệu nếu thiếu bản sao lưu truy cập được.",
      "Khi dữ liệu đổi ở tab khác, phiên hiện tại sẽ khóa để tránh ghi đè. Đăng nhập lại để xem bản mới.",
    ],
    action: { label: "Mở cài đặt tài khoản", path: "/cai-dat" },
  },
  {
    id: "faq",
    title: "Câu hỏi thường gặp",
    description: "Các tình huống dễ gặp và cách xử lý nhanh.",
    icon: CircleHelp,
    steps: [],
    faqs: [
      {
        question: "Nút Tính lương nằm ở đâu?",
        answer:
          "Vào Tổng hợp giờ công, chọn kỳ cần tính. Ở dòng mỗi nhân viên có nút Tính lương cạnh Chi tiết; trên điện thoại nút nằm cuối thẻ.",
      },
      {
        question: "Vì sao nút tính lương bị khóa?",
        answer:
          "Nếu hiện Đã tính lương, toàn bộ công đang xem đã được xác nhận. Chọn Xem kết quả để xem lại. Nếu chưa có giờ công thì cần chấm công trước. Khi có ca mới chưa tính, nút sẽ cho tính riêng phần mới.",
      },
      {
        question: "04:00 đến 08:00 nghỉ nửa tiếng tính thế nào?",
        answer:
          "Bật Có nghỉ trưa / nghỉ giữa ca, nhập 0,5 giờ. Kết quả tự động là 3 giờ 30 phút. Không nghỉ thì để tắt ô nghỉ và kết quả là 4 giờ.",
      },
      {
        question: "Vì sao không thấy nhân viên trong ô chấm công?",
        answer:
          "Kiểm tra hồ sơ: nhân viên phải đang làm việc và chưa bị lưu trữ. Nếu đã lưu trữ, bấm Khôi phục ở cuối trang Nhân viên.",
      },
      {
        question: "Vì sao tôi mở lại mà không thấy dữ liệu?",
        answer:
          "Kiểm tra đã dùng đúng trình duyệt, hồ sơ, tên miền và cổng trước đây chưa; chọn lại đúng tháng/năm và bỏ bộ lọc. Nếu đổi thiết bị hoặc đã xóa dữ liệu trình duyệt, hãy khôi phục từ bản sao lưu JSON.",
      },
      {
        question: "Tôi có thể sửa ca đã tính lương không?",
        answer:
          "Không. Ca đã xác nhận được khóa để kết quả không bị thay đổi. Bạn vẫn có thể tạo ca mới và tính riêng phần công mới.",
      },
      {
        question: "Vì sao chưa được chấm công tháng mới?",
        answer:
          "Còn giờ công của tháng trước chưa tính lương. Hệ thống chặn chung cho tất cả nhân viên, kể cả người đã được tính xong. Bấm Tính lương tháng… trên thông báo để mở đúng tháng, tính hết các người còn thiếu; hệ thống tự mở lại chấm công tháng mới. Tháng không có giờ công không cần tính lương.",
      },
      {
        question: "Bấm Lưu mà chưa thấy thay đổi thì làm gì?",
        answer:
          "Chờ thông báo lưu thành công. Nếu báo hết dung lượng hoặc bị chặn lưu trữ, dữ liệu cũ vẫn được giữ; chưa nên đóng trang. Kiểm tra quyền lưu trữ và xuất bản sao lưu trước khi xử lý dữ liệu trình duyệt.",
      },
      {
        question: "Quên mật khẩu có lấy lại được không?",
        answer:
          "Ứng dụng không có chức năng lấy lại mật khẩu vì dữ liệu được mã hóa. Cần mật khẩu đúng hoặc một bản sao lưu có thể mở được. Đừng xóa dữ liệu gốc khi chưa có bản sao lưu.",
      },
    ],
  },
];
export const topicForPath = (path: string): GuideTopicId =>
  (({
    "/dang-nhap": "account",
    "/nhan-vien": "employees",
    "/cham-cong": "attendance",
    "/tong-hop": "wages",
    "/lich-su": "history",
    "/cai-dat": "backup",
  })[path] as GuideTopicId | undefined) ?? "start";
export function searchGuide(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
