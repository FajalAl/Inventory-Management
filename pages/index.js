// pages/index.js — Boutique Login Page
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Home() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp]           = useState('')
  const [step, setStep]         = useState('login')
  const [mode, setMode]         = useState('password')
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handlePasswordLogin = async () => {
    if (!email || !password) { setMessage('Please enter your email and password.'); return }
    setLoading(true); setMessage('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setMessage('Incorrect email or password.'); return }
    await redirectByRole(data.user.id)
  }

  const handleSendOTP = async () => {
    if (!email) { setMessage('Please enter your email.'); return }
    setLoading(true); setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { shouldCreateUser: false }
    })
    setLoading(false)
    if (error) { setMessage('Error: ' + error.message) }
    else { setMessage('Code sent — check your email.'); setStep('otp') }
  }

  const handleVerifyOTP = async () => {
    if (!otp) { setMessage('Please enter the code.'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) { setMessage('Invalid or expired code.'); return }
    await redirectByRole(data.user.id)
  }

  const redirectByRole = async (userId) => {
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', userId).single()
    if (profile?.role === 'admin' || profile?.role === 'staff') {
      window.location.href = '/dashboard'
    } else {
      setMessage('Access denied. Contact your administrator.')
      await supabase.auth.signOut()
    }
  }

  return (
    <>
      <Head>
        <title>Sign In — Boutique Inventory</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={styles.root}>

        {/* ── Left panel — brand ────────────────────── */}
        <div style={styles.brandPanel}>
          <div style={styles.brandInner}>
            <div style={styles.brandMark}>✦</div>
            <h1 style={styles.brandName}>La Boutique</h1>
            <p style={styles.brandTagline}>Inventory & Sales Management</p>
            <div style={styles.brandDivider} />
            <p style={styles.brandQuote}>
              "Every great outfit starts<br />with the right inventory."
            </p>
          </div>
          {/* Decorative circles */}
          <div style={{...styles.deco, top: '-80px', right: '-80px', width: '280px', height: '280px', opacity: 0.08 }} />
          <div style={{...styles.deco, bottom: '40px', left: '-60px', width: '200px', height: '200px', opacity: 0.06 }} />
        </div>

        {/* ── Right panel — form ────────────────────── */}
        <div style={styles.formPanel}>
          <div style={{...styles.formCard, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.5s ease' }}>

            <div style={styles.formHeader}>
              <span style={styles.formEyebrow}>Welcome back</span>
              <h2 style={styles.formTitle}>Sign In</h2>
            </div>

            {/* Email */}
            {step === 'login' && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    placeholder="you@boutique.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={styles.input}
                    onKeyDown={e => e.key === 'Enter' && mode === 'password' && handlePasswordLogin()}
                  />
                </div>

                {mode === 'password' && (
                  <>
                    <div style={styles.field}>
                      <label style={styles.label}>Password</label>
                      <input
                        type="password"
                        placeholder="Your password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={styles.input}
                        onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                      />
                    </div>
                    <button
                      onClick={handlePasswordLogin}
                      disabled={loading}
                      style={{...styles.btnPrimary, opacity: loading ? 0.7 : 1}}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                    <button style={styles.btnGhost}
                      onClick={() => { setMode('otp'); setMessage('') }}>
                      Sign in with one-time code instead
                    </button>
                  </>
                )}

                {mode === 'otp' && (
                  <>
                    <button
                      onClick={handleSendOTP}
                      disabled={loading}
                      style={{...styles.btnPrimary, opacity: loading ? 0.7 : 1}}>
                      {loading ? 'Sending...' : 'Send One-Time Code'}
                    </button>
                    <button style={styles.btnGhost}
                      onClick={() => { setMode('password'); setMessage('') }}>
                      Sign in with password instead
                    </button>
                  </>
                )}
              </>
            )}

            {/* OTP verification */}
            {step === 'otp' && (
              <>
                <p style={styles.otpNote}>
                  A 6-digit code was sent to <strong>{email}</strong>
                </p>
                <div style={styles.field}>
                  <label style={styles.label}>Verification Code</label>
                  <input
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    style={{...styles.input, letterSpacing: '0.3em', textAlign: 'center', fontSize: '20px'}}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                    maxLength={6}
                  />
                </div>
                <button onClick={handleVerifyOTP} disabled={loading}
                  style={{...styles.btnPrimary, opacity: loading ? 0.7 : 1}}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <button style={styles.btnGhost}
                  onClick={() => { setStep('login'); setMode('password'); setMessage('') }}>
                  ← Back to sign in
                </button>
              </>
            )}

            {/* Message */}
            {message && (
              <div style={{
                ...styles.message,
                background: message.includes('sent') || message.includes('Code')
                  ? '#EDF4EF' : '#F9EDED',
                color: message.includes('sent') || message.includes('Code')
                  ? '#4A7C59' : '#8B2E2E',
                borderColor: message.includes('sent') || message.includes('Code')
                  ? '#4A7C5930' : '#8B2E2E30',
              }}>
                {message}
              </div>
            )}

            <p style={styles.formFooter}>
              Restricted access. Authorised personnel only.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Jost', sans-serif",
    background: '#FAF8F4',
  },

  // Brand panel
  brandPanel: {
    flex: '0 0 420px',
    background: 'linear-gradient(160deg, #4B442D 0%, #300E04 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  brandInner: {
    textAlign: 'center',
    color: '#FAF8F4',
    padding: '48px',
    position: 'relative',
    zIndex: 1,
  },
  brandMark: {
    fontSize: '28px',
    color: '#FAB416',
    marginBottom: '16px',
    display: 'block',
  },
  brandName: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '42px',
    fontWeight: 400,
    letterSpacing: '0.05em',
    color: '#FAF8F4',
    lineHeight: 1.1,
  },
  brandTagline: {
    fontSize: '12px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#AFA984',
    marginTop: '8px',
    fontWeight: 400,
  },
  brandDivider: {
    width: '40px',
    height: '1px',
    background: '#CEB17A',
    margin: '28px auto',
  },
  brandQuote: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '18px',
    fontStyle: 'italic',
    color: '#CEB17A',
    lineHeight: 1.7,
    fontWeight: 300,
  },
  deco: {
    position: 'absolute',
    background: '#CEB17A',
    borderRadius: '50%',
  },

  // Form panel
  formPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 32px',
  },
  formCard: {
    width: '100%',
    maxWidth: '400px',
  },
  formHeader: {
    marginBottom: '36px',
  },
  formEyebrow: {
    fontSize: '12px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#AFA984',
    fontWeight: 500,
  },
  formTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '40px',
    fontWeight: 400,
    color: '#300E04',
    marginTop: '6px',
    lineHeight: 1,
  },

  // Fields
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#4B442D',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    border: '1px solid #E8E2D6',
    borderRadius: '4px',
    fontSize: '15px',
    fontFamily: "'Jost', sans-serif",
    color: '#300E04',
    background: '#FFFFFF',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },

  // Buttons
  btnPrimary: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #4B442D, #300E04)',
    color: '#FAF8F4',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'Jost', sans-serif",
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'opacity 0.2s',
  },
  btnGhost: {
    width: '100%',
    padding: '12px',
    background: 'none',
    color: '#9B9B8C',
    border: '1px solid #E8E2D6',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'Jost', sans-serif",
    cursor: 'pointer',
    marginBottom: '12px',
  },

  // OTP note
  otpNote: {
    fontSize: '14px',
    color: '#9B9B8C',
    marginBottom: '20px',
    lineHeight: 1.6,
  },

  // Message
  message: {
    padding: '12px 16px',
    borderRadius: '4px',
    fontSize: '13px',
    border: '1px solid',
    marginTop: '16px',
    lineHeight: 1.5,
  },

  formFooter: {
    marginTop: '32px',
    fontSize: '11px',
    color: '#AFA984',
    textAlign: 'center',
    letterSpacing: '0.05em',
  },
}