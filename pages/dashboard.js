// pages/dashboard.js — Boutique Dashboard Shell
// Replace your existing dashboard.js with this file.
// All your existing imports (StockForm, ProductForm, etc.) stay the same.
// Only the visual shell changes.

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

export default function Dashboard() {
  const [session, setSession]       = useState(null)
  const [profile, setProfile]       = useState(null)
  const [activeTab, setActiveTab]   = useState('inventory')
  const [editingProduct, setEditingProduct] = useState(null)
  const [deactivating, setDeactivating]     = useState(null)
  const [sidebarOpen, setSidebarOpen]       = useState(true)

  const { products, movements, loading, getStock, refreshAll } = useInventory()

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (error || !user) { window.location.href = '/'; return }

      const { data } = await supabase
        .from('users')
        .select('full_name, role, must_change_password, can_manage_stock')
        .eq('id', user.id)
        .single()

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
    if (!confirm(`Remove "${product.name}" from active inventory?\n\nAll history will be preserved.`)) return
    setDeactivating(product.id)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { alert('Session expired.'); setDeactivating(null); window.location.href = '/'; return }
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', product.id)
    setDeactivating(null)
    if (error) alert('Error: ' + error.message)
    else refreshAll()
  }

  // Low stock products
  const lowStockProducts = products.filter(p => getStock(p.id) <= p.restock_threshold)
  const todaySales = movements
    .filter(m => { const today = new Date().toDateString(); return m.type === 'sale' && new Date(m.created_at).toDateString() === today })
    .reduce((sum, m) => sum + (Math.abs(m.quantity) * m.unit_price), 0)

  if (!session) return <div style={loadingStyle}>Authenticating...</div>
  if (loading)  return <div style={loadingStyle}>Loading inventory...</div>

  // ── Nav items ─────────────────────────────────────────
  const navItems = [
    { id: 'inventory',   icon: '◫',  label: 'Inventory',       roles: ['admin', 'staff'] },
    { id: 'sell',        icon: '✦',  label: 'New Sale',         roles: ['admin', 'staff'] },
    { id: 'movements',   icon: '↕',  label: 'Transactions',     roles: ['admin', 'staff'] },
    { id: 'alerts',      icon: '◈',  label: `Restock ${lowStockProducts.length > 0 ? `(${lowStockProducts.length})` : ''}`, roles: ['admin', 'staff'] },
    { id: 'analytics',   icon: '◉',  label: 'Analytics',        roles: ['admin', 'staff'] },
    { id: 'addProduct',  icon: '+',  label: 'Add Product',      roles: ['admin', 'staff'] },
    { id: 'log',         icon: '↓',  label: 'Log Purchase',     roles: ['admin'], extraCheck: (p) => p?.role === 'admin' || p?.can_manage_stock },
    { id: 'staff',       icon: '◎',  label: 'Staff',            roles: ['admin'] },
  ]

  const visibleNav = navItems.filter(item => {
    if (item.extraCheck) return item.extraCheck(profile)
    return item.roles.includes(profile?.role)
  })

  return (
    <>
      <Head>
        <title>Dashboard — La Boutique</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.root}>

        {/* ── Sidebar ─────────────────────────────────── */}
        <aside style={{...s.sidebar, width: sidebarOpen ? '220px' : '64px'}}>

          {/* Logo */}
          <div style={s.sidebarLogo}>
            <span style={s.logoMark}>✦</span>
            {sidebarOpen && <span style={s.logoText}>La Boutique</span>}
          </div>

          {/* Nav */}
          <nav style={s.nav}>
            {visibleNav.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  ...s.navItem,
                  background: activeTab === item.id ? 'rgba(206,177,122,0.15)' : 'transparent',
                  color: activeTab === item.id ? '#CEB17A' : '#9B9B8C',
                  borderLeft: activeTab === item.id ? '2px solid #CEB17A' : '2px solid transparent',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                }}
                title={!sidebarOpen ? item.label : undefined}
              >
                <span style={{...s.navIcon, color: activeTab === item.id ? '#FAB416' : '#9B9B8C'}}>
                  {item.icon}
                </span>
                {sidebarOpen && <span style={s.navLabel}>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div style={s.sidebarFooter}>
            {sidebarOpen && (
              <div style={s.userInfo}>
                <div style={s.userAvatar}>
                  {profile?.full_name?.[0] || '?'}
                </div>
                <div>
                  <p style={s.userName}>{profile?.full_name}</p>
                  <p style={s.userRole}>{profile?.role}</p>
                </div>
              </div>
            )}
            <button onClick={handleLogout} style={s.logoutBtn} title="Sign out">
              ⎋
            </button>
          </div>
        </aside>

        {/* ── Main area ────────────────────────────────── */}
        <main style={s.main}>

          {/* Top bar */}
          <header style={s.topbar}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={s.menuToggle}>
              {sidebarOpen ? '←' : '→'}
            </button>
            <div style={s.topbarTitle}>
              <span style={s.topbarEyebrow}>
                {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <h1 style={s.topbarHeading}>
                {visibleNav.find(n => n.id === activeTab)?.label || 'Dashboard'}
              </h1>
            </div>
          </header>

          {/* Content */}
          <div style={s.content}>

            {/* ── Stats row (shown on inventory + analytics) ── */}
            {['inventory', 'analytics'].includes(activeTab) && (
              <div style={s.statsRow}>
                {[
                  { label: 'Products',      value: products.length,           accent: '#CEB17A', icon: '◫' },
                  { label: 'Low Stock',     value: lowStockProducts.length,   accent: '#D68C4C', icon: '◈' },
                  { label: "Today's Sales", value: `KES ${todaySales.toLocaleString()}`, accent: '#FAB416', icon: '✦' },
                ].map(stat => (
                  <div key={stat.label} style={s.statCard}>
                    <div style={{...s.statIcon, background: stat.accent + '20', color: stat.accent}}>
                      {stat.icon}
                    </div>
                    <div>
                      <p style={s.statLabel}>{stat.label}</p>
                      <p style={{...s.statValue, color: stat.accent}}>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Inventory tab ─────────────────────────── */}
            {activeTab === 'inventory' && (
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <h3 style={s.cardTitle}>All Products</h3>
                  <span style={s.cardCount}>{products.length} items</span>
                </div>
                <div style={{overflowX: 'auto'}}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {['Product', 'Category', 'SKU', 'Cost', 'Selling', 'Stock', 'Status', ...(profile?.role === 'admin' ? ['Actions'] : [])].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(product => {
                        const stock = getStock(product.id)
                        const isLow = stock <= product.restock_threshold
                        return (
                          <tr key={product.id} style={s.tr}>
                            <td style={{...s.td, fontWeight: 500}}>{product.name}</td>
                            <td style={{...s.td, ...s.tdMuted}}>{product.categories?.name || '—'}</td>
                            <td style={{...s.td, ...s.tdMuted, fontSize: '12px', letterSpacing: '0.05em'}}>{product.sku || '—'}</td>
                            <td style={s.td}>KES {product.cost_price?.toLocaleString()}</td>
                            <td style={{...s.td, color: '#4B442D', fontWeight: 500}}>KES {product.selling_price?.toLocaleString()}</td>
                            <td style={{...s.td, fontWeight: 700, color: isLow ? '#8B2E2E' : '#4A7C59'}}>
                              {stock}
                            </td>
                            <td style={s.td}>
                              <span style={isLow ? s.badgeWarn : s.badgeOk}>
                                {isLow ? '⚠ Restock' : '✓ OK'}
                              </span>
                            </td>
                            {profile?.role === 'admin' && (
                              <td style={s.td}>
                                <div style={{display: 'flex', gap: '6px'}}>
                                  <button onClick={() => setEditingProduct(product)} style={s.btnEdit}>Edit</button>
                                  <button onClick={() => handleDeactivate(product)} disabled={deactivating === product.id} style={s.btnRemove}>
                                    {deactivating === product.id ? '...' : 'Remove'}
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

            {/* ── New Sale tab ──────────────────────────── */}
            {activeTab === 'sell' && <SaleCart onSaleComplete={refreshAll} />}

            {/* ── Transaction log ───────────────────────── */}
            {activeTab === 'movements' && (
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <h3 style={s.cardTitle}>Transaction Log</h3>
                  <span style={s.cardCount}>Last 50 entries</span>
                </div>
                <div style={{overflowX: 'auto'}}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {['Date', 'Product', 'Type', 'Qty', 'Unit Price', 'Total', 'By', 'Notes'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map(m => (
                        <tr key={m.id} style={s.tr}>
                          <td style={{...s.td, ...s.tdMuted, fontSize: '12px'}}>
                            {new Date(m.created_at).toLocaleDateString('en-KE')}
                          </td>
                          <td style={{...s.td, fontWeight: 500}}>{m.products?.name}</td>
                          <td style={s.td}>
                            <span style={m.type === 'sale' ? s.badgeSale : s.badgePurchase}>
                              {m.type}
                            </span>
                          </td>
                          <td style={{...s.td, fontWeight: 700, color: m.quantity < 0 ? '#8B2E2E' : '#4A7C59'}}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td style={s.td}>KES {m.unit_price?.toLocaleString()}</td>
                          <td style={{...s.td, fontWeight: 600}}>
                            KES {(Math.abs(m.quantity) * m.unit_price).toLocaleString()}
                          </td>
                          <td style={{...s.td, ...s.tdMuted, fontSize: '12px'}}>{m.users?.full_name || '—'}</td>
                          <td style={{...s.td, ...s.tdMuted, fontSize: '12px'}}>{m.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Restock alerts ────────────────────────── */}
            {activeTab === 'alerts' && (
              <div>
                {lowStockProducts.length === 0 ? (
                  <div style={s.emptyState}>
                    <span style={s.emptyIcon}>✓</span>
                    <p style={s.emptyText}>All products are sufficiently stocked</p>
                  </div>
                ) : (
                  <div style={{display: 'grid', gap: '12px'}}>
                    {lowStockProducts.map(p => (
                      <div key={p.id} style={s.alertCard}>
                        <div>
                          <p style={s.alertName}>{p.name}</p>
                          <p style={s.alertCategory}>{p.categories?.name || '—'}</p>
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <p style={s.alertQty}>{getStock(p.id)} left</p>
                          <p style={s.alertThreshold}>Threshold: {p.restock_threshold}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Analytics ─────────────────────────────── */}
            {activeTab === 'analytics' && <Analytics />}

            {/* ── Add Product ───────────────────────────── */}
            {activeTab === 'addProduct' && ['admin', 'staff'].includes(profile?.role) && (
              <div style={{maxWidth: '540px'}}>
                <ProductForm onSuccess={refreshAll} />
              </div>
            )}

            {/* ── Log Purchase ──────────────────────────── */}
            {activeTab === 'log' && (profile?.role === 'admin' || profile?.can_manage_stock) && (
              <div style={{maxWidth: '500px'}}>
                <StockForm onSuccess={refreshAll} />
              </div>
            )}

            {/* ── Staff ─────────────────────────────────── */}
            {activeTab === 'staff' && profile?.role === 'admin' && <StaffManager />}

          </div>
        </main>
      </div>

      {/* Edit modal */}
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

// ── Loading screen ────────────────────────────────────
const loadingStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '20px',
  color: '#9B9B8C',
  background: '#FAF8F4',
  letterSpacing: '0.1em',
}

// ── Design system ─────────────────────────────────────
const s = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#FAF8F4',
    fontFamily: "'Jost', sans-serif",
  },

  // Sidebar
  sidebar: {
    background: 'linear-gradient(180deg, #300E04 0%, #4B442D 100%)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.25s ease',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px',
    borderBottom: '1px solid rgba(206,177,122,0.15)',
  },
  logoMark: {
    fontSize: '20px',
    color: '#FAB416',
    flexShrink: 0,
  },
  logoText: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '20px',
    fontWeight: 400,
    color: '#FAF8F4',
    whiteSpace: 'nowrap',
    letterSpacing: '0.05em',
  },

  // Nav
  nav: {
    flex: 1,
    padding: '16px 0',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '11px 20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
  },
  navIcon: {
    fontSize: '16px',
    flexShrink: 0,
    width: '20px',
    textAlign: 'center',
  },
  navLabel: {
    fontSize: '13px',
  },

  // Sidebar footer
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(206,177,122,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    overflow: 'hidden',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(206,177,122,0.3)',
    color: '#CEB17A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
  },
  userName: {
    color: '#FAF8F4',
    fontSize: '13px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '110px',
  },
  userRole: {
    color: '#9B9B8C',
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#9B9B8C',
    cursor: 'pointer',
    fontSize: '18px',
    flexShrink: 0,
    padding: '4px',
  },

  // Main
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'auto',
  },

  // Topbar
  topbar: {
    background: '#FFFFFF',
    borderBottom: '1px solid #E8E2D6',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  menuToggle: {
    background: 'none',
    border: '1px solid #E8E2D6',
    borderRadius: '4px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    color: '#9B9B8C',
    fontSize: '14px',
    flexShrink: 0,
  },
  topbarTitle: {
    flex: 1,
  },
  topbarEyebrow: {
    fontSize: '11px',
    color: '#9B9B8C',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    display: 'block',
  },
  topbarHeading: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '26px',
    fontWeight: 400,
    color: '#300E04',
    marginTop: '2px',
    lineHeight: 1,
  },

  // Content area
  content: {
    padding: '28px 32px',
    flex: 1,
  },

  // Stats
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#FFFFFF',
    borderRadius: '6px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 4px rgba(48,14,4,0.06)',
    border: '1px solid #E8E2D6',
  },
  statIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  },
  statLabel: {
    fontSize: '11px',
    color: '#9B9B8C',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontWeight: 500,
  },
  statValue: {
    fontSize: '22px',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 500,
    marginTop: '2px',
  },

  // Cards
  card: {
    background: '#FFFFFF',
    borderRadius: '6px',
    border: '1px solid #E8E2D6',
    boxShadow: '0 1px 4px rgba(48,14,4,0.06)',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  cardHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #E8E2D6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '20px',
    fontWeight: 500,
    color: '#300E04',
  },
  cardCount: {
    fontSize: '12px',
    color: '#9B9B8C',
    letterSpacing: '0.05em',
  },

  // Table
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 20px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#9B9B8C',
    background: '#FAF8F4',
    borderBottom: '1px solid #E8E2D6',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #F5F0E8',
    transition: 'background 0.1s',
  },
  td: {
    padding: '13px 20px',
    fontSize: '14px',
    color: '#300E04',
    background: 'white',
  },
  tdMuted: {
    color: '#9B9B8C',
  },

  // Badges
  badgeOk: {
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    background: '#EDF4EF',
    color: '#4A7C59',
  },
  badgeWarn: {
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    background: '#FDF3E8',
    color: '#D68C4C',
  },
  badgeSale: {
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    background: '#F5F0E8',
    color: '#4B442D',
  },
  badgePurchase: {
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    background: '#EDF4EF',
    color: '#4A7C59',
  },

  // Action buttons in table
  btnEdit: {
    padding: '5px 14px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid #E8E2D6',
    borderRadius: '4px',
    background: 'white',
    cursor: 'pointer',
    color: '#4B442D',
    letterSpacing: '0.03em',
  },
  btnRemove: {
    padding: '5px 14px',
    fontSize: '12px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '4px',
    background: '#F9EDED',
    cursor: 'pointer',
    color: '#8B2E2E',
    letterSpacing: '0.03em',
  },

  // Alert cards
  alertCard: {
    background: 'white',
    padding: '18px 24px',
    borderRadius: '6px',
    borderLeft: '3px solid #D68C4C',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #E8E2D6',
    boxShadow: '0 1px 4px rgba(48,14,4,0.06)',
  },
  alertName: {
    fontWeight: 600,
    color: '#300E04',
    fontSize: '14px',
  },
  alertCategory: {
    color: '#9B9B8C',
    fontSize: '12px',
    marginTop: '3px',
  },
  alertQty: {
    color: '#8B2E2E',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '24px',
    fontWeight: 500,
  },
  alertThreshold: {
    color: '#9B9B8C',
    fontSize: '12px',
    marginTop: '2px',
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '60px 32px',
    background: 'white',
    borderRadius: '6px',
    border: '1px solid #E8E2D6',
  },
  emptyIcon: {
    display: 'block',
    fontSize: '32px',
    color: '#4A7C59',
    marginBottom: '12px',
  },
  emptyText: {
    color: '#9B9B8C',
    fontSize: '15px',
    letterSpacing: '0.05em',
  },
}