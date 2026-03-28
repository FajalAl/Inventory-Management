// pages/index.js
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp]           = useState('')
  const [step, setStep]         = useState('login')   // 'login' | 'otp'
  const [mode, setMode]         = useState('password') // 'password' | 'otp'
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)

  // ── Password Login ───────────────────────────────────────
  const handlePasswordLogin = async () => {
    if (!email || !password) {
      setMessage('Please enter your email and password.')
      return
    }
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setMessage('Incorrect email or password. Try again.')
      return
    }

    await redirectByRole(data.user.id)
  }

  // ── OTP Login (kept for admin flexibility) ───────────────
  const handleSendOTP = async () => {
    if (!email) { setMessage('Please enter your email.'); return }
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    })

    setLoading(false)

    if (error) {
      setMessage('Error sending code: ' + error.message)
    } else {
      setMessage('Code sent! Check your email.')
      setStep('otp')
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp) { setMessage('Please enter the code.'); return }
    setLoading(true)

    const { data, error } = await supabase.auth.verifyOtp({
      email, token: otp, type: 'email'
    })

    setLoading(false)

    if (error) {
      setMessage('Invalid or expired code.')
      return
    }

    await redirectByRole(data.user.id)
  }

  // ── Shared: check role and redirect ─────────────────────
  const redirectByRole = async (userId) => {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role === 'admin' || profile?.role === 'staff') {
      window.location.href = '/dashboard'
    } else {
      setMessage('Access denied. Contact your admin.')
      await supabase.auth.signOut()
    }
  }

  // ── Styles ───────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '10px 12px', marginBottom: '12px',
    border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '14px', boxSizing: 'border-box',
  }
  const btnStyle = (color = '#2563eb') => ({
    width: '100%', padding: '11px', marginBottom: '8px',
    background: loading ? '#93c5fd' : color,
    color: 'white', border: 'none', borderRadius: '6px',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: '15px', fontWeight: '600',
  })
  const toggleStyle = {
    background: 'none', border: 'none',
    color: '#2563eb', cursor: 'pointer',
    fontSize: '13px', marginTop: '8px', textDecoration: 'underline',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f3f4f6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', padding: '36px', borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📦</div>
          <h2 style={{ margin: 0, color: '#111827' }}>Inventory System</h2>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '14px' }}>
            Sign in to your account
          </p>
        </div>

        {/* Email — shown in all steps */}
        {step === 'login' && (
          <>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
              Email
            </label>
            <input
              type="email" placeholder="your@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && mode === 'password' && handlePasswordLogin()}
            />

            {/* Password mode */}
            {mode === 'password' && (
              <>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  Password
                </label>
                <input
                  type="password" placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                />
                <button
                  onClick={handlePasswordLogin}
                  disabled={loading}
                  style={btnStyle('#2563eb')}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
                <div style={{ textAlign: 'center' }}>
                  <button style={toggleStyle} onClick={() => { setMode('otp'); setMessage('') }}>
                    Sign in with email code instead
                  </button>
                </div>
              </>
            )}

            {/* OTP mode */}
            {mode === 'otp' && (
              <>
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  style={btnStyle('#2563eb')}>
                  {loading ? 'Sending...' : 'Send OTP Code'}
                </button>
                <div style={{ textAlign: 'center' }}>
                  <button style={toggleStyle} onClick={() => { setMode('password'); setMessage('') }}>
                    Sign in with password instead
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* OTP verification step */}
        {step === 'otp' && (
          <>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
            <input
              type="text" placeholder="Enter OTP code"
              value={otp} onChange={e => setOtp(e.target.value)}
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
            />
            <button
              onClick={handleVerifyOTP}
              disabled={loading}
              style={btnStyle('#2563eb')}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button style={toggleStyle} onClick={() => {
                setStep('login'); setMode('password'); setMessage('')
              }}>
                ← Back to login
              </button>
            </div>
          </>
        )}

        {/* Message */}
        {message && (
          <p style={{
            marginTop: '12px', padding: '10px', borderRadius: '6px',
            fontSize: '13px', textAlign: 'center',
            background: message.includes('sent') ? '#f0fdf4' : '#fef2f2',
            color: message.includes('sent') ? '#15803d' : '#dc2626',
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}