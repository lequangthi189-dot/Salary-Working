import React from 'react'

/* Timesheet search: magnifier on the left, clear × on the right, raised surface so
   it matches the filter chips beside it. From src/components/Timesheet.jsx. */
export function SearchInput({ value = '', onChange, onClear, placeholder = 'Search shifts: date, time…', style, ...rest }) {
  return (
    <div style={{ position: 'relative', flex: '1 1 15rem', minWidth: '11rem', display: 'flex', alignItems: 'center', ...style }}>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ position: 'absolute', left: '0.72rem', width: '1rem', height: '1rem', color: 'var(--muted)', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', pointerEvents: 'none' }}
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          font: 'inherit',
          width: '100%',
          padding: '0.5rem 2.1rem 0.5rem 2.25rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-md)',
          background: 'var(--panel-2)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--input-shadow)',
          color: 'var(--text)'
        }}
        {...rest}
      />
      {value !== '' && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          style={{ position: 'absolute', right: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', padding: 0, border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: '1.3rem', lineHeight: 1, borderRadius: '50%', cursor: 'pointer' }}
        >
          ×
        </button>
      )}
    </div>
  )
}
