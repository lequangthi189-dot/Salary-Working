# State Management

Không dùng Redux/Zustand. State = React hooks cục bộ + vài Context (auth, i18n,
currency). Dữ liệu nghiệp vụ gom trong các **controller hook** (`src/controllers/*`),
KHÔNG còn nằm rải trong `App.jsx` như bản đầu.

## Context

- **AuthProvider** (`src/auth/AuthProvider.jsx`) — `{ session, loading, signOut,
  recovery, endRecovery, switchAccount }`. Mount: `getSession()` (đặt `loading=false`
  khi xong) + `onAuthStateChange` (cập nhật session realtime, bắt `PASSWORD_RECOVERY`
  → hiện `ResetPasswordForm`, ghi nhớ tài khoản để chuyển nhanh). Hook `useAuth()`.
- **LanguageProvider** (`lib/i18n.jsx`) — `{ lang, setLang, t }`; đồng thời giữ
  `currentLang` cấp module để hàm thuần (`payPeriodLabel`, `formatLost`, `formatMoney`)
  dịch được. Mặc định `'en'`; lưu localStorage.
- **CurrencyProvider** (`lib/currency.jsx`) — nạp tỉ giá qua Edge `fx-rate` (cache
  24h + fallback), phát `updatedAt`.

## Controller hooks (nguồn sự thật cho dữ liệu)

Mỗi hook: `useState` danh sách + `loading` (chỉ true tới khi tải ĐẦU xong, dùng cho
skeleton; reload sau chạy nền), `loadedFor` (ref) để chỉ bật skeleton khi ĐỔI user.

- **useShifts(session)** → `{ shifts, loading, loadError, setLoadError, addShift,
  updateShift, deleteShift, importWeekShifts }`.
  - `addShift`: chặn kỳ đã chốt (`periodClosedError`) + chồng giờ (`overlapError`);
    nếu ngày đã có ca LỊCH DỰ KIẾN (chưa check-in) thì "hiện thực hoá" chính ca đó
    (ghi giờ thực) thay vì chèn ca thứ hai. Reload sau khi ghi.
  - `importWeekShifts(rows)`: dựng ca dự kiến, `partitionImportShifts` bỏ ca trùng,
    insert BATCH (1 request) → `{ created, skipped, errors }`.
  - `deleteShift`: patch local (optimistic), không reload.
- **useProfile(session)** → hồ sơ + `loading` + `savePayday`/`saveEmployeeInfo`/
  `saveProfileFields` + `profileComplete` + nhắc đặt payday. `reload` **áp đơn giá**
  (`setRates`) và **kỳ lương** (`setPayPeriod`) từ hồ sơ vào lib.
- **usePayrolls / useDeductions / useExtraIncome** → CRUD tương ứng; nhận `onError`
  (thường là `setLoadError` của App) để báo lỗi nền.

Quy ước lỗi: hàm async trả `null` khi OK, hoặc `string` thông điệp để component hiển
thị. Sau add/update/import → **reload** từ server; sau delete → cập nhật local.

## App.jsx — gating & ráp view

Thứ tự gate (return sớm): `loading` (auth) → `recovery` → `!session` (login) →
`addingAccount` → gate hồ sơ chưa đủ (`profile && !profileComplete` →
`EmployeeInfoForm`) → app chính. Dữ liệu suy ra đắt (`monthStats`, `allStats`,
`schedByDate`, `chatSnapshot`) được `useMemo` (deps gồm `profile` vì đơn giá phụ
thuộc hồ sơ). `flash` = thông báo tạm (tạo ca cả tuần…) tự ẩn sau 5s.

## Kỳ lương & nhận lương

- `pendingPeriodKey(shifts, payrolls)`: kỳ đã kết thúc gần nhất mà CHƯA có dòng
  `payrolls` = "đang chờ nhận".
- Nút **"Đã nhận lương"** → `markReceived(pendingKey, hôm nay)` (upsert `payrolls`).
  Chỉ kỳ đã nhận mới hiện ở `PayPeriodPanel`.
- **Nhắc nhận lương** (`SalaryReminderModal`): khi đã đặt `payday`, có kỳ chờ, và
  hôm nay ≥ ngày nhận. "Chưa nhận" chỉ tắt trong phiên; "Đã nhận" → `receiveSalary()`.

## Bộ nhớ chatbot (2 mức)

- Mức 2 (lưu/hiển thị): `chat_messages` nạp `MAX_HISTORY_LOAD` tin gần nhất khi mở.
- Mức 1 (ngữ cảnh gửi AI): cửa sổ trượt `MAX_HISTORY_SEND` tin; server còn chốt lại
  bằng `WINDOW_TURNS`. Tin chỉ-UI (menu/bảng/thẻ xác nhận) không lưu.

## Nguyên tắc

- Không cache kết quả tính lương vào state; luôn tính từ thời gian thô khi render
  (xem `pay_logic.md`).
- Skeleton chỉ ở lần tải ĐẦU; gộp các nguồn loading để tránh hiện số tạm rồi nhảy.
