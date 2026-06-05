# State Management

Không dùng Redux/Zustand. State chỉ gồm React hooks cục bộ + một Context cho auth.

## Auth session — `src/auth/AuthProvider.jsx`

- `AuthContext` giữ `{ session, loading, signOut }`.
- Khi mount: gọi `supabase.auth.getSession()` (đặt `loading=false` sau khi xong) và đăng ký `onAuthStateChange` để cập nhật `session` realtime. Hủy subscription khi unmount.
- Truy cập qua hook `useAuth()`.
- `App` dùng `loading`/`session` để gate: `loading` → màn "Loading…"; không có `session` → `LoginForm`; có → app chính.

## Danh sách ca — `src/App.jsx`

State nguồn sự thật: `shifts` (mảng) + `loadError`.

- `loadShifts()` (useCallback): `select('*')` sắp xếp `work_date` desc rồi `created_at` desc. Chạy lại mỗi khi `session` đổi.
- `handleAdd(shift)`: insert kèm `user_id`, rồi `loadShifts()`. Trả về `null` nếu OK hoặc chuỗi lỗi.
- `handleUpdate(id, fields)`: update theo `id`, rồi `loadShifts()`. Trả về `null`/lỗi.
- `handleDelete(id)`: delete theo `id`; **optimistic** — lọc bỏ khỏi state ngay thay vì reload.

Quy ước trả lỗi: các handler async trả `null` khi thành công, hoặc `string` thông điệp lỗi để component con hiển thị. Giữ nguyên quy ước này khi thêm thao tác mới.

## Form & card

- `ShiftForm.jsx`: state cục bộ `workDate/startTime/endTime/busy/error`. Tính `preview = computeShift(...)` mỗi lần render để hiển thị giờ & lương trực tiếp. Mặc định ngày = hôm nay (`todayStr()` qua `toISOString().slice(0,10)`).
- `ShiftCard.jsx`: tự quản chế độ `editing`. Khi sửa, giữ bản nháp `workDate/start/end`; `cancel()` khôi phục từ prop `shift`; `save()` gọi `onUpdate`. Hiển thị cờ `(+1d)` khi `end <= start` (qua nửa đêm).
- `Timesheet.jsx`: stateless. Gom ca theo `work_date` (giữ thứ tự desc đầu vào), tính tổng từng nhóm và tổng lớn bằng `shiftTotals()` (cộng dồn `computeShift`).

## Kỳ lương & nhận lương — `src/App.jsx`

- `profile` (gồm `payday`, `full_name`) và `payrolls` được load cùng `shifts` khi `session` đổi.
- `pendingPeriodKey(shifts, payrolls)`: kỳ ĐÃ kết thúc (qua 25) gần nhất mà CHƯA có dòng `payrolls` → "kỳ đang chờ nhận".
- Nút **"Đã nhận lương"** (cạnh "Add shift") gọi `receiveSalary()` → `markReceived(pendingKey, hôm nay)` (upsert `payrolls`). **Chỉ khi đã nhận** thì kỳ mới hiện trong thanh bên `PayPeriodPanel` (panel lọc theo `payrolls`).
- **Nhắc nhận lương** (`SalaryReminderModal`): hiện khi đã đặt `payday`, có kỳ đang chờ, và hôm nay ≥ ngày `payday` của tháng trả lương. "Chưa nhận" chỉ tắt trong phiên (`reminderDismissed`, reset khi reload → hỏi lại lần đăng nhập sau); "Đã nhận" → `receiveSalary()`.
- `savePayday` dùng **upsert** `profiles{ id, payday }` (lưu được kể cả khi dòng profile chưa tồn tại). `PaydayPrompt` hỏi lần đầu khi `payday` null (bỏ qua lưu cờ `localStorage`).

## Nguyên tắc

- Sau insert/update: **reload** từ server (đảm bảo đồng bộ thứ tự + dữ liệu chuẩn). Sau delete: cập nhật optimistic.
- Không cache kết quả tính lương vào state; luôn tính từ thời gian thô khi render. Xem `pay_logic.md`.
