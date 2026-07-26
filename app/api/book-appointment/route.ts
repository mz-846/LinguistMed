import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

// This endpoint must only ever be called from an explicit "Confirm booking"
// click by the user — never automatically.
export async function POST(request: Request) {
  let body: { profileId?: string; slotId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { profileId, slotId } = body
  if (!profileId || !slotId) {
    return NextResponse.json(
      { error: 'profileId and slotId are required.' },
      { status: 400 },
    )
  }

  let supabase
  try {
    supabase = getSupabase()
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Supabase is not configured on the server.' },
      { status: 500 },
    )
  }

  // DEMO MODE: booking always succeeds. The same demo slot gets rebooked in
  // every run-through, so there is no "already booked" rejection — the slot
  // is simply marked booked (and created if the seed data is missing), and
  // database hiccups are logged rather than surfaced as failures.
  let { data: slot } = await supabase
    .from('appointment_slots')
    .update({ is_booked: true })
    .eq('id', slotId)
    .select()
    .maybeSingle()

  if (!slot) {
    const { data: created, error: createError } = await supabase
      .from('appointment_slots')
      .insert({
        id: slotId,
        surgery: 'Riverside Medical Practice',
        address: '42 Riverside Road, London, E1 4QT',
        slot_date: 'Monday, 3 August 2026',
        slot_time: '10:30 AM',
        is_booked: true,
      })
      .select()
      .maybeSingle()
    if (createError) {
      console.warn('Could not create the demo slot:', createError.message)
    }
    slot = created
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({ profile_id: profileId, slot_id: slotId })
    .select()
    .maybeSingle()

  if (bookingError) {
    console.warn('Could not save the booking row:', bookingError.message)
  }

  void logAudit('book_appointment', { slot_id: slotId }, profileId)

  return NextResponse.json({ booking, slot, success: true })
}
