// hooks/useInventory.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useInventory() {
  const [products, setProducts]     = useState([])
  const [movements, setMovements]   = useState([])
  const [stockMap, setStockMap]     = useState({}) // productId → stock count
  const [loading, setLoading]       = useState(true)

  // ── Fetch all products ──────────────────────────────────
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        selling_price,
        cost_price,
        restock_threshold,
        is_active,
        categories ( name )
      `)
      .eq('is_active', true)
      .order('name')

    if (!error) setProducts(data || [])
  }

  // ── Fetch last 50 movements for the transaction log ─────
  // This is display-only — NOT used for stock calculations
  const fetchMovements = async () => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        id,
        product_id,
        type,
        quantity,
        unit_price,
        notes,
        created_at,
        products ( name ),
        users ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error) setMovements(data || [])
  }

  // ── Fetch REAL stock levels — all movements, grouped ────
  // This is the source of truth for stock counts
  const fetchStockLevels = async () => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('product_id, quantity')
    // No limit — we need every movement ever recorded

    if (!error && data) {
      const map = {}
      data.forEach(({ product_id, quantity }) => {
        map[product_id] = (map[product_id] || 0) + quantity
      })
      setStockMap(map)
    }
  }

  // ── Safe getter used everywhere in the dashboard ────────
  const getStock = (productId) => stockMap[productId] ?? 0

  // ── Refresh all three independently ─────────────────────
  const refreshAll = () => {
    return Promise.all([
      fetchProducts(),
      fetchMovements(),
      fetchStockLevels(),
    ])
  }

  useEffect(() => {
    refreshAll().finally(() => setLoading(false))
  }, [])

  return {
    products,
    movements,
    stockMap,
    loading,
    getStock,         // ← use this everywhere, never recalculate inline
    fetchProducts,
    fetchMovements,
    fetchStockLevels,
    refreshAll,
  }
}