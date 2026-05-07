// pages/index.js
import { useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp]         = useState('')
  const [step, setStep]       = useState('login')
  const [mode, setMode]       = useState('password')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)

  const msg     = (text, type = 'error') => setMessage({ text, type })
  const clearMsg = () => setMessage({ text: '', type: '' })

  const handlePasswordLogin = async () => {
    if (!email || !password) { msg('Please enter your email and password.'); return }
    setLoading(true); clearMsg()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { msg('Incorrect email or password. Please try again.'); return }
    await redirectByRole(data.user.id)
  }

  const handleSendOTP = async () => {
    if (!email) { msg('Please enter your email address.'); return }
    setLoading(true); clearMsg()
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    setLoading(false)
    if (error) { msg('Could not send code: ' + error.message); return }
    msg('Code sent. Check your email inbox.', 'success')
    setStep('otp')
  }

  const handleVerifyOTP = async () => {
    if (!otp) { msg('Please enter the 6-digit code.'); return }
    setLoading(true); clearMsg()
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) { msg('Invalid or expired code. Please try again.'); return }
    await redirectByRole(data.user.id)
  }

  const redirectByRole = async (userId) => {
    const { data: profile } = await supabase.from('users').select('role').eq('id', userId).single()
    if (profile?.role === 'admin' || profile?.role === 'staff') {
      window.location.href = '/dashboard'
    } else {
      msg('Access denied. Contact your administrator.')
      await supabase.auth.signOut()
    }
  }

  return (
    <>
      <Head>
        <title>Sign In - Boutique Inventory</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="login-root">

        {/* Brand panel — hidden on mobile */}
        <div className="login-brand">
          <div className="login-brand-deco" style={{ width: 300, height: 300, top: -100, right: -100 }} />
          <div className="login-brand-deco" style={{ width: 180, height: 180, bottom: 60, left: -50 }} />
          <div className="login-brand-inner">
            <div className="login-brand-logo">LB</div>
            <h1>La Boutique</h1>
            <p className="login-brand-sub">Inventory and Sales Management</p>
            <div className="login-brand-divider" />
            <ul className="login-brand-features">
              {['Real-time stock tracking', 'Sales and receipt generation', 'Staff access controls', 'Analytics and insights'].map(f => (
                <li key={f}><span className="dot" />{f}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form panel */}
        <div className="login-form-panel">
          <div className="login-card">

            <div className="login-card-header">
              <span className="login-card-eyebrow">Welcome back</span>
              <h2 className="login-card-title">Sign In</h2>
            </div>

            {step === 'login' && (
              <>
                <div className="field">
                  <label className="field-label">Email Address</label>
                  <input className="field-input" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && mode === 'password' && handlePasswordLogin()}
                    autoComplete="email" />
                </div>

                {mode === 'password' && (
                  <>
                    <div className="field">
                      <label className="field-label">Password</label>
                      <input className="field-input" type="password" placeholder="Your password"
                        value={password} onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                        autoComplete="current-password" />
                        <a
                        href="/forgot-password"
                        style={{
                          display: 'block',
                          marginTop: '6px',
                          fontSize: '13px',
                          color: 'var(--green-700)',
                          textAlign: 'right',
                          textDecoration: 'none',
                          fontWeight: 500,
                          }}>
                          Forgot password?
                        </a>
                    </div>
                    <button className="btn btn-primary" onClick={handlePasswordLogin} disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setMode('otp'); clearMsg() }}>
                      Use a one-time code instead
                    </button>
                  </>
                )}

                {mode === 'otp' && (
                  <>
                    <button className="btn btn-primary" onClick={handleSendOTP} disabled={loading}>
                      {loading ? 'Sending...' : 'Send One-Time Code'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setMode('password'); clearMsg() }}>
                      Use password instead
                    </button>
                  </>
                )}
              </>
            )}

            {step === 'otp' && (
              <>
                <p className="login-otp-note">
                  A 6-digit code was sent to <strong>{email}</strong>. Enter it below.
                </p>
                <div className="field">
                  <label className="field-label">Verification Code</label>
                  <input className="field-input" type="text" placeholder="000000"
                    value={otp} onChange={e => setOtp(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                    maxLength={6}
                    style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '20px' }} />
                </div>
                <button className="btn btn-primary" onClick={handleVerifyOTP} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify and Sign In'}
                </button>
                <button className="btn btn-secondary" onClick={() => { setStep('login'); setMode('password'); clearMsg() }}>
                  Back to sign in
                </button>
              </>
            )}

            {message.text && (
              <div className={`alert alert-${message.type || 'error'}`}>
                {message.text}
              </div>
            )}

            <p className="login-footer">Restricted access. Authorised personnel only.</p>
          </div>
        </div>
      </div>
    </>
  )
}