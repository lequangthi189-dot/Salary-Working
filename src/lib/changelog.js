// Nhật ký cập nhật (changelog). Mỗi lần ra bản mới: tăng APP_VERSION và thêm 1 mục
// vào đầu mảng CHANGELOG (mới nhất ở trên). App sẽ tự hiện popup "Có cập nhật mới"
// cho người dùng khi APP_VERSION khác phiên bản họ đã xem.
export const APP_VERSION = '2.4.0'

// items: { vi: [...], en: [...] } — danh sách thay đổi theo ngôn ngữ.
export const CHANGELOG = [
  {
    version: '2.4.0',
    date: '2026-06-08',
    items: {
      vi: [
        'Thêm "Đối chiếu công": tải ảnh bảng phân ca để kiểm tra bảng công có đúng không (so cả giờ thực tế lẫn lịch dự kiến).',
      ],
      en: [
        'Added "Verify timesheet": upload a roster image to check your timesheet (compares both actual and scheduled times).',
      ],
    },
  },
  {
    version: '2.3.0',
    date: '2026-06-08',
    items: {
      vi: [
        'Hỗ trợ nhiều ngôn ngữ (Việt / Anh) và đổi tiền tệ theo tỉ giá.',
        'Tùy chọn "Cửa hàng có ca đêm không?" — ẩn phần ca đêm nếu không có.',
        'Lương ngày lễ, phụ cấp ca đêm theo hồ sơ; bộ lọc ca ngày/đêm.',
        'Nhập lịch tuần lấy ngày tháng theo ảnh.',
        'Thêm thông báo "Có cập nhật mới".',
      ],
      en: [
        'Multi-language support (Vietnamese / English) and currency conversion.',
        '"Does your store have night shifts?" option — hides night-shift parts if not.',
        'Holiday pay and night allowance from your profile; day/night filter.',
        'Weekly schedule import reads dates from the image.',
        'Added a "What\'s new" notification.',
      ],
    },
  },
]

// Các mục thay đổi kể từ phiên bản người dùng đã xem lần cuối.
export function entriesSince(lastSeen) {
  if (!lastSeen) return CHANGELOG.slice(0, 1) // chưa từng xem → chỉ hiện bản mới nhất
  const idx = CHANGELOG.findIndex((e) => e.version === lastSeen)
  if (idx === -1) return CHANGELOG // không rõ → hiện tất cả
  return CHANGELOG.slice(0, idx) // các bản mới hơn bản đã xem
}
