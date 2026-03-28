// pages/api/staff/create.js
import { createClient } from '@supabase/supabase-js'

// Server-side only — service role key never exposed to client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── CIA: Verify the requesting user is an admin ──────
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden — admin only' })
  }

  // ── Create the new staff auth user ──────────────────
  const { email, full_name, phone, role, password } = req.body

  if (!email || !full_name || !password) {
    return res.status(400).json({ error: 'Email, name and password are required' })
  }

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email verification
  })

  if (createError) {
    return res.status(400).json({ error: createError.message })
  }

  // ── Update their profile in public.users ────────────
  // The trigger already inserted a basic row — we update it
  const { error: profileError } = await supabaseAdmin
  .from('users')
  .update({
    full_name:            full_name.trim(),
    phone:                phone?.trim() || null,
    role:                 role || 'staff',
    is_active:            true,
    must_change_password: true,  // ← ADD THIS
  })
  .eq('id', newUser.user.id)
  
  if (profileError) {
    return res.status(500).json({ error: 'User created but profile update failed: ' + profileError.message })
  }

  return res.status(200).json({ success: true, userId: newUser.user.id })
}