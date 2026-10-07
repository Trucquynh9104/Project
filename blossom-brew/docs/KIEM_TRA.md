# Kết quả kiểm tra — 07/10/2026

| Nhóm | Kết quả |
| --- | --- |
| API nghiệp vụ và quyền truy cập | 72 kiểm tra qua: xác thực, vai trò/ownership, tính tiền, voucher, điểm, hoàn tất/hủy, review, hỗ trợ, thông báo, mật khẩu/OTP, session và ảnh. |
| Đăng nhập trên giao diện | 59 kiểm tra qua cho Customer/Cashier/Admin, gồm cookie bị chặn, phản hồi Guest đến muộn, nhập sai rồi thử lại, logout và chuyển đúng workspace. |
| Render, điều hướng và role | 368 kiểm tra qua trên 34 route × 4 role và các link nội bộ. |
| Luồng liên thông và form thực tế | 52 kiểm tra qua: Admin tạo món chọn size → Guest xem → Customer checkout pending/failed/retry, voucher dùng một lần, điểm sau hoàn tất, review theo sản phẩm, POS/shift, hỗ trợ và thông báo. |
| Dữ liệu cục bộ | SQLite giữ đơn và phiên sau khi đóng/mở lại; không phụ thuộc dữ liệu trình duyệt để lưu nghiệp vụ. |
| Build | Client Vite + Worker ESM hoàn tất. |
| Bản đóng gói | 4 route trực tiếp trả SPA; script/photo trả đúng MIME; HTML không bị giữ cache cũ. |
| Máy chủ chạy local | 4 route HTTP cùng đăng nhập và khôi phục phiên qua HTTP kiểm tra thành công trên bản build. |

Giao diện được kiểm tra bằng component được mount trong DOM cùng Router và API thật. Môi trường không có browser QA được hỗ trợ nên chưa kiểm tra trực quan bằng Chrome; layout, màu/font, nội dung và responsive được giữ từ prototype và chỉ thêm các thành phần phục vụ trạng thái nghiệp vụ mới.

Các kiểm tra chạy trên dữ liệu tách riêng, không tạo đơn, đổi điểm hoặc chỉnh dữ liệu của bản website riêng tư đang dùng.

Lệnh tái chạy nằm trong README. Thanh toán/hoàn tiền/OTP là mô phỏng như phạm vi BRD.
