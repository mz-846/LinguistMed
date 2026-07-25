'use client'

import { motion } from 'framer-motion'
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react'

export type BookingProposal = {
  surgery: string
  address: string
  date: string
  time: string
}

export type BookingStatus = 'proposed' | 'booking' | 'booked'

type BookingCardProps = {
  booking: BookingProposal
  status: BookingStatus
  error?: string | null
  onConfirm: () => void
}

// Rich inline card proposing an appointment slot. Stays in the conversation
// history and flips to a "✓ Booked" state once confirmed — booking only ever
// happens from the explicit button tap below.
export function BookingCard({ booking, status, error, onConfirm }: BookingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="ml-10 max-w-[85%] overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-border p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
          <Building2 className="size-5 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-card-foreground">{booking.surgery}</p>
          <p className="truncate text-xs text-muted-foreground">{booking.address}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span dir="auto" className="text-sm font-semibold text-card-foreground">
            {booking.date}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span dir="auto" className="text-sm font-semibold text-card-foreground">
            {booking.time}
          </span>
        </div>
      </div>

      {status !== 'booked' ? (
        <div className="space-y-3 px-4 pb-4">
          <div className="flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-sky-600" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-sky-800">
              Nothing has been booked yet. This appointment is only reserved when you tap the
              button below.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-destructive">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={status === 'booking'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-bold text-primary-foreground shadow-md shadow-primary/20 transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {status === 'booking' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {status === 'booking' ? 'Booking…' : 'Confirm booking'}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-primary/10 bg-accent px-4 py-3">
          <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm font-bold text-accent-foreground">Booked</p>
        </div>
      )}
    </motion.div>
  )
}
