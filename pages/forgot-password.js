// pages/forgot-password.js
import { useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const msg = (text, type = 'error') => setMessage({ text, type })

  const handleSubmit = async () => {
    if (!email) { msg('Please enter your email address.'); return }

    setLoading(true)
    setMessage({ text: '', type: '' })

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      msg('Could not send reset email: ' + error.message)
      return
    }

    setSent(true)
  }

  return (
    <>
      <Head>
        <title>Forgot Password - La Boutique</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="login-root">

        {/* Brand panel */}
        <div className="login-brand">
          <div className="login-brand-deco" style={{ width: 300, height: 300, top: -100, right: -100 }} />
          <div className="login-brand-inner">
            <div className="login-brand-logo">LB</div>
            <h1>La Boutique</h1>
            <p className="login-brand-sub">Inventory and Sales Management</p>
          </div>
        </div>

        {/* Form panel */}
        <div className="login-form-panel">
          <div className="login-card">

            {!sent ? (
              <>
                <div className="login-card-header">
                  <span className="login-card-eyebrow">Account Recovery</span>
                  <h2 className="login-card-title">Forgot Password</h2>
                  <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--gray-500)', lineHeight: 1.6 }}>
                    Enter your work email and we will send you a link to reset your password.
                  </p>
                </div>

                <div className="field">
                  <label className="field-label">Email Address</label>
                  <input
                    className="field-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    autoComplete="email"
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => window.location.href = '/'}>
                  Back to Sign In
                </button>

                {message.text && (
                  <div className={`alert alert-${message.type}`}>
                    {message.text}
                  </div>
                )}
              </>
            ) : (
              /* ── Success state ──────────────────── */
              <>
                <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                  <div style={{
                    width: 56, height: 56,
                    background: 'var(--green-50)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                      stroke="var(--green-700)" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '10px' }}>
                    Check your email
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: 1.7 }}>
                    We sent a password reset link to<br />
                    <strong style={{ color: 'var(--gray-800)' }}>{email}</strong>
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '12px' }}>
                    The link expires in 1 hour. Check your spam folder if you do not see it.
                  </p>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => window.location.href = '/'}>
                  Back to Sign In
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => { setSent(false); setEmail('') }}>
                  Try a different email
                </button>
              </>
            )}

            <p className="login-footer">Restricted access. Authorised personnel only.</p>
          </div>
        </div>
      </div>
    </>
  )
}