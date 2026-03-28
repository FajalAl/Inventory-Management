import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('email')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const sendOTP = async () => {
    setLoading(true)
    setMessage('')
    
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      // If you are pre-registering staff, keep this false. 
      // If new signups are allowed, change to true.
      options: { shouldCreateUser: false } 
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Code sent! Check your email.')
      setStep('otp')
    }
    setLoading(false)
  }

  const verifyOTP = async () => {
    setLoading(true)
    setMessage('')

    // Try verifying with type 'email' (most common for OTP)
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email' 
    })

    if (error || !data.user) {
      setMessage('Invalid or expired code.')
      setLoading(false)
      return
    }

    // IMPORTANT: Check the users table for the role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id) // This matches the Auth UUID to your table ID
      .single()

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError)
      setMessage('User record not found in database.')
    } else if (profile.role === 'admin' || profile.role === 'staff') {
      window.location.href = '/dashboard'
    } else {
      setMessage('Access denied. Role: ' + profile.role)
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Inventory Login</h2>

      {step === 'email' && (
        <>
          <input
            type="email"
            placeholder="Enter your work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <button onClick={sendOTP} disabled={loading} style={{ width: '100%', padding: '10px' }}>
            {loading ? 'Sending...' : 'Send OTP Code'}
          </button>
        </>
      )}

      {step === 'otp' && (
        <>
          <p>Enter the 6-digit code sent to <strong>{email}</strong></p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={loading}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', fontSize: '20px', textAlign: 'center', letterSpacing: '4px' }}
          />
          <button onClick={verifyOTP} disabled={loading} style={{ width: '100%', padding: '10px' }}>
            {loading ? 'Verifying...' : 'Verify & Enter'}
          </button>
          <p 
            style={{ marginTop: '10px', cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
            onClick={() => setStep('email')}
          >
            ← Use different email
          </p>
        </>
      )}

      {message && (
        <p style={{ 
          color: message.includes('Error') || message.includes('denied') ? 'red' : 'green', 
          marginTop: '15px',
          backgroundColor: '#f8f8f8',
          padding: '10px'
        }}>
          {message}
        </p>
      )}
    </div>
  )
}