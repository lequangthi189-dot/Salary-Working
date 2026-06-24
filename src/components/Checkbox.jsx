// Checkbox dùng chung — kiểu "premium": ô vuông bo góc, khi tick thì nền chuyển
// màu accent (theo theme) + hiện dấu check trắng, transition mượt 0.2s.
//
// Input gốc được ẩn (opacity:0, position:absolute) NHƯNG vẫn nhận click + bàn
// phím (Tab/Space) để giữ accessibility — ô vuông chỉ là phần vẽ (span). Bấm cả
// nhãn lẫn ô đều toggle vì tất cả nằm trong cùng một <label>.
//
// Màu lấy từ biến theme (var(--accent)/var(--border)), KHÔNG hardcode nền cứng →
// nổi rõ trên cả 3 theme dark / neumorph / glass.
export default function Checkbox({
  checked,
  onChange,
  label = null,
  className = '',
  ...rest
}) {
  return (
    <label className={`ui-check${className ? ` ${className}` : ''}`}>
      <input
        type="checkbox"
        className="ui-check__input"
        checked={checked}
        onChange={onChange}
        {...rest}
      />
      <span className="ui-check__box" aria-hidden="true">
        <svg className="ui-check__tick" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      {label != null && <span className="ui-check__label">{label}</span>}
    </label>
  )
}
