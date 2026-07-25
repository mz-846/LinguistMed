'use client'

import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { Building2, Calendar, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const DEMO_PROFILE_ID = 'demo-profile-1'
const DEMO_SLOT_ID = 'demo-slot-1'

export function BookingForm() {
  const params = useSearchParams()
  const surgery = params.get('surgery') ?? 'Riverside Medical Practice'
  const address = params.get('address') ?? '42 Riverside Road, London, E1 4QT'
  const date = params.get('date') ?? 'Monday, 3 August 2026'
  const time = params.get('time') ?? '10:30 AM'
  const slotId = params.get('slotId') ?? DEMO_SLOT_ID
  const profileId = params.get('profileId') ?? DEMO_PROFILE_ID

  const [patientName, setPatientName] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'confirmed'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (status !== 'idle') return
    setStatus('submitting')
    setError(null)
    try {
      const response = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, slotId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error ?? 'Booking failed.')
      }
      setStatus('confirmed')
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Booking failed.')
    }
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-primary px-6 py-4">
        <p className="text-lg font-extrabold tracking-tight text-primary-foreground">
          {surgery} — Online booking
        </p>
        <p className="text-xs text-primary-foreground/80">Demo booking system · Not the NHS</p>
      </header>

      <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
        <section
          aria-label="Appointment details"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h1 className="mb-4 text-xl font-extrabold tracking-tight text-slate-900">
            Book your appointment
          </h1>
          <dl className="space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium text-slate-500">Surgery</dt>
                <dd className="text-sm font-bold text-slate-900" data-testid="slot-surgery">
                  {surgery}
                </dd>
                <dd className="text-xs text-slate-500">{address}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium text-slate-500">Date</dt>
                <dd className="text-sm font-bold text-slate-900" data-testid="slot-date">
                  {date}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium text-slate-500">Time</dt>
                <dd className="text-sm font-bold text-slate-900" data-testid="slot-time">
                  {time}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        {status !== 'confirmed' ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="patient-name" className="text-sm font-bold text-slate-900">
                Patient full name
              </label>
              <input
                id="patient-name"
                data-testid="patient-name"
                type="text"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                placeholder="e.g. Amina Khan"
                autoComplete="off"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-800">
              Nothing has been booked yet. Your appointment is only reserved when you press the
              button below.
            </p>

            {error && (
              <p
                role="alert"
                data-testid="booking-error"
                className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <button
              type="submit"
              data-testid="confirm-booking"
              disabled={status === 'submitting'}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {status === 'submitting' && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {status === 'submitting' ? 'Booking…' : 'Confirm booking'}
            </button>
          </form>
        ) : (
          <section
            data-testid="booking-confirmed"
            className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center"
          >
            <CheckCircle2 className="size-12 text-emerald-600" aria-hidden="true" />
            <h2 className="text-xl font-extrabold text-emerald-900">Booking confirmed</h2>
            <p className="text-sm leading-relaxed text-emerald-800">
              {patientName ? `${patientName}, your` : 'Your'} appointment at {surgery} on {date} at{' '}
              {time} is booked.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
