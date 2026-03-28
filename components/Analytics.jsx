// components/Analytics.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── Lightweight bar chart — no external library needed ───
function BarChart({ data, color = '#2563eb', valuePrefix = 'KES ' }) {
  if (!data || data.length === 0) return (
    <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
      No data for this period
    </p>
  )
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px',
      height: '140px', padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <div title={`${valuePrefix}${d.value.toLocaleString()}`} style={{
            width: '100%', background: color, borderRadius: '3px 3px 0 0',
            height: `${Math.max((d.value / max) * 100, 2)}%`,
            transition: 'height 0.3s ease', cursor: 'default',
          }} />
          <span style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px',
            textAlign: 'center', overflow: 'hidden', width: '100%' }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#2563eb', icon }) {
  return (
    <div style={{
      background: 'white', padding: '20px', borderRadius: '10px',
      borderLeft: `4px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', flex: 1,
    }}>
      <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{icon} {label}</p>
      <p style={{ margin: '6px 0 0', fontSize: '22px', fontWeight: '700', color }}>
        {value}
      </p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>{sub}</p>}
    </div>
  )
}

export default function Analytics() {
  const [range, setRange]       = useState(30)
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { loadAnalytics() }, [range])

  const loadAnalytics = async () => {
    setLoading(true)

    const since = new Date()
    since.setDate(since.getDate() - range)
    const sinceISO = since.toISOString()

    // ── Single fetch — all movements in range ────────────
    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select(`
        id,
        type,
        quantity,
        unit_price,
        created_at,
        product_id,
        products (
          id,
          name,
          cost_price,
          selling_price,
          categories ( name )
        )
      `)
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: true })

    if (error || !movements) {
      setLoading(false)
      return
    }

    const sales = movements.filter(m => m.type === 'sale')

    // ── 1. Summary totals ────────────────────────────────
    let totalRevenue  = 0
    let totalCost     = 0
    let totalUnitsSold = 0

    sales.forEach(m => {
      const units = Math.abs(m.quantity)
      totalRevenue   += units * m.unit_price
      totalCost      += units * (m.products?.cost_price || 0)
      totalUnitsSold += units
    })

    const totalProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0
      ? ((totalProfit / totalRevenue) * 100).toFixed(1)
      : 0

    // ── 2. Revenue by day (last N days) ─────────────────
    const dayMap = {}
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
      dayMap[key] = 0
    }
    sales.forEach(m => {
      const key = new Date(m.created_at)
        .toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
      if (dayMap[key] !== undefined) {
        dayMap[key] += Math.abs(m.quantity) * m.unit_price
      }
    })
    // For 30-day view, group into weeks to avoid overcrowding
    let revenueByDay
    if (range <= 7) {
      revenueByDay = Object.entries(dayMap).map(([label, value]) => ({ label, value }))
    } else {
      // Group into ~10 buckets
      const entries  = Object.entries(dayMap)
      const buckets  = 10
      const size     = Math.ceil(entries.length / buckets)
      revenueByDay   = []
      for (let i = 0; i < entries.length; i += size) {
        const chunk = entries.slice(i, i + size)
        revenueByDay.push({
          label: chunk[0][0],
          value: chunk.reduce((s, [, v]) => s + v, 0),
        })
      }
    }

    // ── 3. Top selling products ──────────────────────────
    const productMap = {}
    sales.forEach(m => {
      const id = m.product_id
      if (!productMap[id]) {
        productMap[id] = {
          name:     m.products?.name || 'Unknown',
          category: m.products?.categories?.name || '—',
          units:    0,
          revenue:  0,
          cost:     0,
        }
      }
      const units = Math.abs(m.quantity)
      productMap[id].units   += units
      productMap[id].revenue += units * m.unit_price
      productMap[id].cost    += units * (m.products?.cost_price || 0)
    })

    const topSellers = Object.values(productMap)
      .sort((a, b) => b.units - a.units)
      .slice(0, 8)

    // ── 4. Category performance ──────────────────────────
    const categoryMap = {}
    sales.forEach(m => {
      const cat = m.products?.categories?.name || 'Uncategorised'
      if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, units: 0 }
      const units = Math.abs(m.quantity)
      categoryMap[cat].revenue += units * m.unit_price
      categoryMap[cat].units   += units
    })

    const categoryPerf = Object.entries(categoryMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)

    // ── 5. Slow movers — products with zero sales ────────
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, name, cost_price, categories ( name )')
      .eq('is_active', true)

    const soldIds = new Set(Object.keys(productMap))
    const slowMovers = (allProducts || [])
      .filter(p => !soldIds.has(p.id))

    // ── 6. Best sales day of week ────────────────────────
    const dowMap = { 0:'Sun', 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat' }
    const dowRevenue = { Sun:0, Mon:0, Tue:0, Wed:0, Thu:0, Fri:0, Sat:0 }
    sales.forEach(m => {
      const dow = dowMap[new Date(m.created_at).getDay()]
      dowRevenue[dow] += Math.abs(m.quantity) * m.unit_price
    })
    const bestDay = Object.entries(dowRevenue).sort((a,b) => b[1]-a[1])[0]
    const dowChart = Object.entries(dowRevenue)
      .map(([label, value]) => ({ label, value }))

    setData({
      totalRevenue, totalProfit, totalUnitsSold,
      profitMargin, revenueByDay, topSellers,
      categoryPerf, slowMovers, dowChart, bestDay,
    })
    setLoading(false)
  }

  // ── Styles ───────────────────────────────────────────
  const sectionStyle = {
    background: 'white', padding: '24px', borderRadius: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: '20px',
  }
  const rangeBtn = (val) => ({
    padding: '7px 16px', border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
    background: range === val ? '#2563eb' : '#f3f4f6',
    color:      range === val ? 'white'   : '#374151',
  })

  return (
    <div>
      {/* ── Range selector ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#6b7280', marginRight: '4px' }}>
          Show data for:
        </span>
        {[7, 30, 90].map(v => (
          <button key={v} style={rangeBtn(v)} onClick={() => setRange(v)}>
            Last {v} days
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '60px' }}>
          Loading analytics...
        </p>
      )}

      {!loading && data && (
        <>
          {/* ── Summary cards ────────────────────────────── */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <StatCard
              icon="💰" label="Total Revenue"
              value={`KES ${data.totalRevenue.toLocaleString()}`}
              sub={`Last ${range} days`}
              color="#2563eb"
            />
            <StatCard
              icon="📈" label="Total Profit"
              value={`KES ${data.totalProfit.toLocaleString()}`}
              sub={`${data.profitMargin}% margin`}
              color="#16a34a"
            />
            <StatCard
              icon="🛍️" label="Units Sold"
              value={data.totalUnitsSold.toLocaleString()}
              sub="Across all products"
              color="#7c3aed"
            />
            <StatCard
              icon="📅" label="Best Sales Day"
              value={data.bestDay?.[0] || '—'}
              sub={`KES ${data.bestDay?.[1]?.toLocaleString() || 0} this period`}
              color="#ea580c"
            />
          </div>

          {/* ── Revenue over time ────────────────────────── */}
          <div style={sectionStyle}>
            <h4 style={{ margin: '0 0 16px', color: '#111827' }}>
              💰 Revenue Over Time
            </h4>
            <BarChart data={data.revenueByDay} color="#2563eb" valuePrefix="KES " />
          </div>

          {/* ── Sales by day of week ─────────────────────── */}
          <div style={sectionStyle}>
            <h4 style={{ margin: '0 0 4px', color: '#111827' }}>📅 Busiest Days</h4>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
              Useful for staffing and promotions
            </p>
            <BarChart data={data.dowChart} color="#7c3aed" valuePrefix="KES " />
          </div>

          {/* ── Two columns: top sellers + category ──────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '20px', marginBottom: '20px' }}>

            {/* Top sellers */}
            <div style={sectionStyle}>
              <h4 style={{ margin: '0 0 16px', color: '#111827' }}>🏆 Top Sellers</h4>
              {data.topSellers.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>No sales recorded yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['#', 'Product', 'Units', 'Revenue'].map(h => (
                        <th key={h} style={{
                          padding: '8px 10px', textAlign: 'left',
                          fontSize: '12px', color: '#6b7280',
                          borderBottom: '1px solid #e5e7eb',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topSellers.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 10px', color: '#6b7280',
                          fontSize: '13px' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>
                            {p.name}
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
                            {p.category}
                          </p>
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: '700',
                          color: '#7c3aed', fontSize: '14px' }}>
                          {p.units}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '13px',
                          color: '#16a34a', fontWeight: '600' }}>
                          KES {p.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Category performance */}
            <div style={sectionStyle}>
              <h4 style={{ margin: '0 0 16px', color: '#111827' }}>
                🗂️ Category Performance
              </h4>
              {data.categoryPerf.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>No sales recorded yet.</p>
              ) : (
                data.categoryPerf.map((cat, i) => {
                  const maxRev = data.categoryPerf[0].revenue
                  return (
                    <div key={i} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                        marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>
                          {cat.name}
                        </span>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                          KES {cat.revenue.toLocaleString()} · {cat.units} units
                        </span>
                      </div>
                      <div style={{ background: '#f3f4f6', borderRadius: '999px',
                        height: '8px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '999px',
                          background: '#2563eb',
                          width: `${(cat.revenue / maxRev) * 100}%`,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Profit margin table ───────────────────────── */}
          <div style={sectionStyle}>
            <h4 style={{ margin: '0 0 4px', color: '#111827' }}>📊 Profit by Product</h4>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
              Highlights which products are most profitable to prioritise
            </p>
            {data.topSellers.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No sales data yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Product', 'Revenue', 'Cost', 'Profit', 'Margin %'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontSize: '12px', color: '#6b7280',
                        borderBottom: '1px solid #e5e7eb',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...data.topSellers]
                    .sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost))
                    .map((p, i) => {
                      const profit = p.revenue - p.cost
                      const margin = p.revenue > 0
                        ? ((profit / p.revenue) * 100).toFixed(1)
                        : 0
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '500',
                            fontSize: '13px' }}>{p.name}</td>
                          <td style={{ padding: '10px 14px', fontSize: '13px' }}>
                            KES {p.revenue.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '13px',
                            color: '#6b7280' }}>
                            KES {p.cost.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: '700',
                            color: profit >= 0 ? '#16a34a' : '#dc2626',
                            fontSize: '13px' }}>
                            KES {profit.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: '999px',
                              fontSize: '12px', fontWeight: '600',
                              background: margin >= 40 ? '#dcfce7'
                                : margin >= 20 ? '#fef9c3' : '#fee2e2',
                              color: margin >= 40 ? '#15803d'
                                : margin >= 20 ? '#854d0e' : '#dc2626',
                            }}>
                              {margin}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Slow movers ───────────────────────────────── */}
          <div style={sectionStyle}>
            <h4 style={{ margin: '0 0 4px', color: '#111827' }}>
              🐌 Slow Movers
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
              No sales in the last {range} days — consider discounting or discontinuing
            </p>
            {data.slowMovers.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center',
                color: '#16a34a', fontWeight: '600' }}>
                ✅ Everything has sold at least once this period!
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {data.slowMovers.map((p, i) => (
                  <div key={i} style={{
                    padding: '10px 16px', background: '#fef9c3',
                    borderRadius: '8px', border: '1px solid #fde68a',
                  }}>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '13px' }}>
                      {p.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#92400e' }}>
                      {p.categories?.name || '—'} · Cost: KES {p.cost_price?.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}