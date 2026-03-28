// pages/api/staff/toggle.js
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── CIA: Verify admin ────────────────────────────────
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid session' })

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden — admin only' })
  }

  // ── Toggle the target user ───────────────────────────
  const { targetUserId, is_active } = req.body

  if (!targetUserId) {
    return res.status(400).json({ error: 'targetUserId is required' })
  }

  // Prevent admin from deactivating themselves
  if (targetUserId === user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' })
  }

  // Update Supabase Auth — ban/unban the user
  const { error: banError } = await supabaseAdmin.auth.admin.updateUser(
    targetUserId,
    { ban_duration: is_active ? 'none' : '876000h' } // 'none' = active, large number = banned
  )

  if (banError) {
    return res.status(500).json({ error: banError.message })
  }

  // Update public.users is_active flag
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ is_active })
    .eq('id', targetUserId)

  if (updateError) {
    return res.status(500).json({ error: updateError.message })
  }

  return res.status(200).json({ success: true })
}