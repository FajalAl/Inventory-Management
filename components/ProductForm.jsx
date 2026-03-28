// components/ProductForm.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProductForm({ onSuccess }) {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    name:               '',
    category_id:        '',
    sku:                '',
    cost_price:         '',
    selling_price:      '',
    restock_threshold:  '5',  // sensible default
  })
  const [newCategory, setNewCategory]   = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [message, setMessage]           = useState('')
  const [submitting, setSubmitting]     = useState(false)

  // Load existing categories
  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name')
      .order('name')
      .then(({ data }) => setCategories(data || []))
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Let admin create a new category on the fly
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newCategory.trim() })
      .select()
      .single()

    if (!error) {
      setCategories([...categories, data])
      setForm({ ...form, category_id: data.id })
      setNewCategory('')
      setAddingCategory(false)
    }
  }

  const handleSubmit = async () => {
    // Basic validation
    if (!form.name || !form.category_id || !form.cost_price || !form.selling_price) {
      setMessage('Please fill in all required fields.')
      return
    }
    if (Number(form.selling_price) < Number(form.cost_price)) {
      setMessage('⚠️ Selling price is lower than cost price. Check before saving.')
      return
    }

    setSubmitting(true)
    setMessage('')

    const { error } = await supabase.from('products').insert({
      name:              form.name.trim(),
      category_id:       form.category_id,
      sku:               form.sku.trim() || null,
      cost_price:        Number(form.cost_price),
      selling_price:     Number(form.selling_price),
      restock_threshold: Number(form.restock_threshold),
      is_active:         true,
    })

    setSubmitting(false)

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('✅ Product added successfully!')
      setForm({
        name: '', category_id: '', sku: '',
        cost_price: '', selling_price: '', restock_threshold: '5',
      })
      onSuccess() // Refresh dashboard data
    }
  }

  // ── Styles ──────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '9px 12px', marginBottom: '14px',
    border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '14px', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', marginBottom: '4px',
    fontSize: '13px', fontWeight: '600', color: '#374151',
  }
  const rowStyle = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
  }

  return (
    <div style={{
      background: 'white', padding: '28px', borderRadius: '10px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#111827' }}>
        ➕ Add New Product
      </h3>

      {/* Product Name */}
      <label style={labelStyle}>Product Name *</label>
      <input
        name="name" placeholder="e.g. Matte Lipstick - Red"
        value={form.name} onChange={handleChange} style={inputStyle}
      />

      {/* Category */}
      <label style={labelStyle}>Category *</label>
      {!addingCategory ? (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <select
            name="category_id" value={form.category_id}
            onChange={handleChange}
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          >
            <option value="">-- Select category --</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => setAddingCategory(true)}
            style={{
              padding: '9px 14px', background: '#f3f4f6',
              border: '1px solid #d1d5db', borderRadius: '6px',
              cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap',
            }}>
            + New
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input
            placeholder="New category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          />
          <button onClick={handleAddCategory} style={{
            padding: '9px 14px', background: '#2563eb', color: 'white',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
          }}>Save</button>
          <button onClick={() => setAddingCategory(false)} style={{
            padding: '9px 14px', background: '#f3f4f6',
            border: '1px solid #d1d5db', borderRadius: '6px',
            cursor: 'pointer', fontSize: '13px',
          }}>Cancel</button>
        </div>
      )}

      {/* SKU */}
      <label style={labelStyle}>SKU <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
      <input
        name="sku" placeholder="e.g. LIP-RED-01"
        value={form.sku} onChange={handleChange} style={inputStyle}
      />

      {/* Prices side by side */}
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Cost Price (KES) *</label>
          <input
            type="number" name="cost_price" placeholder="e.g. 500"
            value={form.cost_price} onChange={handleChange} style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Selling Price (KES) *</label>
          <input
            type="number" name="selling_price" placeholder="e.g. 950"
            value={form.selling_price} onChange={handleChange} style={inputStyle}
          />
        </div>
      </div>

      {/* Profit preview */}
      {form.cost_price && form.selling_price && (
        <div style={{
          background: Number(form.selling_price) >= Number(form.cost_price) ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${Number(form.selling_price) >= Number(form.cost_price) ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '6px', padding: '10px 14px', marginBottom: '14px',
          fontSize: '13px',
          color: Number(form.selling_price) >= Number(form.cost_price) ? '#15803d' : '#dc2626',
        }}>
          {Number(form.selling_price) >= Number(form.cost_price)
            ? `✅ Margin: KES ${(Number(form.selling_price) - Number(form.cost_price)).toLocaleString()} per unit`
            : `⚠️ Selling price is below cost price!`}
        </div>
      )}

      {/* Restock Threshold */}
      <label style={labelStyle}>
        Restock Alert Threshold *
        <span style={{ color: '#9ca3af', fontWeight: 400 }}> — alert when stock drops to this number</span>
      </label>
      <input
        type="number" name="restock_threshold" placeholder="e.g. 5"
        value={form.restock_threshold} onChange={handleChange} style={inputStyle}
      />

      {/* Submit */}
      <button
        onClick={handleSubmit} disabled={submitting}
        style={{
          width: '100%', padding: '12px', marginTop: '4px',
          background: submitting ? '#93c5fd' : '#2563eb',
          color: 'white', border: 'none', borderRadius: '6px',
          cursor: submitting ? 'not-allowed' : 'pointer',
          fontSize: '15px', fontWeight: '600',
        }}>
        {submitting ? 'Saving...' : 'Add Product'}
      </button>

      {message && (
        <p style={{
          marginTop: '12px', padding: '10px',
          background: message.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
          borderRadius: '6px', fontSize: '14px',
          color: message.startsWith('✅') ? '#15803d' : '#dc2626',
        }}>
          {message}
        </p>
      )}
    </div>
  )
}