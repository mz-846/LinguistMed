import { cn } from '@/lib/utils'

export type Confidence = 'high' | 'medium' | 'low'

const STYLES: Record<Confidence, string> = {
  high: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-red-200 bg-red-50 text-red-700',
}

const LABELS: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence — worth double-checking',
  low: 'Low confidence — please check with a person',
}

// Small tag shown next to translations so the user knows when the AI is
// unsure and a human should double-check. Ported from the teammate's
// confidence-score idea, but self-assessed by the model per translation.
export function ConfidenceTag({ confidence }: { confidence: Confidence }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        STYLES[confidence],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {LABELS[confidence]}
    </span>
  )
}
