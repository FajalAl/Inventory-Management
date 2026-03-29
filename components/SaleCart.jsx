// components/SaleCart.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Printable Receipt ─────────────────────────────────
function Receipt({ sale, items, staffName, onClose }) {
  const printRef = useRef()

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Receipt ${sale.receipt_number}</title>
          <style>
            body { font-family: monospace; max-width: 320px; margin: 0 auto; padding: 20px; }
            h2 { text-align: center; margin: 0; }
            p { margin: 4px 0; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 4px 0; font-size: 13px; }
            .right { text-align: right; }
            .total { font-weight: bold; font-size: 15px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: '32px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div ref={printRef}>
          <h2 style={{ textAlign: 'center', marginBottom: '4px' }}>📦 RECEIPT</h2>
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280',
            marginBottom: '16px' }}>
            {sale.receipt_number}<br />
            {new Date(sale.created_at).toLocaleString('en-KE')}<br />
            Served by: {staffName}
            {sale.customer_name && <><br />Customer: {sale.customer_name}</>}
          </p>

          <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }} />

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <td style={{ fontSize: '12px', color: '#6b7280', paddingBottom: '6px' }}>Item</td>
                <td style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>Qty</td>
                <td style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>Price</td>
                <td style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>Total</td>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: '5px 0', fontSize: '13px' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', fontSize: '13px' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', fontSize: '13px' }}>
                    {item.unit_price.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>
                    {item.subtotal.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between',
            fontWeight: '700', fontSize: '16px' }}>
            <span>TOTAL</span>
            <span>KES {total.toLocaleString()}</span>
          </div>

          {sale.notes && (
            <p style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
              Note: {sale.notes}
            </p>
          )}

          <p style={{ textAlign: 'center', fontSize: '12px',
            color: '#9ca3af', marginTop: '16px' }}>
            Thank you for your purchase! 🛍️
          </p>
        </div>

        {/* Buttons — outside printRef so they don't print */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', background: '#f3f4f6',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontWeight: '600', fontSize: '14px',
          }}>Close</button>
          <button onClick={handlePrint} style={{
            flex: 2, padding: '10px', background: '#2563eb',
            color: 'white', border: 'none', borderRadius: '6px',
            cursor: 'pointer', fontWeight: '600', fontSize: '14px',
          }}>🖨️ Print Receipt</button>
        </div>
      </div>
    </div>
  )
}

// ── Main SaleCart Component ───────────────────────────
export default function SaleCart({ onSaleComplete }) {
  const [categories, setCategories]     = useState([])
  const [products, setProducts]         = useState([])
  const [stockMap, setStockMap]         = useState({})
  const [selectedCategory, setSelectedCategory] = useState('')
  const [cart, setCart]                 = useState([])
  const [customer, setCustomer]         = useState('')
  const [notes, setNotes]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [message, setMessage]           = useState('')
  const [completedSale, setCompletedSale] = useState(null)
  const [staffName, setStaffName]       = useState('')

  // Load everything on mount
  useEffect(() => {
    loadData()
    loadStaffName()
  }, [])

  const loadStaffName = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('users').select('full_name').eq('id', user.id).single()
    setStaffName(data?.full_name || 'Staff')
  }

  const loadData = async () => {
    // Categories
    const { data: cats } = await supabase
      .from('categories').select('id, name').order('name')
    setCategories(cats || [])

    // Products with prices
    const { data: prods } = await supabase
      .from('products')
      .select('id, name, cost_price, selling_price, category_id, categories(name)')
      .eq('is_active', true)
      .order('name')
    setProducts(prods || [])

    // Stock levels
    const { data: movements } = await supabase
      .from('stock_movements').select('product_id, quantity')
    const map = {}
    ;(movements || []).forEach(({ product_id, quantity }) => {
      map[product_id] = (map[product_id] || 0) + quantity
    })
    setStockMap(map)
  }

  // Filter products by selected category
  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products

  // ── Cart operations ──────────────────────────────────
  const addToCart = (product) => {
    const stock = stockMap[product.id] || 0
    const inCart = cart.find(i => i.product_id === product.id)
    const currentQty = inCart?.quantity || 0

    if (currentQty >= stock) {
      setMessage(`⛔ Not enough stock for ${product.name} (${stock} available)`)
      return
    }

    setMessage('')
    if (inCart) {
      setCart(cart.map(i => i.product_id === product.id
        ? { ...i, quantity: i.quantity + 1,
            subtotal: (i.quantity + 1) * i.unit_price }
        : i
      ))
    } else {
      setCart([...cart, {
        product_id:   product.id,
        name:         product.name,
        cost_price:   product.cost_price,
        unit_price:   product.selling_price,
        quantity:     1,
        subtotal:     product.selling_price,
        stock,
      }])
    }
  }

  const updateCartPrice = (product_id, newPrice) => {
    setCart(cart.map(i => i.product_id === product_id
      ? { ...i, unit_price: Number(newPrice),
          subtotal: i.quantity * Number(newPrice) }
      : i
    ))
  }

  const updateCartQty = (product_id, newQty) => {
    const item = cart.find(i => i.product_id === product_id)
    if (!item) return
    const qty = Math.max(1, Math.min(Number(newQty), item.stock))
    setCart(cart.map(i => i.product_id === product_id
      ? { ...i, quantity: qty, subtotal: qty * i.unit_price }
      : i
    ))
  }

  const removeFromCart = (product_id) => {
    setCart(cart.filter(i => i.product_id !== product_id))
  }

  const cartTotal = cart.reduce((s, i) => s + i.subtotal, 0)

  // ── Price warning per cart item ──────────────────────
  const getPriceFlag = (item) => {
    if (item.unit_price < item.cost_price) return 'loss'
    if (item.unit_price > item.unit_price * 1.0 &&
        item.unit_price !== item.unit_price) return null
    const product = products.find(p => p.id === item.product_id)
    if (!product) return null
    if (item.unit_price < product.selling_price) return 'discount'
    if (item.unit_price > product.selling_price) return 'above'
    return null
  }

  // ── Complete the sale ────────────────────────────────
  const handleCompleteSale = async () => {
    setMessage('')

    if (cart.length === 0) {
      setMessage('Add at least one product to the cart.')
      return
    }

    // Block loss sales
    const lossItems = cart.filter(i => i.unit_price < i.cost_price)
    if (lossItems.length > 0) {
      setMessage(`⛔ ${lossItems[0].name} is priced below cost. Fix before completing sale.`)
      return
    }

    setSubmitting(true)

    // ── CIA: Verify staff session ────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      setMessage('Session expired. Please log in again.')
      setSubmitting(false)
      setTimeout(() => { window.location.href = '/' }, 2000)
      return
    }

    // ── 1. Generate receipt number ───────────────────
    const { data: receiptData } = await supabase
      .rpc('generate_receipt_number')
    const receiptNumber = receiptData

    // ── 2. Create the sale record ────────────────────
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        receipt_number: receiptNumber,
        staff_id:       user.id,
        customer_name:  customer.trim() || null,
        notes:          notes.trim() || null,
        total_amount:   cartTotal,
      })
      .select()
      .single()

    if (saleError) {
      setMessage('Error creating sale: ' + saleError.message)
      setSubmitting(false)
      return
    }

    // ── 3. Insert sale items ─────────────────────────
    const saleItems = cart.map(i => ({
      sale_id:    sale.id,
      product_id: i.product_id,
      quantity:   i.quantity,
      unit_price: i.unit_price,
    }))

    const { error: itemsError } = await supabase
      .from('sale_items').insert(saleItems)

    if (itemsError) {
      setMessage('Error saving items: ' + itemsError.message)
      setSubmitting(false)
      return
    }

    // ── 4. Log stock movements for each item ─────────
    const movements = cart.map(i => ({
      product_id: i.product_id,
      user_id:    user.id,
      type:       'sale',
      quantity:   -Math.abs(i.quantity),
      unit_price: i.unit_price,
      notes:      `Sale ${receiptNumber}`,
    }))

    const { error: movError } = await supabase
      .from('stock_movements').insert(movements)

    if (movError) {
      setMessage('Sale saved but stock movement error: ' + movError.message)
      setSubmitting(false)
      return
    }

    // ── 5. Show receipt ──────────────────────────────
    setCompletedSale({
      ...sale,
      items: cart.map(i => ({
        name:       i.name,
        quantity:   i.quantity,
        unit_price: i.unit_price,
        subtotal:   i.subtotal,
      })),
    })

    setCart([])
    setCustomer('')
    setNotes('')
    setSubmitting(false)
    onSaleComplete()
    loadData() // Refresh stock
  }

  // ── Styles ───────────────────────────────────────
  const inputStyle = {
    padding: '8px 12px', border: '1px solid #d1d5db',
    borderRadius: '6px', fontSize: '14px',
    boxSizing: 'border-box', width: '100%',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>

      {/* ── LEFT: Product picker ──────────────────── */}
      <div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px',
          alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>🛍️ New Sale</h3>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ ...inputStyle, width: 'auto', flex: 1 }}>
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px' }}>
          {filteredProducts.map(product => {
            const stock  = stockMap[product.id] || 0
            const inCart = cart.find(i => i.product_id === product.id)
            const outOfStock = stock <= 0

            return (
              <button
                key={product.id}
                onClick={() => !outOfStock && addToCart(product)}
                disabled={outOfStock}
                style={{
                  background: outOfStock ? '#f9fafb'
                    : inCart ? '#eff6ff' : 'white',
                  border: inCart ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  borderRadius: '10px', padding: '14px',
                  textAlign: 'left', cursor: outOfStock ? 'not-allowed' : 'pointer',
                  opacity: outOfStock ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                }}>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '13px',
                  color: '#111827', lineHeight: 1.3 }}>
                  {product.name}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  {product.categories?.name}
                </p>
                <p style={{ margin: '6px 0 0', fontWeight: '700',
                  color: '#2563eb', fontSize: '14px' }}>
                  KES {product.selling_price?.toLocaleString()}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '11px',
                  color: stock <= 5 ? '#dc2626' : '#6b7280' }}>
                  {outOfStock ? '❌ Out of stock' : `${stock} in stock`}
                  {inCart && ` · ${inCart.quantity} in cart`}
                </p>
              </button>
            )
          })}
        </div>

        {message && (
          <div style={{
            marginTop: '16px', padding: '10px 14px', borderRadius: '6px',
            background: '#fef2f2', color: '#dc2626', fontSize: '13px',
          }}>
            {message}
          </div>
        )}
      </div>

      {/* ── RIGHT: Cart ───────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: '10px', padding: '20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', height: 'fit-content',
        position: 'sticky', top: '20px',
      }}>
        <h4 style={{ margin: '0 0 16px', color: '#111827' }}>
          🛒 Cart {cart.length > 0 && `(${cart.length} item${cart.length > 1 ? 's' : ''})`}
        </h4>

        {cart.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center',
            padding: '30px 0', fontSize: '14px' }}>
            Tap a product to add it
          </p>
        ) : (
          <>
            {cart.map(item => {
              const product  = products.find(p => p.id === item.product_id)
              const isLoss   = item.unit_price < item.cost_price
              const isAbove  = product && item.unit_price > product.selling_price
              const isDiscount = product && item.unit_price < product.selling_price
                && item.unit_price >= item.cost_price

              return (
                <div key={item.product_id} style={{
                  borderBottom: '1px solid #f3f4f6',
                  paddingBottom: '12px', marginBottom: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start' }}>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '13px',
                      flex: 1, paddingRight: '8px' }}>
                      {item.name}
                    </p>
                    <button onClick={() => removeFromCart(item.product_id)}
                      style={{ background: 'none', border: 'none',
                        color: '#dc2626', cursor: 'pointer', fontSize: '16px',
                        padding: 0, lineHeight: 1 }}>×</button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px',
                    marginTop: '8px', alignItems: 'center' }}>
                    {/* Quantity */}
                    <div style={{ display: 'flex', alignItems: 'center',
                      border: '1px solid #d1d5db', borderRadius: '6px',
                      overflow: 'hidden' }}>
                      <button
                        onClick={() => updateCartQty(item.product_id, item.quantity - 1)}
                        style={{ padding: '4px 10px', background: '#f9fafb',
                          border: 'none', cursor: 'pointer', fontWeight: '700' }}>
                        −
                      </button>
                      <span style={{ padding: '4px 10px', fontSize: '14px',
                        fontWeight: '600' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQty(item.product_id, item.quantity + 1)}
                        style={{ padding: '4px 10px', background: '#f9fafb',
                          border: 'none', cursor: 'pointer', fontWeight: '700' }}>
                        +
                      </button>
                    </div>

                    {/* Unit price — editable */}
                    <div style={{ flex: 1 }}>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={e => updateCartPrice(item.product_id, e.target.value)}
                        style={{
                          ...inputStyle,
                          borderColor: isLoss ? '#dc2626'
                            : isAbove ? '#f59e0b'
                            : isDiscount ? '#3b82f6' : '#d1d5db',
                          fontWeight: '600',
                        }}
                      />
                    </div>

                    <span style={{ fontWeight: '700', fontSize: '13px',
                      color: '#111827', minWidth: '70px', textAlign: 'right' }}>
                      KES {item.subtotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Price flags */}
                  {isLoss && (
                    <p style={{ margin: '4px 0 0', fontSize: '11px',
                      color: '#dc2626', fontWeight: '600' }}>
                      ⛔ Below cost (KES {item.cost_price.toLocaleString()}) — selling at a loss
                    </p>
                  )}
                  {isAbove && (
                    <p style={{ margin: '4px 0 0', fontSize: '11px',
                      color: '#b45309' }}>
                      ⬆️ Above standard price (KES {product.selling_price.toLocaleString()})
                    </p>
                  )}
                  {isDiscount && (
                    <p style={{ margin: '4px 0 0', fontSize: '11px',
                      color: '#2563eb' }}>
                      🏷️ Discounted from KES {product.selling_price.toLocaleString()}
                    </p>
                  )}
                </div>
              )
            })}

            {/* Customer name */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6b7280',
                display: 'block', marginBottom: '4px' }}>
                Customer name (optional)
              </label>
              <input
                value={customer}
                onChange={e => setCustomer(e.target.value)}
                placeholder="e.g. Jane Wanjiku"
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#6b7280',
                display: 'block', marginBottom: '4px' }}>
                Notes (optional)
              </label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Paid by M-Pesa"
                style={inputStyle}
              />
            </div>

            {/* Total */}
            <div style={{
              background: '#f8fafc', borderRadius: '8px',
              padding: '14px', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                fontWeight: '700', fontSize: '18px', color: '#111827' }}>
                <span>Total</span>
                <span>KES {cartTotal.toLocaleString()}</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </p>
            </div>

            {/* Complete sale */}
            <button
              onClick={handleCompleteSale}
              disabled={submitting || cart.some(i => i.unit_price < i.cost_price)}
              style={{
                width: '100%', padding: '13px',
                background: submitting ||
                  cart.some(i => i.unit_price < i.cost_price)
                  ? '#9ca3af' : '#16a34a',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: submitting ||
                  cart.some(i => i.unit_price < i.cost_price)
                  ? 'not-allowed' : 'pointer',
                fontSize: '16px', fontWeight: '700',
              }}>
              {submitting ? 'Processing...' : '✅ Complete Sale & Print Receipt'}
            </button>

            <button
              onClick={() => setCart([])}
              style={{
                width: '100%', padding: '10px', marginTop: '8px',
                background: 'none', border: '1px solid #e5e7eb',
                borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', color: '#6b7280',
              }}>
              🗑️ Clear Cart
            </button>
          </>
        )}
      </div>

      {/* ── Receipt Modal ─────────────────────────── */}
      {completedSale && (
        <Receipt
          sale={completedSale}
          items={completedSale.items}
          staffName={staffName}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  )
}