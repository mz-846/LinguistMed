import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

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

  // Mark the slot as booked, but only if it is still free — this guards
  // against double-booking the same slot.
  const { data: slot, error: slotError } = await supabase
    .from('appointment_slots')
    .update({ is_booked: true })
    .eq('id', slotId)
    .eq('is_booked', false)
    .select()
    .maybeSingle()

  if (slotError) {
    console.error('Failed to update appointment slot:', slotError)
    return NextResponse.json(
      { error: 'Failed to book the appointment slot.' },
      { status: 500 },
    )
  }

  if (!slot) {
    return NextResponse.json(
      { error: 'This slot is no longer available.' },
      { status: 409 },
    )
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({ profile_id: profileId, slot_id: slotId })
    .select()
    .single()

  if (bookingError) {
    console.error('Failed to insert booking:', bookingError)
    // Roll the slot back so it isn't stuck as booked without a booking row.
    await supabase
      .from('appointment_slots')
      .update({ is_booked: false })
      .eq('id', slotId)
    return NextResponse.json(
      { error: 'Failed to save the booking.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ booking, slot })
}
