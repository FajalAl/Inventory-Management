// pages/dashboard.js
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { useInventory } from '../hooks/useInventory'
import StockForm from '../components/StockForm'
import ProductForm from '../components/ProductForm'
import StaffManager from '../components/StaffManager'
import Analytics from '../components/Analytics'
import SaleCart from '../components/SaleCart'
import EditProductModal from '../components/EditProductModal'

// ── SVG Icons (inline, no library needed) ─────────────
const Icon = ({ name, size = 18 }) => {
  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    bag: <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    box: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}

export default function Dashboard() {
  const [session, setSession]         = useState(null)
  const [profile, setProfile]         = useState(null)
  const [activeTab, setActiveTab]     = useState('inventory')
  const [editingProduct, setEditingProduct] = useState(null)
  const [deactivating, setDeactivating]     = useState(null)
  const [collapsed, setCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)

  const { products, movements, loading, getStock, refreshAll } = useInventory()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (error || !user) { window.location.href = '/'; return }
      const { data } = await supabase.from('users')
        .select('full_name, role, must_change_password, can_manage_stock')
        .eq('id', user.id).single()
      if (data?.must_change_password) { window.location.href = '/change-password'; return }
      setSession(user)
      setProfile(data)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleDeactivate = async (product) => {
    if (!confirm(`Remove "${product.name}" from active inventory? All history will be preserved.`)) return
    setDeactivating(product.id)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { alert('Session expired.'); setDeactivating(null); window.location.href = '/'; return }
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', product.id)
    setDeactivating(null)
    if (error) alert('Error: ' + error.message)
    else refreshAll()
  }

  const lowStock = products.filter(p => getStock(p.id) <= p.restock_threshold)
  const todaySales = movements
    .filter(m => m.type === 'sale' && new Date(m.created_at).toDateString() === new Date().toDateString())
    .reduce((s, m) => s + Math.abs(m.quantity) * m.unit_price, 0)

  const navigate = (tab) => {
    setActiveTab(tab)
    setMobileOpen(false)
  }

  if (!session) return <div className="loading-screen">Loading...</div>
  if (loading)  return <div className="loading-screen">Loading inventory...</div>

  // ── Nav definition ─────────────────────────────────
  const canStock = profile?.role === 'admin' || profile?.can_manage_stock
  const isAdmin  = profile?.role === 'admin'

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { id: 'inventory', icon: 'grid',  label: 'Inventory' },
        { id: 'analytics', icon: 'chart', label: 'Analytics' },
      ]
    },
    {
      label: 'Sales',
      items: [
        { id: 'sell',      icon: 'bag',   label: 'New Sale' },
        { id: 'movements', icon: 'list',  label: 'Transactions' },
        { id: 'alerts',    icon: 'alert', label: 'Restock Alerts', badge: lowStock.length > 0 ? lowStock.length : null },
      ]
    },
    {
      label: 'Manage',
      items: [
        { id: 'addProduct', icon: 'plus',  label: 'Add Product' },
        ...(canStock ? [{ id: 'log',   icon: 'box',   label: 'Log Purchase' }] : []),
        ...(isAdmin  ? [{ id: 'staff', icon: 'users', label: 'Staff'        }] : []),
      ]
    },
  ]

  const pageTitle = navGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Dashboard'

  return (
    <>
      <Head>
        <title>{pageTitle} - La Boutique</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="dash-root">

        {/* Mobile overlay */}
        <div
          className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
          onClick={() => setMobileOpen(false)}
        />

        {/* ── Sidebar ────────────────────────────────── */}
        <aside className={`dash-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>

          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">LB</div>
            {!collapsed && (
              <div>
                <div className="sidebar-logo-text">La Boutique</div>
                <div className="sidebar-logo-sub">Inventory System</div>
              </div>
            )}
          </div>

          <nav className="sidebar-nav">
            {navGroups.map(group => (
              <div key={group.label}>
                {!collapsed && <div className="nav-section">{group.label}</div>}
                {group.items.map(item => (
                  <button
                    key={item.id}
                    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => navigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                  >
                    <span className="nav-icon"><Icon name={item.icon} size={18} /></span>
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            {!collapsed && (
              <div className="user-avatar">{profile?.full_name?.[0]?.toUpperCase() || 'U'}</div>
            )}
            {!collapsed && (
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div className="user-name">{profile?.full_name}</div>
                <div className="user-role">{profile?.role}</div>
              </div>
            )}
            <button className="btn-logout" onClick={handleLogout} title="Sign out">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </aside>

        {/* ── Main ───────────────────────────────────── */}
        <main className={`dash-main ${collapsed ? 'collapsed' : ''}`}>

          {/* Topbar */}
          <header className="dash-topbar">
            {/* Desktop collapse / mobile hamburger */}
            <button
              className="topbar-toggle"
              onClick={() => {
                if (window.innerWidth <= 768) setMobileOpen(!mobileOpen)
                else setCollapsed(!collapsed)
              }}
            >
              <Icon name={mobileOpen ? 'x' : 'menu'} size={20} />
            </button>
            <h1 className="topbar-heading">{pageTitle}</h1>
            <span className="topbar-date">
              {new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </header>

          {/* Content */}
          <div className="dash-content">

            {/* Stats */}
            {['inventory', 'analytics'].includes(activeTab) && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#f0fdf4', color: '#15803d' }}>
                    <Icon name="grid" size={22} />
                  </div>
                  <div>
                    <div className="stat-label">Total Products</div>
                    <div className="stat-value">{products.length}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
                    <Icon name="alert" size={22} />
                  </div>
                  <div>
                    <div className="stat-label">Low Stock</div>
                    <div className="stat-value">{lowStock.length}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fef9c3', color: '#ca8a04' }}>
                    <Icon name="bag" size={22} />
                  </div>
                  <div>
                    <div className="stat-label">Today Sales</div>
                    <div className="stat-value">KES {todaySales.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Inventory ────────────────────────── */}
            {activeTab === 'inventory' && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">All Products</span>
                  <span className="card-subtitle">{products.length} items</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>SKU</th>
                        <th>Cost (KES)</th>
                        <th>Selling (KES)</th>
                        <th>In Stock</th>
                        <th>Status</th>
                        {isAdmin && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => {
                        const stock = getStock(p.id)
                        const isLow = stock <= p.restock_threshold
                        return (
                          <tr key={p.id}>
                            <td className="td-bold">{p.name}</td>
                            <td className="td-muted">{p.categories?.name || '-'}</td>
                            <td className="td-muted" style={{ fontSize: 12 }}>{p.sku || '-'}</td>
                            <td>{p.cost_price?.toLocaleString()}</td>
                            <td className="td-bold">{p.selling_price?.toLocaleString()}</td>
                            <td className={isLow ? 'td-red' : 'td-green'}>{stock}</td>
                            <td>
                              <span className={`badge ${isLow ? 'badge-orange' : 'badge-green'}`}>
                                {isLow ? 'Restock' : 'OK'}
                              </span>
                            </td>
                            {isAdmin && (
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingProduct(p)}>
                                    Edit
                                  </button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(p)} disabled={deactivating === p.id}>
                                    {deactivating === p.id ? '...' : 'Remove'}
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── New Sale ─────────────────────────── */}
            {activeTab === 'sell' && <SaleCart onSaleComplete={refreshAll} />}

            {/* ── Transactions ─────────────────────── */}
            {activeTab === 'movements' && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Transaction Log</span>
                  <span className="card-subtitle">Last 50 entries</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th>Staff</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map(m => (
                        <tr key={m.id}>
                          <td className="td-muted">{new Date(m.created_at).toLocaleDateString('en-KE')}</td>
                          <td className="td-bold">{m.products?.name}</td>
                          <td>
                            <span className={`badge ${m.type === 'sale' ? 'badge-gray' : 'badge-green'}`}>
                              {m.type}
                            </span>
                          </td>
                          <td className={m.quantity < 0 ? 'td-red' : 'td-green'}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td>KES {m.unit_price?.toLocaleString()}</td>
                          <td className="td-bold">KES {(Math.abs(m.quantity) * m.unit_price).toLocaleString()}</td>
                          <td className="td-muted">{m.users?.full_name || '-'}</td>
                          <td className="td-muted">{m.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Restock Alerts ───────────────────── */}
            {activeTab === 'alerts' && (
              lowStock.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="check" size={24} /></div>
                  <p className="empty-state-text">All products are sufficiently stocked</p>
                </div>
              ) : (
                <div>
                  {lowStock.map(p => (
                    <div key={p.id} className="alert-card">
                      <div>
                        <div className="alert-card-name">{p.name}</div>
                        <div className="alert-card-cat">{p.categories?.name || '-'}</div>
                      </div>
                      <div>
                        <div className="alert-card-qty">{getStock(p.id)} left</div>
                        <div className="alert-card-threshold">Threshold: {p.restock_threshold}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── Analytics ────────────────────────── */}
            {activeTab === 'analytics' && <Analytics />}

            {/* ── Add Product ──────────────────────── */}
            {activeTab === 'addProduct' && (
              <div style={{ maxWidth: 540 }}>
                <ProductForm onSuccess={refreshAll} />
              </div>
            )}

            {/* ── Log Purchase ─────────────────────── */}
            {activeTab === 'log' && canStock && (
              <div style={{ maxWidth: 500 }}>
                <StockForm onSuccess={refreshAll} />
              </div>
            )}

            {/* ── Staff ────────────────────────────── */}
            {activeTab === 'staff' && isAdmin && <StaffManager />}

          </div>
        </main>
      </div>

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => { refreshAll(); setEditingProduct(null) }}
        />
      )}
    </>
  )
}