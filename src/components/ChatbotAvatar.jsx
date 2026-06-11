export default function ChatbotAvatar({ size = 48, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Salary Working chatbot avatar"
      className={className}
    >
      <circle cx="80" cy="80" r="80" fill="#3b82f6" />
      <rect x="40" y="46" width="80" height="72" rx="20" fill="#0d1424" />
      <line x1="80" y1="46" x2="80" y2="34" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="31" r="5" fill="#f59e0b" />
      <circle cx="64" cy="62" r="4" fill="#22c55e" />
      <circle cx="96" cy="62" r="4" fill="#22c55e" />
      <circle cx="80" cy="86" r="26" fill="#16203a" stroke="#22c55e" strokeWidth="2.5" />
      <line x1="80" y1="86" x2="80" y2="70" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="86" x2="93" y2="91" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="86" r="2.5" fill="#22c55e" />
    </svg>
  )
}
