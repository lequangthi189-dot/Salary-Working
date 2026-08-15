# Verify SalaryWorking (chạy app thật)

Công thức đã dùng thành công để verify các luồng đọc ảnh lịch/đối chiếu công
bằng app thật (Chrome headless), không cần tài khoản của người dùng.

## Chạy app

```bash
npm run dev   # cần .env.local; nếu 5173 bận Vite tự nhảy 5174 — ĐỌC KỸ log để lấy đúng port
```

## Tài khoản test (không đụng dữ liệu thật — RLS cô lập theo user)

- Supabase CLI đã đăng nhập sẵn, project linked = "Salary Working"
  (`supabase projects list` → ref khớp `VITE_SUPABASE_URL` trong `.env.local`).
- Tạo user xác nhận sẵn (không gửi email) qua GoTrue Admin API, service_role key
  lấy bằng `supabase projects api-keys --project-ref <ref> -o json` (đừng in key
  ra stdout): `POST {URL}/auth/v1/admin/users` body
  `{ email, password, email_confirm: true }`.
- Xoá sau khi xong: `DELETE {URL}/auth/v1/admin/users/{id}` — mọi bảng đều
  `on delete cascade` nên sạch hoàn toàn.

## Lái UI (Playwright, `channel: 'chrome'` — máy này có Chrome, không cần tải browser)

- Ngôn ngữ MẶC ĐỊNH là **English (UK)** → selector text phải khớp cả vi lẫn en
  (vd `/Nhập lịch tuần|Import weekly/`).
- Đăng nhập xong, user mới bị chặn bởi form thông tin NV (`.emp-card form`):
  4 input đầu = Họ, Tên, Mã NV, Lương 1 giờ → điền rồi submit.
- Overlay tự bật phải đóng: WelcomeGuide (`.welcome-start`), PaydayPrompt
  (nút `.account-btn` đầu = bỏ qua).
- Dock điều hướng ẨN tới khi cuộn: phát
  `window.dispatchEvent(new Event('scroll'))` rồi bấm
  `.dock` → `getByTitle(/Công cụ|Tools/)` → `.tool-tile` theo nhãn.
- ConfirmModal cảnh báo (nhầm doc_type…): card có `h2` chứa `⚠️`, nút tiếp tục
  là `.change-pw-btn` — nên có poller tự bấm khi hiện.
- Ảnh lịch/bảng công GIẢ: vẽ canvas trong page (bảng có dòng mã NV trùng
  employee_code của hồ sơ, header cột ghi SỐ NGÀY trần + tiêu đề "THANG MM/YYYY");
  thêm nhiễu ±7 mức xám để file >700KB nếu muốn kích hoạt đường thu nhỏ ảnh.
  Gemini đọc bảng vẽ này chính xác.
- Đo request tới Edge Function: `page.on('request')` lọc URL chứa
  `extract-schedule`, lấy `postDataJSON()` → `mediaType` + độ dài `image`.
- Gemini mất ~10–15s/ảnh; chờ bảng kết quả bằng
  `.import-table tbody tr` (nhập lịch) / `.reconcile-group` (đối chiếu),
  timeout ≥120s. OCR nền hiện `.ocr-note` rồi tự ẩn — không chặn.

## Gotcha

- Mỗi lượt "Đọc lịch" tốn 1 lượt quota Gemini (flash-lite) — đừng lặp vô ích.
- Tắt dev server của MÌNH thôi: kill đúng PID từ task nền, ĐỪNG kill mọi
  process `vite` (dễ trúng dev server đang chạy sẵn của chủ máy ở 5173).
