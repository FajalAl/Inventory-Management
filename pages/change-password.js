// pages/change-password.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ChangePassword() {
  const [form, setForm] = useState({
    newPassword:     '',
    confirmPassword: '',
  })
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)

  // ── CIA: Verify session exists before showing this page
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        window.location.href = '/'
      } else {
        setChecking(false)
      }
    })
  }, [])

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const getStrength = (pwd) => {
    if (!pwd) return null
    if (pwd.length < 8)  return { label: 'Too short',  color: '#dc2626' }
    if (pwd.length < 10) return { label: 'Weak',       color: '#f59e0b' }
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd))
                         return { label: 'Fair',        color: '#f59e0b' }
    return               { label: 'Strong',             color: '#16a34a' }
  }

  const handleSubmit = async () => {
    setMessage('')

    // ── Validation ──────────────────────────────────────
    if (!form.newPassword || !form.confirmPassword) {
      setMessage('Please fill in both fields.')
      return
    }
    if (form.newPassword.length < 8) {
      setMessage('Password must be at least 8 characters.')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    const strength = getStrength(form.newPassword)
    if (strength?.label === 'Too short' || strength?.label === 'Weak') {
      setMessage('Please choose a stronger password.')
      return
    }

    setLoading(true)

    // ── CIA: Verify user is still authenticated ─────────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      setMessage('Session expired. Please log in again.')
      setLoading(false)
      setTimeout(() => { window.location.href = '/' }, 2000)
      return
    }

    // ── Update password in Supabase Auth ────────────────
    const { error: updateError } = await supabase.auth.updateUser({
      password: form.newPassword
    })

    if (updateError) {
      setMessage('Error updating password: ' + updateError.message)
      setLoading(false)
      return
    }

    // ── Clear the must_change_password flag ─────────────
    const { error: flagError } = await supabase
      .from('users')
      .update({ must_change_password: false })
      .eq('id', user.id)

    setLoading(false)

    if (flagError) {
      setMessage('Password updated but flag error: ' + flagError.message)
      return
    }

    setMessage('✅ Password changed successfully! Redirecting...')
    setTimeout(() => { window.location.href = '/dashboard' }, 1500)
  }

  if (checking) return null

  const strength = getStrength(form.newPassword)

  // ── Styles ───────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '10px 12px', marginBottom: '6px',
    border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '14px', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', fontSize: '13px',
    fontWeight: '600', color: '#374151', marginBottom: '4px',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f3f4f6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', padding: '36px', borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        width: '100%', maxWidth: '400px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔐</div>
          <h2 style={{ margin: 0, color: '#111827' }}>Set Your Password</h2>
          <p style={{
            margin: '8px 0 0', color: '#6b7280', fontSize: '14px',
            background: '#fffbeb', padding: '10px', borderRadius: '6px',
            border: '1px solid #fde68a',
          }}>
            You are using a temporary password.<br />
            Please set a permanent one to continue.
          </p>
        </div>

        {/* New Password */}
        <label style={labelStyle}>New Password</label>
        <input
          type="password" name="newPassword"
          placeholder="Min. 8 characters"
          value={form.newPassword}
          onChange={handleChange}
          style={inputStyle}
        />

        {/* Strength indicator */}
        {form.newPassword && (
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              flex: 1, height: '4px', borderRadius: '999px', background: '#e5e7eb',
            }}>
              <div style={{
                height: '100%', borderRadius: '999px',
                background: strength?.color,
                width: strength?.label === 'Too short' ? '25%'
                     : strength?.label === 'Weak'      ? '50%'
                     : strength?.label === 'Fair'      ? '75%'
                     : '100%',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: '12px', color: strength?.color, fontWeight: '600', minWidth: '60px' }}>
              {strength?.label}
            </span>
          </div>
        )}

        {/* Confirm Password */}
        <label style={labelStyle}>Confirm Password</label>
        <input
          type="password" name="confirmPassword"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={handleChange}
          style={{
            ...inputStyle,
            marginBottom: '16px',
            borderColor: form.confirmPassword && form.newPassword !== form.confirmPassword
              ? '#dc2626' : '#d1d5db'
          }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        {form.confirmPassword && form.newPassword !== form.confirmPassword && (
          <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '-12px', marginBottom: '12px' }}>
            Passwords do not match
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '12px',
            background: loading ? '#93c5fd' : '#2563eb',
            color: 'white', border: 'none', borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '15px', fontWeight: '600',
          }}>
          {loading ? 'Saving...' : 'Set Permanent Password'}
        </button>

        {/* Message */}
        {message && (
          <p style={{
            marginTop: '14px', padding: '10px', borderRadius: '6px',
            fontSize: '13px', textAlign: 'center',
            background: message.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
            color:      message.startsWith('✅') ? '#15803d' : '#dc2626',
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}