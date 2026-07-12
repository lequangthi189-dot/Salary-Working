# Pay Logic

Nguồn: `src/lib/shiftMath.js`, hằng số `src/lib/rates.js`, test `src/lib/shiftMath.test.js`.

## Hằng số & đơn giá (rates.js)

| Tên | Giá trị | Ý nghĩa |
|-----|---------|---------|
| `DAY_RATE` | 25500 | VND/giờ, ca ngày — MẶC ĐỊNH/fallback |
| `NIGHT_RATE` | 33150 | VND/giờ, ca đêm — MẶC ĐỊNH/fallback |
| `NIGHT_START_HOUR` | 22 | mặc định đầu cửa sổ đêm (22:00) |
| `NIGHT_END_HOUR` | 6 | mặc định cuối cửa sổ đêm (06:00) |

**Đơn giá thật theo TỪNG NGƯỜI**: nạp từ hồ sơ qua `setRates()`, đọc qua
`getDayRate()/getNightRate()/getHolidayDayRate()/getHolidayNightRate()`. Các hằng
trên chỉ là fallback khi hồ sơ chưa cấu hình. Cửa sổ đêm cũng theo từng người
(`getNightStartMin()/getNightEndMin()`, mặc định 22:00–06:00, có thể vắt nửa đêm).
Mặc định: cửa sổ đêm `[22:00, 24:00) ∪ [00:00, 06:00)`; phần còn lại (`06:00–22:00`) là ngày.

## Thuật toán `computeShift(startTime, endTime)`

1. `parseTime("HH:MM")` → phút kể từ nửa đêm (`h*60 + m`).
2. Nếu `end <= start` → ca qua nửa đêm, cộng `end += 1440` (MINUTES_PER_DAY).
3. Tách phút ngày/đêm bằng công thức đóng **O(1)** `nightMinutesBefore(x)` (số phút đêm trong `[0, x)`), KHÔNG lặp từng phút. `splitRange(lo, hi) = nightMinutesBefore(hi) − nightMinutesBefore(lo)`. Cửa sổ đêm lấy theo hồ sơ; nếu hồ sơ đặt "không có ca đêm" thì `foldNight` gộp mọi phút thành phút ngày.
4. Trả về:
   - `decimalHours = totalMin / 60`
   - `dayHours = dayMin / 60`, `nightHours = nightMin / 60`
   - `pay = dayHours*getDayRate() + nightHours*getNightRate()` (bản lễ dùng `getHolidayDayRate()/getHolidayNightRate()` khi `isHoliday`)

Kết quả chính xác tới phút (vd ca `09:00–09:30` = 0.5h) mà không cần vòng lặp.

## Ví dụ biên (đã có test)

| Ca | decimalHours | day | night | Ghi chú |
|----|-------------|-----|-------|---------|
| 09:00–17:00 | 8 | 8 | 0 | ngày thuần |
| 23:00–05:00 | 6 | 0 | 6 | đêm thuần, qua nửa đêm |
| 22:00–06:00 | 8 | 0 | 8 | biên = 100% đêm |
| 06:00–22:00 | 16 | 16 | 0 | biên = 100% ngày |
| 16:00–02:00 | 10 | 6 | 4 | hỗn hợp, 16–22 ngày + 22–02 đêm |

Trường hợp `start === end`: vì `end <= start` nên cộng 1440 → ca tính tròn 24 giờ (UI cảnh báo "full 24h"). Đây là hành vi hiện tại, không phải bug.

## Lương theo lịch `computeEffective(scheduledStart, scheduledEnd, actualStart, actualEnd)`

Khi ca có **lịch (scheduled)**, **lịch quyết định lương**: chỉ trả cho **phần giao** giữa khung lịch và giờ chấm công thực tế. Đây là hàm dùng để tính lương/giờ ở mọi component (thay cho việc gọi `computeShift` trực tiếp khi có lịch).

Quy tắc kẹp:
- Vào **sớm** → kẹp lên giờ lịch bắt đầu (**không thưởng** thêm). Vd lịch 08:00, check-in 07:30 → vẫn tính từ 08:00.
- Vào **trễ** → mất phần đầu (`lateIn`). Vd lịch 08:00, check-in 09:00 → trả 7h, mất 1h.
- Ra **muộn** → kẹp xuống giờ lịch kết thúc (**không tăng ca**).
- Ra **sớm** → mất phần cuối (`earlyOut`).

Thuật toán:
1. Thiếu `scheduledStart`/`scheduledEnd` → fallback: lương = `computeShift(actualStart, actualEnd)` thô, `lost*` = 0.
2. Chuẩn hoá lịch: `sStart`, `sEnd`; nếu `sEnd <= sStart` cộng 1440.
3. Đưa giờ thực tế về cùng trục: `aStart = alignNear(actualStart, sStart)` (chọn biểu diễn trong ±12h quanh `sStart`, xử lý vào sớm/trễ & qua nửa đêm); `aEnd` cộng 1440 tới khi `> aStart`.
4. Cửa sổ **được trả** = `[effStart, effEnd)` với `effStart = clamp(aStart, sStart, sEnd)`, `effEnd = clamp(aEnd, sStart, sEnd)`. Tách ngày/đêm bằng `splitRange` (O(1)) → `dayHours`/`nightHours`/`pay`.
5. Giờ mất: `lateIn = splitRange(sStart, effStart)`, `earlyOut = splitRange(effEnd, sEnd)`; mỗi cái đã tách sẵn ngày/đêm.
6. Trả về: `{ decimalHours, dayHours, nightHours, pay }` (đã kẹp) + `{ lateIn, earlyOut, lostDayHours, lostNightHours, lostHours, lostPay }`.

`formatLost(result)` trả chuỗi tiếng Việt mô tả vào trễ/ra sớm hoặc `null`. Tất cả tính lại ở client từ thời gian thô, không lưu DB (xem `data_model.md`). Test trong `shiftMath.test.js` (describe `computeEffective`).

## Chu kỳ lương (`src/lib/payPeriod.js`)

Lương chốt ngày 25 hằng tháng. Công của "tháng M" = **26 của tháng (M‑1) → hết 25 của tháng M**; lương trả **ngày 1–10 của tháng (M+1)**. VD: kỳ tháng 5 = 26/04–25/05, trả 01–10/06.

- `period key` = `"YYYY-MM"` của **tháng kết thúc** (tháng chứa ngày 25).
- `payPeriodKeyOf(dateStr)`: `d >= 26` → kỳ tháng sau; `d <= 25` → kỳ tháng hiện tại (xử lý tràn năm).
- `payPeriodRange(key)` / `paymentWindow(key)` / `payPeriodLabel(key)` / `isPeriodEnded(key, today)`.
- Toán theo chuỗi `YYYY-MM-DD` (so sánh từ điển) để tránh lệch múi giờ; `localTodayStr()` lấy hôm nay theo giờ địa phương.

`periodStats(shifts)` (trong `shiftMath.js`) = `shiftTotals` + `dayPay`/`nightPay` (theo `getDayRate()`/`getNightRate()`) + `idealPay`/`lostPay` + `dayShiftCount`/`nightShiftCount`/`shiftCount`/`workDays`/`avgHoursPerDay`. Đánh dấu đã nhận lương lưu ở bảng `payrolls` (xem `data_model.md`); tiền vẫn tính lại từ `shifts`, không lưu DB.

## Định dạng

- `formatMoney(n)` → làm tròn rồi format theo locale `vi-VN` (vd `285.600`).
- `formatHours(h)` → tối đa 2 chữ số thập phân, bỏ số 0 thừa.

## Quy tắc nâng cao trong SPEC

> Trạng thái: **Lương lễ** ĐÃ được code. **Giới hạn 8 giờ/ngày** CHƯA được code.

- **Giới hạn 8 giờ/ngày** — ❌ CHƯA IMPLEMENT. Không có hằng `MAX_HOURS_PER_DAY`, không
  có chỗ nào chặn khi tổng giờ/ngày (hay một ca) vượt 8h — `App.jsx`/`useShifts`/
  `ShiftForm` đều KHÔNG kiểm tra. (`durationHours` trong `shiftMath.js` có sẵn để đo
  thời lượng một khung giờ, nhưng hiện chỉ dùng ở `scheduleExtract.imageHours`, không
  phải để cap.) Nếu cần thêm, xác nhận với chủ dự án trước.
- **Lương lễ (holiday)** — ✅ ĐÃ IMPLEMENT (phụ cấp lễ là BỘI SỐ trên đơn giá, theo hồ sơ):
  - Lễ ca ngày: `getHolidayDayRate() = lương_ngày × holidayDayPct%` (mặc định hồ sơ 300%).
  - Lễ ca đêm: `getHolidayNightRate() = (lương_ngày × (1+nightPct/100)) × holidayNightPct%` (mặc định 390%) — cộng dồn phụ cấp đêm thường rồi mới nhân bội số lễ.
  - Cờ ngày lễ lưu ở cột `shifts.is_holiday` (boolean). UI bật/tắt ở `ShiftForm.jsx`/`ShiftCard.jsx`; % lễ cấu hình ở `EmployeeInfoForm.jsx`/`ProfileModal.jsx` (cột `profiles.holiday_day_pct`/`holiday_night_pct`).
  - `computeShift`/`computeEffective` nhận tham số `isHoliday`; `shiftTotals`/`periodStats` đọc `!!s.is_holiday`. Test trong `shiftMath.test.js` (describe `lương lễ (holiday pay)`).
  - **Lưu ý quirk**: trong `periodStats`, `dayPay`/`nightPay` luôn tách theo đơn giá THƯỜNG (`getDayRate()`/`getNightRate()`), nên với ca lễ thì `dayPay + nightPay ≠ pay` (`pay` tổng dùng giá lễ). Đây là chủ ý: hai trường đó chỉ để hiển thị cơ cấu giờ ngày/đêm.
  - Mặc định khi hồ sơ CHƯA cấu hình: `holidayDayPct = holidayNightPct = 100` (×1 = như ngày thường), tránh trả 0.
- **Khái niệm Ca 1 / Ca 2 / Ca đêm cố định** (06–14 / 14–22 / 22–06): code không phân loại theo ca đặt tên, chỉ tách phút ngày/đêm theo cửa sổ. Mọi giờ tuỳ ý đều hợp lệ.
