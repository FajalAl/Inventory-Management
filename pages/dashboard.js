// pages/dashboard.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useInventory } from '../hooks/useInventory'
import StockForm from '../components/StockForm'
import ProductForm from '../components/ProductForm'
import StaffManager from '../components/StaffManager'
import Analytics from '../components/Analytics'



export default function Dashboard() {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [activeTab, setActiveTab] = useState('inventory') // inventory | movements | alerts

const { products, movements, loading, getStock, refreshAll } = useInventory()

  // Auth guard
 useEffect(() => {
  supabase.auth.getUser().then(async ({ data: { user }, error }) => {
    if (error || !user) { window.location.href = '/'; return }

    const { data: profile } = await supabase
      .from('users')
      .select('full_name, role, must_change_password')  // ← add flag here
      .eq('id', user.id)
      .single()

    // ── Force password change before anything else ──────
    if (profile?.must_change_password) {
      window.location.href = '/change-password'
      return
    }

    setSession(user)
    setProfile(profile)
  })
}, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }


  // Low stock products
  const lowStockProducts = products.filter(p => getStock(p.id) <= p.restock_threshold)

  // Today's sales total
  const todaySales = movements
    .filter(m => {
      const today = new Date().toDateString()
      return m.type === 'sale' && new Date(m.created_at).toDateString() === today
    })
    .reduce((sum, m) => sum + (Math.abs(m.quantity) * m.unit_price), 0)

  if (!session) return <p style={{ padding: '40px' }}>Checking access...</p>
  if (loading)  return <p style={{ padding: '40px' }}>Loading inventory...</p>

  const tabStyle = (tab) => ({
    padding: '10px 20px',
    background: activeTab === tab ? '#2563eb' : '#e5e7eb',
    color: activeTab === tab ? 'white' : 'black',
    border: 'none', cursor: 'pointer',
    borderRadius: '6px', marginRight: '8px'
  })

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f3f4f6' }}>

      {/* Top Bar */}
      <div style={{
        background: 'white', padding: '16px 32px',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: 0 }}>📦 Inventory System</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>👤 {profile?.full_name} ({profile?.role})</span>
          <button onClick={handleLogout}
            style={{ padding: '8px 16px', background: '#ef4444',
              color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '32px' }}>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Products', value: products.length, color: '#2563eb' },
            { label: '⚠️ Low Stock',   value: lowStockProducts.length, color: '#dc2626' },
            { label: "Today's Sales",  value: `KES ${todaySales.toLocaleString()}`, color: '#16a34a' },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1, background: 'white', padding: '20px',
              borderRadius: '8px', borderLeft: `4px solid ${stat.color}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>{stat.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 'bold', color: stat.color }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '20px' }}>
          <button style={tabStyle('inventory')}  onClick={() => setActiveTab('inventory')}>Inventory</button>
          <button style={tabStyle('movements')}  onClick={() => setActiveTab('movements')}>Transaction Log</button>
          <button style={tabStyle('alerts')}     onClick={() => setActiveTab('alerts')}>
            ⚠️ Restock Alerts {lowStockProducts.length > 0 && `(${lowStockProducts.length})`}
          </button>
          <button style={tabStyle('analytics')} onClick={() => setActiveTab('analytics')}>
            📊 Analytics
          </button>

       {/* Log Movement — admin only */}
        {profile?.role === 'admin' && (
          <>
          <button style={tabStyle('log')} onClick={() => setActiveTab('log')}>
            Log Movement
          </button>
                 {/* Add Product — admin and staff */}
          <button style={tabStyle('addProduct')} onClick={() => setActiveTab('addProduct')}>
            ➕ Add Product
          </button>
          {/* STAFF */}
          <button style={tabStyle('staff')} onClick={() => setActiveTab('staff')}>
            👥 Staff
          </button>
            </>
        )}
        </div>
       
           {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Product', 'Category', 'SKU', 'Cost (KES)', 'Selling (KES)', 'In Stock', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left',
                      fontSize: '13px', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const stock = getStock(product.id)
                  const isLow = stock <= product.restock_threshold
                  return (
                    <tr key={product.id}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>{product.name}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{product.categories?.name || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{product.sku || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>{product.cost_price?.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px' }}>{product.selling_price?.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold',
                        color: isLow ? '#dc2626' : '#16a34a' }}>{stock}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '999px', fontSize: '12px',
                          background: isLow ? '#fee2e2' : '#dcfce7',
                          color: isLow ? '#dc2626' : '#16a34a'
                        }}>
                          {isLow ? '⚠️ Restock' : '✅ OK'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Transaction Log Tab */}
        {activeTab === 'movements' && (
          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Date', 'Product', 'Type', 'Qty', 'Unit Price', 'Total', 'By', 'Notes'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left',
                      fontSize: '13px', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{m.products?.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '999px', fontSize: '12px',
                        background: m.type === 'sale' ? '#dbeafe' : '#dcfce7',
                        color: m.type === 'sale' ? '#1d4ed8' : '#15803d'
                      }}>{m.type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold',
                      color: m.quantity < 0 ? '#dc2626' : '#16a34a' }}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td style={{ padding: '12px 16px' }}>KES {m.unit_price?.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      KES {(Math.abs(m.quantity) * m.unit_price).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                      {m.users?.full_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                      {m.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Restock Alerts Tab */}
        {activeTab === 'alerts' && (
          <div>
            {lowStockProducts.length === 0 ? (
              <div style={{ background: 'white', padding: '40px', textAlign: 'center',
                borderRadius: '8px', color: '#16a34a' }}>
                ✅ All products are sufficiently stocked!
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {lowStockProducts.map(p => (
                  <div key={p.id} style={{
                    background: 'white', padding: '16px 20px', borderRadius: '8px',
                    borderLeft: '4px solid #dc2626', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{p.name}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                        Category: {p.categories?.name || '—'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, color: '#dc2626', fontWeight: 'bold', fontSize: '20px' }}>
                        {getStock(p.id)} left
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                        Threshold: {p.restock_threshold}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Log Movement Tab — Admin Only */}
        {activeTab === 'log' && profile?.role === 'admin' && (
          <div style={{ maxWidth: '500px' }}>
            <StockForm onSuccess={refreshAll} />
          </div>
        )}
        {activeTab === 'staff' && profile?.role === 'admin' && (
          <StaffManager />
        )}

        {/* Add Product Tab — Admin And Staff */}
        {activeTab === 'addProduct' && ['admin', 'staff'].includes(profile?.role) && (
          <div style={{ maxWidth: '540px' }}>
            <ProductForm onSuccess={refreshAll} />
            </div>
        )}
        {activeTab === 'analytics' && (
          <Analytics />
        )}

      </div>
    </div>
  )
}