// pages/reset-password.js
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [form, setForm]       = useState({ password: '', confirm: '' })
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [ready, setReady]     = useState(false)
  const [done, setDone]       = useState(false)

  const msg = (text, type = 'error') => setMessage({ text, type })

  // Supabase puts the reset token in the URL hash.
  // Listening for PASSWORD_RECOVERY confirms the token is valid.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true)
        }
      }
    )
    // Also check if already in a valid session from the hash token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const getStrength = (pwd) => {
    if (!pwd)          return null
    if (pwd.length < 8) return { label: 'Too short', color: 'var(--red-700)',    width: '20%' }
    if (pwd.length < 10) return { label: 'Weak',     color: 'var(--orange-600)', width: '45%' }
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd))
                        return { label: 'Fair',      color: 'var(--gold)',        width: '70%' }
    return               { label: 'Strong',          color: 'var(--green-600)',   width: '100%' }
  }

  const handleSubmit = async () => {
    setMessage({ text: '', type: '' })

    if (!form.password || !form.confirm) {
      msg('Please fill in both fields.')
      return
    }
    if (form.password.length < 8) {
      msg('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirm) {
      msg('Passwords do not match.')
      return
    }

    const strength = getStrength(form.password)
    if (strength?.label === 'Too short' || strength?.label === 'Weak') {
      msg('Please choose a stronger password.')
      return
    }

    setLoading(true)

    // CIA: Verify session is still valid before updating
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      msg('Your reset link has expired. Please request a new one.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: form.password })
    setLoading(false)

    if (error) {
      msg('Could not update password: ' + error.message)
      return
    }

    // Clear must_change_password flag if set
    await supabase.from('users')
      .update({ must_change_password: false })
      .eq('id', user.id)

    setDone(true)
    setTimeout(() => { window.location.href = '/' }, 3000)
  }

  const strength = getStrength(form.password)

  return (
    <>
      <Head>
        <title>Reset Password - La Boutique</title>
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

            {done ? (
              /* ── Success ──────────────────────────── */
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 56, height: 56, background: 'var(--green-50)', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                    stroke="var(--green-700)" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '10px' }}>
                  Password Updated
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: 1.7 }}>
                  Your password has been changed successfully.<br />
                  Redirecting you to sign in...
                </p>
              </div>

            ) : !ready ? (
              /* ── Waiting for token ────────────────── */
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: 'var(--gray-500)', fontSize: '14px' }}>
                  Validating your reset link...
                </p>
                <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginTop: '10px' }}>
                  If this takes more than a few seconds, your link may have expired.{' '}
                  <a href="/forgot-password"
                    style={{ color: 'var(--green-700)', fontWeight: 600, textDecoration: 'none' }}>
                    Request a new one
                  </a>
                </p>
              </div>

            ) : (
              /* ── Reset form ───────────────────────── */
              <>
                <div className="login-card-header">
                  <span className="login-card-eyebrow">Account Security</span>
                  <h2 className="login-card-title">Set New Password</h2>
                  <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--gray-500)', lineHeight: 1.6 }}>
                    Choose a strong password you have not used before.
                  </p>
                </div>

                {/* New password */}
                <div className="field">
                  <label className="field-label">New Password</label>
                  <input
                    className="field-input"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />

                  {/* Strength bar */}
                  {form.password && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{
                        height: '4px', background: 'var(--gray-200)',
                        borderRadius: '999px', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: '999px',
                          background: strength?.color,
                          width: strength?.width,
                          transition: 'width 0.3s ease, background 0.3s ease',
                        }} />
                      </div>
                      <p style={{ fontSize: '12px', color: strength?.color, marginTop: '4px', fontWeight: 600 }}>
                        {strength?.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="field">
                  <label className="field-label">Confirm Password</label>
                  <input
                    className={`field-input ${
                      form.confirm && form.password !== form.confirm ? 'input-error' : ''
                    }`}
                    type="password"
                    placeholder="Repeat your new password"
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                  {form.confirm && form.password !== form.confirm && (
                    <p style={{ fontSize: '12px', color: 'var(--red-700)', marginTop: '4px', fontWeight: 500 }}>
                      Passwords do not match
                    </p>
                  )}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={
                    loading ||
                    strength?.label === 'Too short' ||
                    strength?.label === 'Weak'
                  }>
                  {loading ? 'Updating...' : 'Set New Password'}
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
            )}

            <p className="login-footer">Restricted access. Authorised personnel only.</p>
          </div>
        </div>
      </div>
    </>
  )
}