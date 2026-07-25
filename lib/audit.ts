import { getSupabase } from './supabase'

// The demo has no auth, so every action is scoped to one demo profile unless
// the caller (e.g. book-appointment) knows a real profile id.
export const DEMO_PROFILE_ID = 'demo-profile-1'

/**
 * Fire-and-forget audit trail write. Never throws and never blocks the
 * response — if the audit_log table is missing or Supabase is down, the
 * feature that called this must still work.
 */
export async function logAudit(
  action: string,
  detail: Record<string, unknown> = {},
  profileId: string = DEMO_PROFILE_ID,
): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from('audit_log')
      .insert({ profile_id: profileId, action, detail })
    if (error) {
      console.warn(`audit_log write failed (${action}):`, error.message)
    }
  } catch (error) {
    console.warn(`audit_log write failed (${action}):`, error)
  }
}
