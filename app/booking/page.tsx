import { Suspense } from 'react'
import { BookingForm } from './booking-form'

// Our own mock booking page. This is the page agent-browser visibly drives
// during the demo — it is deliberately a plain, simple "website" form with
// stable accessible names and data-testids so ref-finding is reliable.
// It never points at a real NHS booking system.
export default function BookingPage() {
  return (
    <Suspense fallback={null}>
      <BookingForm />
    </Suspense>
  )
}
