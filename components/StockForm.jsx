// components/StockForm.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function StockForm({ onSuccess }) {
  const [products, setProducts]     = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [currentStock, setCurrentStock] = useState(null)
  const [form, setForm] = useState({
    product_id: '',
    type:       'sale',
    quantity:   '',
    unit_price: '',
    notes:      ''
  })
  const [message, setMessage]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load products with prices
  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, cost_price, selling_price')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setProducts(data || []))
  }, [])

  // When product changes, load its current stock and prefill price
  const handleProductChange = async (productId) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)
    setForm(f => ({
      ...f,
      product_id: productId,
      // Prefill with selling price for sales, cost price for purchases
      unit_price: product
        ? (form.type === 'sale'
            ? String(product.selling_price)
            : String(product.cost_price))
        : ''
    }))

    if (!productId) { setCurrentStock(null); return }

    // Calculate current stock from movements
    const { data } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('product_id', productId)

    const stock = (data || []).reduce((sum, m) => sum + m.quantity, 0)
    setCurrentStock(stock)
  }

  // When type changes, update prefilled price
  const handleTypeChange = (type) => {
    setForm(f => ({
      ...f,
      type,
      unit_price: selectedProduct
        ? (type === 'sale'
            ? String(selectedProduct.selling_price)
            : String(selectedProduct.cost_price))
        : f.unit_price
    }))
  }

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  // ── Price warning logic ───────────────────────────────
  const getPriceWarning = () => {
    if (!selectedProduct || !form.unit_price || !form.type) return null
    const price = Number(form.unit_price)
    if (form.type === 'sale') {
      if (price < selectedProduct.cost_price) {
        return {
          level: 'error',
          text: `⛔ Selling below cost price (KES ${selectedProduct.cost_price.toLocaleString()}). This is a loss.`
        }
      }
      if (price < selectedProduct.selling_price) {
        return {
          level: 'warning',
          text: `⚠️ Below standard selling price (KES ${selectedProduct.selling_price.toLocaleString()}). Confirm discount?`
        }
      }
    }
    if (form.type === 'purchase' && price > selectedProduct.selling_price) {
      return {
        level: 'error',
        text: `⛔ Purchase price exceeds selling price (KES ${selectedProduct.selling_price.toLocaleString()}). Check figures.`
      }
    }
    return null
  }

  const handleSubmit = async () => {
    setMessage('')

    // ── Validation ──────────────────────────────────────
    if (!form.product_id || !form.quantity || !form.unit_price) {
      setMessage('Please fill in product, quantity and price.')
      return
    }

    const qty   = Number(form.quantity)
    const price = Number(form.unit_price)

    if (qty <= 0) {
      setMessage('Quantity must be a positive number.')
      return
    }

    // Block selling at a loss
    if (form.type === 'sale' && selectedProduct && price < selectedProduct.cost_price) {
      setMessage('⛔ Cannot save: unit price is below cost price. You would be selling at a loss.')
      return
    }

    // Block negative stock
    if (['sale', 'return'].includes(form.type)) {
      if (currentStock !== null && qty > currentStock) {
        setMessage(`⛔ Cannot sell ${qty} units — only ${currentStock} in stock.`)
        return
      }
    }

    setSubmitting(true)

    // Sales and adjustments out are negative quantity
    const finalQty = ['sale'].includes(form.type)
      ? -Math.abs(qty)
      :  Math.abs(qty)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
        setMessage('Your session has expired. Please log in again.')
        setSubmitting(false)
        setTimeout(() => { window.location.href = '/' }, 2000)
        return
    }

    const { error } = await supabase.from('stock_movements').insert({
      product_id: form.product_id,
      user_id:    user.id,
      type:       form.type,
      quantity:   finalQty,
      unit_price: price,
      notes:      form.notes
    })

    setSubmitting(false)

    if (error) {
      setMessage('Error saving: ' + error.message)
    } else {
      setMessage('✅ Entry saved!')
      setForm({ product_id: '', type: 'sale', quantity: '', unit_price: '', notes: '' })
      setSelectedProduct(null)
      setCurrentStock(null)
      onSuccess()
    }
  }

  // ── Styles ────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '9px 12px', marginBottom: '14px',
    border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '14px', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', marginBottom: '4px',
    fontSize: '13px', fontWeight: '600', color: '#374151',
  }

  const priceWarning = getPriceWarning()

  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '10px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Log Stock Movement</h3>

      {/* Product */}
      <label style={labelStyle}>Product</label>
      <select
        name="product_id"
        value={form.product_id}
        onChange={e => handleProductChange(e.target.value)}
        style={inputStyle}>
        <option value="">-- Select product --</option>
        {products.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Current stock indicator */}
      {currentStock !== null && (
        <div style={{
          padding: '8px 12px', borderRadius: '6px', marginBottom: '14px',
          marginTop: '-8px',
          background: currentStock <= (selectedProduct?.restock_threshold || 5) ? '#fef2f2' : '#f0fdf4',
          color: currentStock <= (selectedProduct?.restock_threshold || 5) ? '#dc2626' : '#15803d',
          fontSize: '13px', fontWeight: '600',
        }}>
          📦 Current stock: {currentStock} units
          {currentStock <= (selectedProduct?.restock_threshold || 5) && ' — ⚠️ Low stock'}
        </div>
      )}

      {/* Type */}
      <label style={labelStyle}>Movement Type</label>
      <select
        name="type"
        value={form.type}
        onChange={e => handleTypeChange(e.target.value)}
        style={inputStyle}>
        <option value="sale">Sale (stock out)</option>
        <option value="purchase">Purchase (stock in)</option>
        <option value="adjustment">Adjustment (stock in)</option>
        <option value="return">Return (stock in)</option>
      </select>

      {/* Quantity */}
      <label style={labelStyle}>Quantity</label>
      <input
        type="number" name="quantity" min="1"
        placeholder="e.g. 3"
        value={form.quantity} onChange={handleChange}
        style={{
          ...inputStyle,
          // Highlight red if quantity exceeds stock on a sale
          borderColor: form.type === 'sale' && currentStock !== null
            && Number(form.quantity) > currentStock
            ? '#dc2626' : '#d1d5db'
        }}
      />
      {form.type === 'sale' && currentStock !== null
        && Number(form.quantity) > currentStock && (
        <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '-10px', marginBottom: '10px' }}>
          ⛔ Exceeds available stock ({currentStock} units)
        </p>
      )}

      {/* Unit Price */}
      <label style={labelStyle}>
        Unit Price (KES)
        {selectedProduct && (
          <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>
            Cost: KES {selectedProduct.cost_price.toLocaleString()} 
            &nbsp;·&nbsp; 
            Selling: KES {selectedProduct.selling_price.toLocaleString()}
          </span>
        )}
      </label>
      <input
        type="number" name="unit_price"
        placeholder="e.g. 1500"
        value={form.unit_price} onChange={handleChange}
        style={{
          ...inputStyle,
          borderColor: priceWarning?.level === 'error' ? '#dc2626'
            : priceWarning?.level === 'warning' ? '#f59e0b'
            : '#d1d5db'
        }}
      />

      {/* Price warning banner */}
      {priceWarning && (
        <div style={{
          padding: '10px 12px', borderRadius: '6px',
          marginTop: '-8px', marginBottom: '14px',
          background: priceWarning.level === 'error' ? '#fef2f2' : '#fffbeb',
          color:      priceWarning.level === 'error' ? '#dc2626' : '#b45309',
          fontSize: '13px',
        }}>
          {priceWarning.text}
        </div>
      )}

      {/* Notes */}
      <label style={labelStyle}>Notes (optional)</label>
      <input
        type="text" name="notes"
        placeholder="e.g. Market day sale"
        value={form.notes} onChange={handleChange}
        style={inputStyle}
      />

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || priceWarning?.level === 'error'}
        style={{
          width: '100%', padding: '12px',
          background: submitting || priceWarning?.level === 'error'
            ? '#9ca3af' : '#2563eb',
          color: 'white', border: 'none', borderRadius: '6px',
          cursor: submitting || priceWarning?.level === 'error'
            ? 'not-allowed' : 'pointer',
          fontSize: '15px', fontWeight: '600',
        }}>
        {submitting ? 'Saving...' : 'Save Entry'}
      </button>

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
  )
}