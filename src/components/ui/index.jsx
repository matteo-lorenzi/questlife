import React, { useEffect, useRef } from 'react'

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'default', size = 'md', disabled, className = '', type = 'button' }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95'
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-3.5 py-2', lg: 'text-sm px-4 py-2.5' }
  const variants = {
    default: 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300',
    primary: 'bg-purple-600 text-white hover:bg-purple-800 border border-transparent',
    danger:  'border border-red-200 text-red-600 hover:bg-red-50',
    ghost:   'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-transparent',
    success: 'bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-100',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, children, title, width = 'max-w-lg' }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={`bg-white rounded-xl border border-gray-100 w-full ${width} animate-scaleIn`}
           style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-900">{title}</span>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
export function ConfirmModal({ open, onClose, onConfirm, title, children, confirmLabel = 'Confirmer', confirmVariant = 'danger', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="px-5 py-4 text-sm text-gray-600 leading-relaxed">{children}</div>
      <div className="flex justify-end gap-2 px-5 pb-4">
        <Btn onClick={onClose} variant="default">Annuler</Btn>
        <Btn onClick={onConfirm} variant={confirmVariant} disabled={loading}>
          {loading ? 'En cours…' : confirmLabel}
        </Btn>
      </div>
    </Modal>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
export function ProgressBar({ pct, accent = '#1D9E75', height = 4, className = '' }) {
  return (
    <div className={`rounded-full overflow-hidden bg-gray-100 ${className}`} style={{ height }}>
      <div className="h-full rounded-full transition-all duration-500"
           style={{ width: `${Math.min(100, pct)}%`, background: accent }} />
    </div>
  )
}

// ── StatusPill ────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  draft:  { bg: '#F1EFE8', text: '#5F5E5A', label: 'Brouillon' },
  locked: { bg: '#F1EFE8', text: '#888780', label: 'Verrouillée' },
  active: { bg: '#FAEEDA', text: '#633806', label: 'En cours' },
  done:   { bg: '#E1F5EE', text: '#085041', label: 'Complétée' },
}

export function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.locked
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs text-gray-400 mb-1 font-medium">{label}</label>}
      <input
        className={`w-full text-sm px-3 py-2 rounded-lg border transition-colors outline-none
          ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300 focus:border-purple-400'}
          text-gray-900 placeholder:text-gray-300`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ label, className = '', rows = 3, ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs text-gray-400 mb-1 font-medium">{label}</label>}
      <textarea
        rows={rows}
        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-gray-300
          focus:border-purple-400 outline-none transition-colors resize-none text-gray-900 placeholder:text-gray-300"
        {...props}
      />
    </div>
  )
}
