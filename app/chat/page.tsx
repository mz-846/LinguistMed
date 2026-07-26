'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { SendHorizontal, Paperclip, Camera, Stethoscope } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { ChatBubble } from '@/components/ChatBubble'
import { TypingIndicator } from '@/components/TypingIndicator'
import { QuickReplyChips } from '@/components/QuickReplyChips'
import { MicButton } from '@/components/MicButton'
import { BookingCard, type BookingProposal, type BookingStatus } from '@/components/BookingCard'
import { LinksCard, type LinkItem } from '@/components/LinksCard'
import {
  AgentActionCard,
  type AgentActionStep,
  type AgentActionStatus,
} from '@/components/AgentActionCard'

// Demo identifiers for the mock Supabase booking — replace with the signed-in
// user's profile and a real slot once auth and slot selection exist.
const DEMO_PROFILE_ID = 'demo-profile-1'
const DEMO_SLOT_ID = 'demo-slot-1'

type Message = {
  id: string
  role: 'agent' | 'user'
  kind: 'text' | 'booking' | 'links' | 'action'
  /** Text shown in the bubble; for cards, a text summary kept for model context. */
  content: string
  spoken?: boolean
  quickReplies?: string[]
  booking?: BookingProposal
  bookingStatus?: BookingStatus
  bookingError?: string | null
  links?: LinkItem[]
  actionSteps?: AgentActionStep[]
  actionStatus?: AgentActionStatus
  actionError?: string | null
  actionNote?: string | null
}

type AgentResponse = {
  reply: string
  quick_replies: string[]
  action_type: 'none' | 'propose_booking' | 'show_links'
  booking: BookingProposal | null
  links: LinkItem[] | null
}

let nextId = 0
function makeId() {
  nextId += 1
  return `msg-${nextId}`
}

// Screen 2 — the whole app: one continuous conversation thread.
export default function ChatPage() {
  const router = useRouter()
  const { language, ready } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const startedRef = useRef(false)

  // Language must be chosen first — bounce back to the select screen.
  useEffect(() => {
    if (ready && !language) router.replace('/')
  }, [ready, language, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, typing])

  const requestAgentReply = useCallback(
    async (history: Message[]) => {
      if (!language) return
      setTyping(true)
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: language.name,
            messages: history.map((message) => ({
              role: message.role === 'agent' ? 'assistant' : 'user',
              content: message.content,
            })),
          }),
        })
        const data: AgentResponse | { error?: string } = await response.json()
        if (!response.ok || !('reply' in data)) {
          throw new Error(('error' in data && data.error) || 'Chat request failed')
        }

        const newMessages: Message[] = [
          {
            id: makeId(),
            role: 'agent',
            kind: 'text',
            content: data.reply,
            quickReplies: data.quick_replies,
          },
        ]
        if (data.action_type === 'propose_booking' && data.booking) {
          newMessages.push({
            id: makeId(),
            role: 'agent',
            kind: 'booking',
            content: `Proposed appointment: ${data.booking.surgery}, ${data.booking.date} at ${data.booking.time}. Not yet confirmed.`,
            booking: data.booking,
            bookingStatus: 'proposed',
          })
        }
        if (data.action_type === 'show_links' && data.links && data.links.length > 0) {
          newMessages.push({
            id: makeId(),
            role: 'agent',
            kind: 'links',
            content: `Shared NHS links: ${data.links.map((link) => `${link.label} (${link.url})`).join(', ')}`,
            links: data.links,
          })
        }
        setMessages((current) => [...current, ...newMessages])
      } catch (error) {
        console.error(error)
        setMessages((current) => [
          ...current,
          {
            id: makeId(),
            role: 'agent',
            kind: 'text',
            content: '⚠️ Sorry, something went wrong. Please try again.',
          },
        ])
      } finally {
        setTyping(false)
      }
    },
    [language],
  )

  // Kick off the conversation with a greeting in the chosen language.
  useEffect(() => {
    if (!language || startedRef.current) return
    startedRef.current = true
    requestAgentReply([])
  }, [language, requestAgentReply])

  function sendUserMessage(text: string, spoken = false) {
    const trimmed = text.trim()
    if (!trimmed || typing) return
    const userMessage: Message = {
      id: makeId(),
      role: 'user',
      kind: 'text',
      content: trimmed,
      spoken,
    }
    // Side effects must stay out of the setState updater: React StrictMode
    // double-invokes updaters in dev, which fired the agent request twice.
    const next = [...messages, userMessage]
    setMessages(next)
    requestAgentReply(next)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    sendUserMessage(draft)
    setDraft('')
  }

  function handleMicError(message: string) {
    setMessages((current) => [
      ...current,
      { id: makeId(), role: 'agent', kind: 'text', content: `⚠️ ${message}` },
    ])
  }

  // Letter photo → existing /api/process-letter route → explained in chat.
  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !language || typing) return

    const userMessage: Message = {
      id: makeId(),
      role: 'user',
      kind: 'text',
      content: '📷 I sent a photo of my letter.',
    }
    setMessages((current) => [...current, userMessage])
    setTyping(true)

    try {
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/process-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mediaType: file.type,
          targetLanguage: language.name,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error ?? 'Could not read the letter')
      }

      const parts = [
        data.is_urgent ? '⚠️' : null,
        data.plain_explanation,
        data.next_step_summary,
      ].filter(Boolean)

      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: 'agent',
          kind: 'text',
          content: parts.join('\n\n'),
        },
      ])
    } catch (error) {
      console.error(error)
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: 'agent',
          kind: 'text',
          content: '⚠️ We could not read that photo. Please try a clearer photo of the letter.',
        },
      ])
    } finally {
      setTyping(false)
    }
  }

  function markBooked(messageId: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              bookingStatus: 'booked' as const,
              content: message.booking
                ? `Appointment confirmed: ${message.booking.surgery}, ${message.booking.date} at ${message.booking.time}.`
                : message.content,
            }
          : message,
      ),
    )
  }

  function updateActionCard(actionId: string, patch: Partial<Message>) {
    setMessages((current) =>
      current.map((message) => (message.id === actionId ? { ...message, ...patch } : message)),
    )
  }

  // Direct Supabase write — the original booking path, kept as the fallback.
  async function bookDirectly(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: DEMO_PROFILE_ID, slotId: DEMO_SLOT_ID }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        return { ok: false, error: data?.error ?? 'Booking failed' }
      }
      return { ok: true }
    } catch {
      return { ok: false, error: 'Booking failed. Please try again.' }
    }
  }

  // Only ever triggered by the explicit "Confirm booking" tap on the card.
  // First the agent visibly drives a browser through our own /booking page;
  // if that is flaky, it falls back to the direct Supabase write.
  async function handleConfirmBooking(messageId: string) {
    const bookingMessage = messages.find((message) => message.id === messageId)
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, bookingStatus: 'booking', bookingError: null }
          : message,
      ),
    )

    // Show the live "agent using the browser" trace right after the card.
    const actionId = makeId()
    setMessages((current) => [
      ...current,
      {
        id: actionId,
        role: 'agent',
        kind: 'action',
        content: 'Booking the appointment in the browser.',
        actionSteps: [],
        actionStatus: 'running',
      },
    ])

    try {
      const response = await fetch('/api/browse-and-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userConfirmed: true,
          slotId: DEMO_SLOT_ID,
          profileId: DEMO_PROFILE_ID,
          slotDetails: {
            surgery: bookingMessage?.booking?.surgery ?? 'Riverside Medical Practice',
            address: bookingMessage?.booking?.address ?? '',
            date: bookingMessage?.booking?.date ?? '',
            time: bookingMessage?.booking?.time ?? '',
          },
        }),
      })
      const data = await response.json().catch(() => null)

      if (response.ok && data?.success) {
        updateActionCard(actionId, {
          actionSteps: data.steps ?? [],
          actionStatus: 'success',
          content: 'Booked the appointment by driving the booking page in a browser.',
        })
        markBooked(messageId)
        return
      }

      // Browser automation failed or reported an error → fall back to the
      // direct database booking so the demo still completes.
      updateActionCard(actionId, {
        actionSteps: data?.steps ?? [],
        actionStatus: 'failed',
        actionError: data?.error ?? 'The browser automation could not complete.',
        actionNote: 'Trying the direct booking connection instead…',
      })
      const fallback = await bookDirectly()
      if (fallback.ok) {
        updateActionCard(actionId, {
          actionNote: 'Booked through the direct connection instead.',
          content: 'Booked the appointment through the direct connection.',
        })
        markBooked(messageId)
      } else {
        updateActionCard(actionId, { actionNote: null })
        setMessages((current) =>
          current.map((message) =>
            message.id === messageId
              ? { ...message, bookingStatus: 'proposed', bookingError: fallback.error }
              : message,
          ),
        )
      }
    } catch (error) {
      updateActionCard(actionId, {
        actionStatus: 'failed',
        actionError:
          error instanceof Error ? error.message : 'The browser automation could not complete.',
      })
      const fallback = await bookDirectly()
      if (fallback.ok) {
        updateActionCard(actionId, {
          actionNote: 'Booked through the direct connection instead.',
        })
        markBooked(messageId)
      } else {
        setMessages((current) =>
          current.map((message) =>
            message.id === messageId
              ? { ...message, bookingStatus: 'proposed', bookingError: fallback.error }
              : message,
          ),
        )
      }
    }
  }

  if (!language) return null

  const lastMessage = messages[messages.length - 1]

  return (
    <div className="flex h-dvh justify-center bg-background">
      <div className="flex w-full max-w-md flex-col">
        {/* Entry to the live appointment translator mode */}
        <div className="flex shrink-0 justify-end border-b border-border bg-background px-4 py-2">
          <Link
            href="/translate"
            className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 active:scale-95"
          >
            <Stethoscope className="size-3.5" aria-hidden="true" />
            Talk to your doctor
          </Link>
        </div>

        {/* Conversation thread */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {messages.map((message) => {
            if (message.kind === 'booking' && message.booking) {
              return (
                <BookingCard
                  key={message.id}
                  booking={message.booking}
                  status={message.bookingStatus ?? 'proposed'}
                  error={message.bookingError}
                  onConfirm={() => handleConfirmBooking(message.id)}
                />
              )
            }
            if (message.kind === 'links' && message.links) {
              return <LinksCard key={message.id} links={message.links} />
            }
            if (message.kind === 'action') {
              return (
                <AgentActionCard
                  key={message.id}
                  steps={message.actionSteps ?? []}
                  status={message.actionStatus ?? 'running'}
                  error={message.actionError}
                  note={message.actionNote}
                />
              )
            }
            return (
              <div key={message.id} className="space-y-2.5">
                <ChatBubble role={message.role} content={message.content} spoken={message.spoken} />
                {message.role === 'agent' &&
                  message.id === lastMessage?.id &&
                  !typing &&
                  (message.quickReplies?.length ?? 0) > 0 && (
                    <QuickReplyChips
                      options={message.quickReplies!}
                      onSelect={(option) => sendUserMessage(option)}
                    />
                  )}
              </div>
            )
          })}

          <AnimatePresence>{typing && <TypingIndicator />}</AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input dock adapted from LangUI's "Prompt Message Input" pattern:
            one rounded field with icon buttons positioned inside it, restyled
            to our palette, with the big mic kept below as the primary input. */}
        <div className="shrink-0 space-y-3 border-t border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur">
          <form onSubmit={handleSubmit} className="relative">
            <div className="absolute inset-y-0 left-1.5 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={typing}
                aria-label="Attach a photo of a letter"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary active:scale-95 disabled:opacity-50"
              >
                <Paperclip className="size-4.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={typing}
                aria-label="Take a picture of a letter"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary active:scale-95 disabled:opacity-50"
              >
                <Camera className="size-4.5" aria-hidden="true" />
              </button>
            </div>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              dir="auto"
              placeholder="Type instead…"
              aria-label="Type a message"
              className="block w-full rounded-full border border-border bg-card py-2.5 pl-[5.25rem] pr-12 text-[15px] text-card-foreground shadow-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={!draft.trim() || typing}
              aria-label="Send message"
              className="absolute inset-y-0 right-1.5 my-auto flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:opacity-40"
            >
              <SendHorizontal className="size-4.5" aria-hidden="true" />
            </button>
          </form>

          <div className="flex justify-center">
            <MicButton
              languageCode={language.sttCode ?? language.code}
              onTranscript={(text) => sendUserMessage(text, true)}
              onError={handleMicError}
              disabled={typing}
            />
          </div>
        </div>

        {/* Attach an existing photo: plain picker, no capture attribute. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handlePhotoChange}
          aria-hidden="true"
          tabIndex={-1}
        />
        {/* Take a picture: capture opens the rear camera directly on mobile;
            desktop browsers ignore it and fall back to the file picker. */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handlePhotoChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </div>
  )
}
