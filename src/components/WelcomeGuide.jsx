import { useI18n } from '../lib/i18n.jsx'

// Modal hướng dẫn nhanh cho người mới. Tự hiện lần đầu (App lưu trạng thái đã xem
// trong localStorage) và có thể mở lại bằng nút "Hướng dẫn" trong sidebar.
const STEP_ICONS = ['📝', '🗓️', '💰', '➖', '💵', '📊', '🤖', '⚙️']

export default function WelcomeGuide({ onClose }) {
  const { t } = useI18n()
  const steps = STEP_ICONS.map((icon, i) => ({
    icon,
    title: t(`welcome.step${i + 1}.title`),
    desc: t(`welcome.step${i + 1}.desc`),
  }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card wide welcome-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('welcome.title')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <p className="muted">{t('welcome.subtitle')}</p>
        <ol className="welcome-steps">
          {steps.map((s) => (
            <li key={s.title} className="welcome-step">
              <span className="welcome-step-icon">{s.icon}</span>
              <span className="welcome-step-body">
                <strong>{s.title}</strong>
                <span className="muted">{s.desc}</span>
              </span>
            </li>
          ))}
        </ol>

        <button type="button" className="btn-addshift welcome-start" onClick={onClose}>
          {t('welcome.start')}
        </button>
      </div>
    </div>
  )
}
