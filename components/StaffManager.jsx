// components/StaffManager.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function StaffManager() {
  const [staffList, setStaffList]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [message, setMessage]         = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email:     '',
    phone:     '',
    role:      'staff',
    password:  '',
  })

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role, is_active, created_at')
      .order('created_at', { ascending: true })

    if (!error) setStaffList(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchStaff() }, [])

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  // ── Get current session token for API calls ──────────
  const getToken = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  // ── Add new staff member ─────────────────────────────
  const handleAddStaff = async () => {
    setMessage('')

    if (!form.full_name || !form.email || !form.password) {
      setMessage('Name, email and password are required.')
      return
    }
    if (form.password.length < 8) {
      setMessage('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    const token = await getToken()

    if (!token) {
      setMessage('Session expired. Please log in again.')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/staff/create', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    })

    const result = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setMessage('Error: ' + result.error)
    } else {
      setMessage('✅ Staff member added successfully!')
      setForm({ full_name: '', email: '', phone: '', role: 'staff', password: '' })
      setShowForm(false)
      fetchStaff()
    }
  }

  // ── Activate / Deactivate ────────────────────────────
  const handleToggle = async (member) => {
    const action = member.is_active ? 'deactivate' : 'reactivate'
    if (!confirm(`Are you sure you want to ${action} ${member.full_name}?`)) return

    const token = await getToken()
    if (!token) { setMessage('Session expired.'); return }

    const res = await fetch('/api/staff/toggle', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        targetUserId: member.id,
        is_active:    !member.is_active,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      setMessage('Error: ' + result.error)
    } else {
      setMessage(`✅ ${member.full_name} has been ${action}d.`)
      fetchStaff()
    }
  }

  // ── Styles ───────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '9px 12px', marginBottom: '12px',
    border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '14px', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', fontSize: '13px',
    fontWeight: '600', color: '#374151', marginBottom: '4px',
  }

  if (loading) return <p>Loading staff...</p>

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>👥 Staff Management</h3>
        <button
          onClick={() => { setShowForm(!showForm); setMessage('') }}
          style={{
            padding: '9px 18px', background: '#2563eb', color: 'white',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontSize: '14px', fontWeight: '600',
          }}>
          {showForm ? '✕ Cancel' : '+ Add Staff Member'}
        </button>
      </div>

      {/* Add staff form */}
      {showForm && (
        <div style={{
          background: 'white', padding: '24px', borderRadius: '10px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '24px',
          maxWidth: '480px',
        }}>
          <h4 style={{ marginTop: 0 }}>New Staff Member</h4>

          <label style={labelStyle}>Full Name *</label>
          <input name="full_name" placeholder="e.g. Jane Mwangi"
            value={form.full_name} onChange={handleChange} style={inputStyle} />

          <label style={labelStyle}>Email *</label>
          <input name="email" type="email" placeholder="jane@example.com"
            value={form.email} onChange={handleChange} style={inputStyle} />

          <label style={labelStyle}>Phone</label>
          <input name="phone" placeholder="e.g. 0712 345 678"
            value={form.phone} onChange={handleChange} style={inputStyle} />

          <label style={labelStyle}>Role</label>
          <select name="role" value={form.role}
            onChange={handleChange} style={inputStyle}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>

          <label style={labelStyle}>
            Temporary Password *
            <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '6px' }}>
              (min. 8 characters — share securely)
            </span>
          </label>
          <input name="password" type="password" placeholder="Min. 8 characters"
            value={form.password} onChange={handleChange} style={inputStyle} />

          <button
            onClick={handleAddStaff}
            disabled={submitting}
            style={{
              width: '100%', padding: '11px',
              background: submitting ? '#93c5fd' : '#2563eb',
              color: 'white', border: 'none', borderRadius: '6px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '15px', fontWeight: '600', marginTop: '4px',
            }}>
            {submitting ? 'Creating account...' : 'Create Staff Account'}
          </button>
        </div>
      )}

      {/* Message */}
      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: '6px', marginBottom: '16px',
          background: message.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
          color:      message.startsWith('✅') ? '#15803d' : '#dc2626',
          fontSize: '14px',
        }}>
          {message}
        </div>
      )}

      {/* Staff table */}
      <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined', 'Action'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left',
                  fontSize: '13px', color: '#6b7280',
                  borderBottom: '1px solid #e5e7eb',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffList.map(member => (
              <tr key={member.id}
                style={{
                  borderBottom: '1px solid #f3f4f6',
                  opacity: member.is_active ? 1 : 0.5,
                }}>
                <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                  {member.full_name || '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>
                  {member.email || '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>
                  {member.phone || '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '999px', fontSize: '12px',
                    background: member.role === 'admin' ? '#ede9fe' : '#dbeafe',
                    color:      member.role === 'admin' ? '#6d28d9' : '#1d4ed8',
                    fontWeight: '600',
                  }}>
                    {member.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '999px', fontSize: '12px',
                    background: member.is_active ? '#dcfce7' : '#f3f4f6',
                    color:      member.is_active ? '#15803d' : '#6b7280',
                  }}>
                    {member.is_active ? '● Active' : '○ Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => handleToggle(member)}
                    style={{
                      padding: '6px 14px', fontSize: '12px', fontWeight: '600',
                      border: 'none', borderRadius: '6px', cursor: 'pointer',
                      background: member.is_active ? '#fef2f2' : '#f0fdf4',
                      color:      member.is_active ? '#dc2626' : '#15803d',
                    }}>
                    {member.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {staffList.length === 0 && (
          <p style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
            No staff members yet. Add one above.
          </p>
        )}
      </div>
    </div>
  )
}