# Architecture

## Cấu trúc thư mục

```
src/
  main.jsx                  # entry point: mount <App/> trong <AuthProvider/>
  App.jsx                   # root component, gating đăng nhập + CRUD ca
  styles.css                # toàn bộ CSS (thuần, không framework)
  auth/
    AuthProvider.jsx        # React context cho session Supabase
    LoginForm.jsx           # form đăng nhập/đăng ký
  components/
    ShiftForm.jsx           # form tạo ca mới + preview tính lương realtime
    Timesheet.jsx           # danh sách ca, gom nhóm theo ngày + tổng cộng
    ShiftCard.jsx           # 1 dòng ca: hiển thị / sửa inline / xoá
  lib/
    rates.js                # hằng số đơn giá + cửa sổ đêm
    shiftMath.js            # logic tính giờ & lương (pure functions)
    shiftMath.test.js       # unit test cho shiftMath
    supabase.js             # khởi tạo Supabase client từ env
supabase/
  schema.sql                # DDL bảng shifts + RLS policies
```

## Luồng dữ liệu

1. `main.jsx` bọc `App` trong `AuthProvider`.
2. `AuthProvider` đọc session từ Supabase và lắng nghe `onAuthStateChange`. Nếu chưa đăng nhập, `App` render `LoginForm`.
3. Sau khi đăng nhập, `App` gọi `loadShifts()` → `supabase.from('shifts').select('*')` (RLS tự lọc theo user).
4. State `shifts` được truyền xuống `Timesheet`; `ShiftForm` gọi `onAdd` để insert.
5. Mọi component hiển thị số liệu đều gọi `computeShift()` từ `lib/shiftMath.js` — **không có giá trị tính sẵn lưu trong DB**. DB chỉ lưu `work_date`, `start_time`, `end_time`; giờ và lương luôn được tính lại ở client.

## Nguyên tắc thiết kế

- **Tính toán là pure & tập trung**: tất cả ở `shiftMath.js`/`rates.js`. Component không tự tính lương.
- **DB chỉ lưu dữ liệu thô** (thời gian), không lưu kết quả dẫn xuất → tránh dữ liệu lệch khi đổi đơn giá.
- **Bảo mật ở tầng database** qua RLS, không ở client. Xem `data_model.md`.
- Không có lớp service/API trung gian; component gọi thẳng `supabase` client.

Xem thêm: `pay_logic.md` (chi tiết tính toán), `state_management.md` (state & CRUD), `data_model.md` (DB).
