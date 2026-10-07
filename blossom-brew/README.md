# Blossom Brew — Bộ mã nguồn đầy đủ

Website đặt món và POS dành cho Guest, Customer, Cashier và Admin. Giữ giao diện nâu–be–trắng, font Playfair Display/Poppins, size S/M/L được Admin chọn, ghi chú món không bắt buộc, chi tiết món chỉ đọc và phân trang gọn.

## Chạy trên VS Code

Cài **Node.js 24 trở lên**. Giải nén, mở nguyên thư mục `blossom-brew` trong VS Code và chạy:

```bash
npm ci
npm run dev
```

Mở **http://localhost:5173**. Lệnh `dev` chạy cả giao diện và API; không cần cấu hình Supabase hay Cloudflare để dùng bản cục bộ. Dùng nguyên bộ file trong thư mục giải nén để các màn và API cùng phiên bản. Nếu phiên dev cũ đang chạy, dừng bằng Ctrl+C trước khi chạy bộ mới.

Dữ liệu và ảnh được lưu tại `.blossom/`, tồn tại sau khi đóng/mở ứng dụng. Thư mục này không được đưa vào Git hoặc gói source. Bản trên máy cá nhân dùng dữ liệu riêng; bản website riêng tư dùng dữ liệu D1/R2 của Sites.

Để kiểm tra bản build:

```bash
npm run build
npm run preview
```

Mở **http://localhost:4173**. Các link trực tiếp như `/admin/products` vẫn được xử lý đúng.

## Tài khoản mẫu

| Role     | Email                   | Mật khẩu    | Màn sau đăng nhập    |
| -------- | ----------------------- | ----------- | -------------------- |
| Customer | customer@blossombrew.vn | Customer123 | `/customer`          |
| Cashier  | cashier@blossombrew.vn  | Cashier123  | `/cashier` (POS)     |
| Admin    | admin@blossombrew.vn    | Admin123    | `/admin` (Dashboard) |

Customer mẫu có 60 điểm để thử chương trình thành viên. Guest không cần tài khoản. Đăng ký mới tạo Customer và mở workspace Customer theo prototype hiện tại.

## Luồng và phạm vi

| Role     | Chức năng                                                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest    | Xem/tìm/lọc menu đang bán, chi tiết món chỉ đọc, đăng ký, đăng nhập, OTP mô phỏng và thông báo dành cho Guest.                                                                                                                              |
| Customer | Chọn size/đường/đá/topping, giỏ hàng, nhận tại quán, thanh toán QR/thẻ/ví mô phỏng, thanh toán lại đơn chưa trả tiền, lịch sử, điểm/voucher, đánh giá từng món của đơn hoàn tất, yêu cầu hỗ trợ và hồ sơ.                                   |
| Cashier  | Tra cứu thành viên/áp dụng voucher, POS khi ca đang mở, xử lý đơn đã thanh toán tại cửa hàng, hóa đơn/in, mở/đóng ca và đối soát tiền mặt, thông báo, hồ sơ. Việc thêm/điều chỉnh thành viên thuộc Admin.                                   |
| Admin    | Dashboard, CRUD menu/SML, voucher và trạng thái, toàn bộ đơn, thêm thành viên/điều chỉnh điểm, CRUD/kích hoạt/tạm ngưng Cashier, ca làm việc, đánh giá/phản hồi, yêu cầu hỗ trợ, thông báo theo role và lịch sử đã gửi, báo cáo/CSV, hồ sơ. |

Các màn Admin được đối chiếu với BRD-01, SRS-01, UC-01 ngày 25/09/2026 và các sửa đổi prototype đã chấp nhận sau đó. Xem `docs/DOI_CHIEU_NGHIEP_VU.md` để tra phạm vi, quy tắc và những lỗi đã sửa.

## Quy tắc nghiệp vụ

- Đơn online chỉ nhận tại quán. Mỗi đơn có ít nhất một món và phương thức thanh toán.
- Order: Chờ xác nhận → Chờ pha → Đang pha → Hoàn tất. Có thể hủy trước trạng thái cuối khi có lý do. Đơn cuối không quay lại trạng thái trước.
- Payment: Chờ thanh toán / Thất bại / Đã thanh toán. Đơn chờ hoặc thất bại được giữ lại để Customer thử lại; không được đưa vào pha, cộng điểm hoặc tiêu thụ voucher. Thanh toán lại cùng đơn không tạo bản sao.
- Máy chủ tính lại giá size/topping, tổng tiền và voucher. Nếu tổng tiền thay đổi trước khi xác nhận trả tiền, Customer phải xem tổng mới và xác nhận lại.
- Voucher: còn hiệu lực theo giờ Việt Nam, đang bật, chưa dùng/hết lượt, đúng người và đúng giá trị tối thiểu; một voucher cho mỗi đơn. Mã hỗ trợ chữ/số/gạch ngang/gạch dưới như form Admin.
- Hoàn tất cộng `floor(tổng sau giảm / 20.000)` điểm đúng một lần. Member <50, Silver 50–100, Gold >100. Đổi từ 10 điểm, mỗi điểm đổi 1.000đ, voucher cá nhân có hạn 30 ngày. Đơn hủy không cộng điểm và trả lại voucher đã dùng.
- Đánh giá: đúng Customer, đúng sản phẩm trong đơn đã hoàn tất, 1–5 sao, tối đa 500 ký tự; một đánh giá cho mỗi sản phẩm trong mỗi đơn.
- Cashier chỉ xử lý đơn của cửa hàng được phân công. Mở ca và đóng ca dùng thời gian do máy chủ ghi nhận. Tiền mặt được ghi nhận tại thời điểm đã thu, gồm đơn đang pha; hoàn tiền mô phỏng được trừ khi đối soát.
- Yêu cầu hỗ trợ có trạng thái To do / In-progress / Done / Cancelled. Khách xác nhận trước khi gửi và không thu hồi; Admin xử lý/phản hồi.
- Quyền được kiểm tra tại API, không phụ thuộc việc ẩn nút trên giao diện. Mật khẩu được băm PBKDF2 có salt; phiên được xác minh trong database, thu hồi khi đăng xuất và không cho tài khoản tạm ngưng thao tác.

## Kiểm tra

```bash
npm test
npm run build
node scripts/verify-artifact.mjs
node scripts/verify-local-http.mjs
```

Bộ kiểm tra gồm API và phân quyền, đăng nhập ở giao diện có phản hồi chậm/cookie bị chặn, render/điều hướng 34 route, thao tác form Admin/checkout, liên thông đơn–voucher–điểm–đánh giá–ca–hỗ trợ–thông báo và dữ liệu SQLite sau khi mở lại ứng dụng.

## Cấu trúc

- `src/pages/`: màn hình của 4 role; `src/components/`: layout, dialog, hóa đơn, phân trang.
- `src/services/`: dữ liệu API, phiên, các hook cập nhật dữ liệu, menu/đơn/voucher/thông báo.
- `shared/businessRules.js`: quy tắc trạng thái, hạng, voucher và đối soát dùng chung cho giao diện/API.
- `server/worker.js`: API có phân quyền dùng trên Sites và local; `server/local-runtime.mjs`/`http.mjs`: database/ảnh/máy chủ local.
- `db/schema.ts` và `drizzle/`: schema/migration D1; `scripts/`: chạy, build và kiểm tra.
- `docs/`: đối chiếu nghiệp vụ và kết quả kiểm tra.

## Bản website riêng tư

Bản Sites sử dụng D1 cho dữ liệu và R2 cho ảnh, giữ quyền truy cập chỉ của chủ tài khoản. Không đổi sang công khai nếu chưa được bạn xác nhận.

Thanh toán, hoàn tiền và OTP/email đều **mô phỏng**; QR chỉ là hình minh họa, không dùng để chuyển khoản thật. Không có giao hàng, quản lý kho hoặc tích hợp cổng thanh toán thật trong phạm vi này. Không cần nhập thẻ hoặc thông tin ngân hàng thật.
