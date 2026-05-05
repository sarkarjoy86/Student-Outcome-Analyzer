import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// SVG Illustration component for the left side of the login page
function DeskIllustration() {
  return (
    <svg viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-w-lg">
      {/* Shelf */}
      <rect x="80" y="60" width="280" height="6" rx="3" fill="#e2e8f0" />
      <rect x="80" y="110" width="280" height="6" rx="3" fill="#e2e8f0" />
      {/* Shelf supports */}
      <rect x="80" y="60" width="4" height="56" fill="#cbd5e1" />
      <rect x="356" y="60" width="4" height="56" fill="#cbd5e1" />
      
      {/* Books on top shelf */}
      <rect x="100" y="35" width="12" height="25" rx="2" fill="#818cf8" />
      <rect x="116" y="30" width="14" height="30" rx="2" fill="#6366f1" />
      <rect x="134" y="38" width="10" height="22" rx="2" fill="#a5b4fc" />
      
      {/* Clock */}
      <circle cx="200" cy="45" r="12" fill="white" stroke="#cbd5e1" strokeWidth="2" />
      <line x1="200" y1="45" x2="200" y2="37" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="200" y1="45" x2="206" y2="45" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Cat figurine on shelf */}
      <ellipse cx="250" cy="50" rx="8" ry="10" fill="#94a3b8" />
      <circle cx="247" cy="44" r="2" fill="#334155" />
      <circle cx="253" cy="44" r="2" fill="#334155" />
      <path d="M244 38 L246 44" stroke="#94a3b8" strokeWidth="2" />
      <path d="M256 38 L254 44" stroke="#94a3b8" strokeWidth="2" />
      
      {/* Books on bottom shelf */}
      <rect x="100" y="80" width="16" height="30" rx="2" fill="#818cf8" />
      <rect x="120" y="85" width="14" height="25" rx="2" fill="#c7d2fe" />
      <rect x="138" y="82" width="12" height="28" rx="2" fill="#6366f1" />
      <rect x="280" y="82" width="14" height="28" rx="2" fill="#a5b4fc" />
      <rect x="298" y="85" width="12" height="25" rx="2" fill="#818cf8" />
      <rect x="314" y="80" width="16" height="30" rx="2" fill="#c7d2fe" />
      
      {/* Plant on left */}
      <rect x="60" y="310" width="30" height="35" rx="4" fill="#e2e8f0" />
      <ellipse cx="75" cy="295" rx="20" ry="18" fill="#6366f1" opacity="0.8" />
      <ellipse cx="65" cy="288" rx="12" ry="14" fill="#818cf8" opacity="0.9" />
      <ellipse cx="85" cy="290" rx="14" ry="12" fill="#6366f1" opacity="0.7" />
      
      {/* Desk */}
      <rect x="120" y="310" width="300" height="12" rx="3" fill="#e2e8f0" />
      
      {/* Desk legs */}
      <rect x="140" y="322" width="8" height="100" rx="2" fill="#cbd5e1" />
      <rect x="392" y="322" width="8" height="100" rx="2" fill="#cbd5e1" />
      
      {/* Drawers */}
      <rect x="260" y="322" width="100" height="90" rx="4" fill="#334155" />
      <rect x="265" y="328" width="90" height="20" rx="2" fill="#475569" />
      <rect x="265" y="354" width="90" height="20" rx="2" fill="#475569" />
      <rect x="265" y="380" width="90" height="20" rx="2" fill="#475569" />
      <circle cx="310" cy="338" r="3" fill="#94a3b8" />
      <circle cx="310" cy="364" r="3" fill="#94a3b8" />
      <circle cx="310" cy="390" r="3" fill="#94a3b8" />
      
      {/* Monitor */}
      <rect x="170" y="210" width="160" height="100" rx="8" fill="#1e293b" />
      <rect x="178" y="218" width="144" height="84" rx="4" fill="#e0e7ff" />
      <rect x="235" y="310" width="30" height="15" rx="2" fill="#94a3b8" />
      <rect x="220" y="322" width="60" height="6" rx="3" fill="#cbd5e1" />
      
      {/* Monitor content - code lines */}
      <rect x="190" y="232" width="60" height="4" rx="2" fill="#818cf8" />
      <rect x="190" y="242" width="80" height="4" rx="2" fill="#6366f1" opacity="0.6" />
      <rect x="190" y="252" width="40" height="4" rx="2" fill="#a5b4fc" />
      <rect x="190" y="262" width="100" height="4" rx="2" fill="#818cf8" opacity="0.5" />
      <rect x="190" y="272" width="70" height="4" rx="2" fill="#6366f1" opacity="0.7" />
      <rect x="190" y="282" width="50" height="4" rx="2" fill="#a5b4fc" opacity="0.6" />
      
      {/* Keyboard */}
      <rect x="180" y="295" width="80" height="15" rx="4" fill="#f1f5f9" stroke="#e2e8f0" />
      
      {/* Person - chair */}
      <ellipse cx="155" cy="370" rx="35" ry="15" fill="#6366f1" />
      <rect x="122" y="350" width="8" height="70" rx="4" fill="#4f46e5" />
      <rect x="118" y="415" width="75" height="8" rx="4" fill="#6366f1" opacity="0.5" />
      
      {/* Person - body */}
      <rect x="140" y="270" width="35" height="80" rx="12" fill="#475569" />
      
      {/* Person - head */}
      <circle cx="158" cy="245" r="22" fill="#fcd9bd" />
      {/* Hair bun */}
      <circle cx="158" cy="218" r="10" fill="#334155" />
      <path d="M140 240 Q138 220 150 215 Q158 210 166 215 Q178 220 176 240" fill="#334155" />
      
      {/* Person - arms */}
      <path d="M165 290 Q185 280 195 295" stroke="#475569" strokeWidth="8" strokeLinecap="round" fill="none" />
      
      {/* Person - legs */}
      <rect x="142" y="345" width="12" height="50" rx="4" fill="#1e293b" />
      <rect x="158" y="345" width="12" height="50" rx="4" fill="#1e293b" />
      
      {/* Person - shoes */}
      <ellipse cx="148" cy="398" rx="10" ry="5" fill="#334155" />
      <ellipse cx="164" cy="398" rx="10" ry="5" fill="#334155" />
      
      {/* Plant pot on right */}
      <rect x="420" y="340" width="40" height="45" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="415" y="335" width="50" height="8" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="2" />
      {/* Right plant leaves */}
      <ellipse cx="440" cy="310" rx="14" ry="22" fill="#6366f1" opacity="0.8" />
      <ellipse cx="428" cy="315" rx="10" ry="18" fill="#818cf8" opacity="0.9" />
      <ellipse cx="452" cy="318" rx="12" ry="16" fill="#6366f1" opacity="0.7" />
      <line x1="440" y1="335" x2="440" y2="310" stroke="#4f46e5" strokeWidth="2" />
      <line x1="440" y1="335" x2="430" y2="315" stroke="#4f46e5" strokeWidth="2" />
      <line x1="440" y1="335" x2="450" y2="318" stroke="#4f46e5" strokeWidth="2" />
    </svg>
  )
}

export default function AuthCard() {
  const { login, actionLoading, message } = useAuth()
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (message.type === 'success') {
      setShowCheckmark(true)
      const timer = setTimeout(() => setShowCheckmark(false), 900)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [message])

  const changeField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setLocalError('')
  }

  const validate = () => {
    if (!emailRegex.test(formData.email.trim().toLowerCase())) {
      return 'Please enter a valid email address.'
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters.'
    }
    return ''
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setLocalError(validationError)
      return
    }

    try {
      await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      })
      setFormData({ email: '', password: '' })
    } catch {
      // handled through global auth message
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="auth-split-container">
      {/* Left side - Illustration */}
      <div className="auth-illustration-side">
        <DeskIllustration />
      </div>

      {/* Right side - Form */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          {/* Logo / Branding */}
          <div className="auth-brand">
            <div className="auth-logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="12" fill="url(#logoGrad)" />
                <path d="M12 20 L20 12 L28 20 L20 28 Z" fill="white" opacity="0.9" />
                <circle cx="20" cy="20" r="4" fill="white" />
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="auth-title">Sign In</h1>
            <p className="auth-subtitle">
              OBE System — Outcome Attainment Tracker
            </p>
          </div>

          {/* Form */}
          <div className="auth-form-fields form-transition">
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={formData.email}
                onChange={(event) => changeField('email', event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your email"
                className="auth-input"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={formData.password}
                onChange={(event) => changeField('password', event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your password"
                className="auth-input"
              />
            </div>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleSubmit}
              className="auth-submit-btn"
            >
              {actionLoading && (
                <span className="auth-spinner" />
              )}
              {actionLoading ? 'Processing...' : 'Log In'}
            </button>
          </div>

          {/* Error / Success Messages */}
          {(localError || message.text) && (
            <p
              className={`auth-message ${
                localError || message.type === 'error'
                  ? 'auth-message-error'
                  : 'auth-message-success'
              }`}
            >
              {localError || message.text}
            </p>
          )}

          {showCheckmark && (
            <div className="auth-checkmark">
              <span className="auth-checkmark-icon">✓</span>
              Success
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
