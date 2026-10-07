# Đối chiếu nghiệp vụ Blossom Brew

Baseline: Blossom_Brew_BRD.docx (BRD-01), Blossom_Brew_SRS.docx (SRS-01), Blossom_Brew_Use_Case_Specification.docx (UC-01), 25/09/2026; cập nhật SML, profile actions, typography/pagination và ngưỡng hạng từ prototype hiện hành. Các cập nhật cụ thể đã chấp nhận được giữ khi tài liệu draft dùng mô tả tổng quát.

| Màn Admin        | Liên hệ với role khác                    | Kết quả hoàn thiện                                                                                                                                                       |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard        | Đơn Customer/POS, điểm/voucher           | Tính theo dữ liệu chung; lượt voucher không tính đơn chưa thanh toán; cập nhật khi API trả dữ liệu mới.                                                                  |
| Menu             | Guest/Customer menu, Cashier POS         | Sửa lỗi thiếu import khi lưu; S/M/L chọn độc lập, giá nguyên dương cho mỗi size, tên tối đa 100 ký tự, ghi chú tùy chọn; bật/ẩn áp dụng tại API; popup chi tiết chỉ đọc. |
| Orders           | Customer checkout/history; Cashier xử lý | Phân biệt trạng thái đơn/thanh toán; đơn chưa trả tiền chỉ có thể hủy và không được pha; chuyển trạng thái hợp lệ, lý do hủy và cộng điểm một lần.                       |
| Members          | Customer điểm/hạng; Cashier tra cứu      | Admin thêm thành viên, xem hồ sơ/lịch sử/điểm; Cashier chỉ tra cứu và áp dụng ưu đãi; giữ Silver 50–100, Gold >100; tổng số cạnh phân trang.                             |
| Vouchers         | Customer cart/checkout/rewards; POS      | Dùng chung kiểm tra mã, ngày theo Việt Nam, hạn, lượt dùng, đối tượng, minimum/cap; thêm trạng thái chưa hiệu lực/hết lượt; tiêu thụ sau thanh toán thành công.          |
| Cashier accounts | Đăng nhập/quyền Cashier                  | Tạo/sửa/xóa/tạm ngưng; giữ giá trị kích hoạt khi tạo; email duy nhất, password được băm; không sửa role Customer/Admin từ màn này.                                       |
| Reports          | Đơn hoàn tất, thành viên/voucher         | Lọc ngày, revenue/orders/payment/product charts và CSV; bổ sung thành viên mới, hạng và sử dụng voucher; chỉ tính doanh thu từ đơn hoàn tất.                             |
| Notices          | Guest/Customer/Cashier nhận tin          | Tin nội bộ Admin, gửi đúng role, lưu lịch sử thông báo đã gửi và phân trang; không mở quyền công khai của website.                                                       |
| Shifts           | Cashier mở/đóng ca, POS                  | Máy chủ ghi thời gian/mã ca, ngăn mở đồng thời hoặc ghi đè ca đã đóng; Admin xem expected/actual/difference, bao gồm tiền đã thu từ đơn chưa hoàn tất.                   |
| Feedback         | Customer đánh giá món đã mua             | Mỗi sản phẩm trong đơn được đánh giá một lần; Admin xem đúng tên món/rating/comment và gửi phản hồi.                                                                     |
| Support          | Customer gửi và theo dõi yêu cầu         | To do/In-progress/Done/Cancelled; Customer xác nhận không thu hồi, Admin xử lý và phản hồi; các role khác không có quyền quản trị yêu cầu.                               |
| Profile          | Hồ sơ từng role                          | Tên/điện thoại/avatar, mật khẩu mask, đổi/quên mật khẩu và đăng xuất; ảnh lưu qua API, email đăng nhập giữ nguyên.                                                       |

## Các trạng thái và luồng đã bổ sung/sửa

1. Guest → đăng ký → Customer; xác thực đăng nhập mở đúng Customer, POS hoặc Dashboard. Không dựng lại form khi refresh, không để phản hồi Guest đến muộn xóa phiên, có trạng thái đang đăng nhập và lỗi tại form.
2. Customer → menu → giỏ → thông tin nhận tại quán → tạo đơn chờ thanh toán → dialog mô phỏng → thành công hoặc thất bại. Có thể trả tiền sau hoặc quay lại từ History; retry dùng cùng mã đơn.
3. Đơn đã thanh toán → Cashier/Admin nhận → Chờ pha → Đang pha → Hoàn tất → Customer nhận điểm → đánh giá từng món. Hủy trước trạng thái cuối yêu cầu lý do; voucher được hoàn lại khi đã tiêu thụ.
4. Admin cập nhật menu/voucher → Guest/Customer/POS đọc dữ liệu chung; kiểm tra lần cuối tại máy chủ ngăn chọn món tạm ẩn hoặc voucher hết lượt. Form lỗi/lưu thất bại giữ nội dung nhập.
5. Cashier mở ca với tiền đầu ca → POS → đóng ca với tiền thực tế → Admin xem đối soát. Việc đóng ca không bỏ qua tiền đã thu của đơn còn chờ pha.
6. Hồ sơ/hỗ trợ/thông báo/đánh giá dùng dữ liệu server; danh sách cập nhật khi server trả dữ liệu mới, không tự tạo dữ liệu mẫu từ frontend khi danh sách trống.

## Ranh giới

Một cửa hàng mẫu (`blossom-main`), 4 role, dữ liệu dùng chung có phân quyền; phiên bản tương tác kiểm thử nghiệp vụ. Thanh toán/hoàn tiền/OTP chỉ mô phỏng; không tích hợp ngân hàng, gửi email thật, giao hàng hoặc tồn kho. Chính sách điểm/hạng giữ nguyên cấu hình đã chốt; không thêm màn thay đổi chính sách để tránh sửa quy tắc hiện hành.

Các màn `/cashier/home` và `/admin/home` giữ để xem menu trong role; đăng nhập và logo workspace mở POS/Dashboard theo UC-02.
