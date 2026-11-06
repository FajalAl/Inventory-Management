
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// The database enforces every rule. This hook only decides what to display.
// Deny by default: any error means no permissions.
export function usePermissions() {
  const [permissions, setPermissions] = useState([])
  const [loaded, setLoaded]           = useState(false)

  useEffect(() => {
    let active = true
    supabase.rpc('my_permissions').then(({ data, error }) => {
      if (!active) return
      setPermissions(!error && Array.isArray(data) ? data : [])
      setLoaded(true)
    })
    return () => { active = false }
  }, [])

  const can = useCallback((key) => permissions.includes(key), [permissions])

  return { can, permissions, loaded }
}