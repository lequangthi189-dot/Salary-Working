# Architecture

## Cấu trúc thư mục

```
src/
  main.jsx                  # entry: mount <App/> trong LanguageProvider > CurrencyProvider > AuthProvider
  App.jsx                   # root: gating (loading/recovery/login/gate hồ sơ) + ráp mọi controller + layout
  styles.css, styles/themes.css
  auth/
    AuthProvider.jsx        # React context session Supabase (+ recovery, switchAccount)
    LoginForm.jsx           # đăng nhập / đăng ký
    ResetPasswordForm.jsx   # đặt lại mật khẩu (sau link email PASSWORD_RECOVERY)
  models/                   # TẦNG DỮ LIỆU: chỉ đọc/ghi Supabase, trả { data, error } thô
    shiftsModel.js  profileModel.js  payrollsModel.js
    deductionsModel.js  extraIncomeModel.js  chatMessagesModel.js
  controllers/              # TẦNG STATE: custom hooks giữ state + thao tác; view gọi hook, không đụng Supabase
    useShifts.js  useProfile.js  usePayrolls.js  useDeductions.js  useExtraIncome.js
  lib/                      # HÀM THUẦN + tiện ích (không phụ thuộc React trừ *.jsx context)
    shiftMath.js            # tách giờ ngày/đêm O(1), computeEffective, formatMoney/Hours…
    rates.js                # đơn giá theo người (setRates + getters) + cửa sổ đêm
    shiftRules.js           # overlap, kỳ đã chốt, phân loại ca nhập, ca hiển thị
    payPeriod.js            # kỳ lương cấu hình được (setPayPeriod, payPeriodKeyOf…)
    scheduleExtract.js      # đọc ảnh (readImage thu nhỏ) + gọi Edge extract-schedule + map/reconcile
    reconcileDates.js       # suy ngày đầy đủ từ số-ngày-trần + mốc tháng (đối chiếu công)
    ocrCrosscheck.js        # lớp OCR Tesseract đối chiếu giá trị Gemini (lazy)
    i18n.jsx                # LanguageProvider + translate (mặc định 'en')
    currency.jsx            # CurrencyProvider: tỉ giá VND→ngoại tệ qua Edge fx-rate
    theme.js, appearance.js # theme + cỡ chữ (áp trước render, lưu localStorage)
    accounts.js, avatar.js, name.js, changelog.js
    useTrickleProgress.js, useDoneHold.js   # hook UI cho tiến độ đọc ảnh
  components/               # TẦNG VIEW (xem "Vai trò component" bên dưới)
supabase/
  schema.sql                # DDL + RLS mọi bảng
  cleanup_2026-07_drop_unused_columns.sql   # dọn cột chết (chạy 1 lần)
  functions/                # Edge Functions (Deno thuần, không cần Docker bundling)
    extract-schedule/       # Gemini vision đọc ảnh lịch/bảng công theo nhân viên
    salary-chat/            # Gemini trợ lý lương (chỉ diễn đạt; số liệu client tính sẵn)
    fx-rate/                # tỉ giá VND→GBP/USD/AUD (open.er-api.com)
```

## Luồng dữ liệu (tầng)

`components (view)` → gọi hàm của `controllers (hooks)` → gọi `models` → Supabase.
Mọi số liệu lương tính lại ở client bằng `lib/shiftMath.js` từ dữ liệu thô — **DB
KHÔNG lưu giá trị dẫn xuất** (giờ, lương). Đơn giá nạp từ hồ sơ vào `rates.js` qua
`setRates()` (trong `useProfile`) nên mọi phép tính dùng đúng đơn giá của user.

1. `main.jsx` bọc `App` trong Language → Currency → Auth provider.
2. `AuthProvider` đọc session + lắng nghe `onAuthStateChange`; `App` gating theo
   `loading`/`session`/`recovery`/hồ sơ.
3. `App` gọi các controller (`useShifts(session)`…); mỗi hook tự tải khi `session`
   đổi user, giữ `loading` cho skeleton (chỉ lần tải đầu).
4. CRUD: hook gọi model rồi **reload từ server** (add/update/import) để mảng nguồn
   luôn khớp DB; delete thì patch local (optimistic). Hàm trả `null` khi OK hoặc
   chuỗi lỗi để view hiển thị.
5. Ca có `scheduled_*` → lương tính bằng `computeEffective` (kẹp theo lịch). Xem
   `pay_logic.md`.

## Vai trò component chính

- **Nhập & xem ca**: `ShiftForm` (thêm ca, preview realtime), `Timesheet` +
  `ShiftCard` (danh sách gom theo ngày, lọc ngày/đêm), `TimesheetTable` (bảng kiểu Excel).
- **Thống kê & kỳ lương**: `MonthStats`+`StatCard`, `PayPeriodPage`/`PayPeriodPanel`/
  `PayPeriodModal` (donut SVG tự vẽ), `CompensationModal`/`DeductionsCard` (khoản trừ),
  `ExtraIncomeModal` (thu nhập việc ngoài, tách khỏi lương ca).
- **Đọc ảnh AI**: `ScheduleImportModal` (nhập lịch tuần → tạo ca), `ReconcileModal`
  (đối chiếu công tuần/nhiều-tuần/kỳ), `ManualScheduleModal` (nhập tay). Dùng chung
  `scheduleExtract` + lớp OCR `ocrCrosscheck` (đối chiếu song song, chỉ cảnh báo).
- **Trợ lý lương**: `SalaryChat` (parse ý định bằng regex ở client trước — thêm ca /
  việc ngoài / tra cứu / mở công cụ / xét khả thi; chỉ fallback Gemini cho câu tự do),
  `FloatingChatButton`, `ChatMenu`.
- **Hồ sơ & tài khoản**: `EmployeeInfoForm` (gate bắt buộc sau đăng ký), `ProfileModal`
  (+ `JobInfoModal`, `ChangePasswordModal`, `AvatarUpload`), đa tài khoản (`accounts.js`).
- **Điều hướng & khung**: `NavBar` (dock kiểu macOS), `ToolsSheet`, các modal
  `ConfirmModal`/`WelcomeGuide`/`WhatsNewModal`/`PaydayPrompt`/`SalaryReminderModal`,
  UI dùng chung `TimeInput`/`Checkbox`/`ProgressButton`/`Skeleton`/`Loader`.
- **Đa ngôn ngữ / tiền tệ / giao diện**: i18n 4 ngôn ngữ (vi/en/us/au; en/us/au dùng
  chung từ điển `en`, khác nhau ở tiền tệ), 3 theme, 3 cỡ chữ.

## Nguyên tắc thiết kế

- **Tách tầng**: model (I/O) ⟂ controller (state) ⟂ component (view) ⟂ lib (thuần).
  Component không gọi Supabase trực tiếp; tính toán không nằm trong component.
- **DB chỉ lưu dữ liệu thô** (thời gian) → tránh lệch khi đổi đơn giá.
- **Bảo mật ở tầng database** qua RLS (`auth.uid() = user_id`), không ở client.
- **Bí mật ở server**: khoá Gemini nằm trong Edge Functions, không lộ ra frontend.

Xem thêm: `pay_logic.md` (tính toán), `state_management.md` (state & CRUD), `data_model.md` (DB).
