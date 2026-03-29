// components/EditProductModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function EditProductModal({ product, onClose, onSuccess }) {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    name:              product.name              || '',
    category_id:       product.category_id       || '',
    sku:               product.sku               || '',
    cost_price:        product.cost_price        || '',
    selling_price:     product.selling_price     || '',
    restock_threshold: product.restock_threshold || '',
  })
  const [message, setMessage]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name')
      .order('name')
      .then(({ data }) => setCategories(data || []))
  }, [])

  // Block scrolling behind modal
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  // ── Price warning ────────────────────────────────────
  const getPriceWarning = () => {
    const cost    = Number(form.cost_price)
    const selling = Number(form.selling_price)
    if (!cost || !selling) return null
    if (selling < cost) return {
      level: 'error',
      text: `⛔ Selling price is below cost price. This product would sell at a loss.`
    }
    if (selling === cost) return {
      level: 'warning',
      text: `⚠️ Selling price equals cost price. There is no margin on this product.`
    }
    return null
  }

  const handleSave = async () => {
    setMessage('')

    // ── Validation ───────────────────────────────────
    if (!form.name || !form.category_id || !form.cost_price || !form.selling_price) {
      setMessage('Please fill in all required fields.')
      return
    }
    if (Number(form.selling_price) < Number(form.cost_price)) {
      setMessage('⛔ Cannot save: selling price is below cost price.')
      return
    }

    setSubmitting(true)

    // ── CIA: Verify admin session before update ──────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      setMessage('Session expired. Please log in again.')
      setSubmitting(false)
      setTimeout(() => { window.location.href = '/' }, 2000)
      return
    }

    const { error } = await supabase
      .from('products')
      .update({
        name:              form.name.trim(),
        category_id:       form.category_id,
        sku:               form.sku.trim() || null,
        cost_price:        Number(form.cost_price),
        selling_price:     Number(form.selling_price),
        restock_threshold: Number(form.restock_threshold),
      })
      .eq('id', product.id)

    setSubmitting(false)

    if (error) {
      setMessage('Error saving: ' + error.message)
    } else {
      onSuccess()
      onClose()
    }
  }

  // ── Styles ───────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '9px 12px', marginBottom: '14px',
    border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '14px', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', fontSize: '13px',
    fontWeight: '600', color: '#374151', marginBottom: '4px',
  }
  const rowStyle = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
  }

  const priceWarning = getPriceWarning()

  return (
    <>
      {/* ── Backdrop ───────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 999,
        }}
      />

      {/* ── Modal ──────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white', borderRadius: '12px',
        padding: '32px', width: '100%', maxWidth: '520px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        zIndex: 1000,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#111827' }}>✏️ Edit Product</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '20px',
              cursor: 'pointer', color: '#6b7280', padding: '4px',
              lineHeight: 1,
            }}>✕</button>
        </div>

        {/* Product Name */}
        <label style={labelStyle}>Product Name *</label>
        <input
          name="name" placeholder="e.g. Matte Lipstick - Red"
          value={form.name} onChange={handleChange} style={inputStyle}
        />

        {/* Category */}
        <label style={labelStyle}>Category *</label>
        <select name="category_id" value={form.category_id}
          onChange={handleChange} style={inputStyle}>
          <option value="">-- Select category --</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* SKU */}
        <label style={labelStyle}>
          SKU <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
        </label>
        <input
          name="sku" placeholder="e.g. LIP-RED-01"
          value={form.sku} onChange={handleChange} style={inputStyle}
        />

        {/* Prices */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Cost Price (KES) *</label>
            <input
              type="number" name="cost_price"
              value={form.cost_price} onChange={handleChange} style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Selling Price (KES) *</label>
            <input
              type="number" name="selling_price"
              value={form.selling_price} onChange={handleChange}
              style={{
                ...inputStyle,
                borderColor: priceWarning?.level === 'error' ? '#dc2626'
                  : priceWarning?.level === 'warning' ? '#f59e0b'
                  : '#d1d5db'
              }}
            />
          </div>
        </div>

        {/* Live margin preview */}
        {form.cost_price && form.selling_price && !priceWarning && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: '6px', padding: '10px 14px',
            marginTop: '-8px', marginBottom: '14px',
            fontSize: '13px', color: '#15803d',
          }}>
            ✅ Margin: KES {(
              Number(form.selling_price) - Number(form.cost_price)
            ).toLocaleString()} per unit ({(
              ((Number(form.selling_price) - Number(form.cost_price))
              / Number(form.selling_price)) * 100
            ).toFixed(1)}%)
          </div>
        )}

        {/* Price warning */}
        {priceWarning && (
          <div style={{
            padding: '10px 14px', borderRadius: '6px',
            marginTop: '-8px', marginBottom: '14px',
            background: priceWarning.level === 'error' ? '#fef2f2' : '#fffbeb',
            color:      priceWarning.level === 'error' ? '#dc2626' : '#b45309',
            fontSize: '13px',
          }}>
            {priceWarning.text}
          </div>
        )}

        {/* Restock Threshold */}
        <label style={labelStyle}>
          Restock Alert Threshold *
          <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '6px' }}>
            alert when stock drops to this number
          </span>
        </label>
        <input
          type="number" name="restock_threshold"
          value={form.restock_threshold} onChange={handleChange} style={inputStyle}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px', background: '#f3f4f6',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '14px', fontWeight: '600', color: '#374151',
            }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || priceWarning?.level === 'error'}
            style={{
              flex: 2, padding: '11px',
              background: submitting || priceWarning?.level === 'error'
                ? '#9ca3af' : '#2563eb',
              color: 'white', border: 'none', borderRadius: '6px',
              cursor: submitting || priceWarning?.level === 'error'
                ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: '600',
            }}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {message && (
          <p style={{
            marginTop: '12px', padding: '10px', borderRadius: '6px',
            fontSize: '13px',
            background: message.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
            color:      message.startsWith('✅') ? '#15803d' : '#dc2626',
          }}>
            {message}
          </p>
        )}
      </div>
    </>
  )
}