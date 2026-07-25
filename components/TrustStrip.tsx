import { ShieldCheck } from 'lucide-react'

// Always-visible reassurance bar pinned to the top of the screen.
export function TrustStrip() {
  return (
    <div className="z-20 flex shrink-0 items-center justify-center gap-1.5 border-b border-sky-100 bg-sky-50/95 px-3 py-1.5 backdrop-blur">
      <ShieldCheck className="size-3.5 shrink-0 text-sky-600" aria-hidden="true" />
      <p className="text-[11px] font-medium text-sky-800">
        Nothing is booked or sent until you confirm · Demo data only
      </p>
    </div>
  )
}
