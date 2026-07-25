import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { readFile } from 'fs/promises'
import path from 'path'
import {
  runAgentBrowserCommand,
  withAgentBrowserSandbox,
  type VercelSandboxSession,
} from '@agent-browser/sandbox/vercel'

// The Vercel Sandbox driver can take a while on a cold boot.
export const maxDuration = 300

// This route visibly drives a browser through OUR OWN mock booking page
// (/booking) — never a real NHS trust's login-gated booking system. That is
// a deliberate design choice, not a limitation.

type SlotDetails = {
  surgery: string
  address?: string
  date: string
  time: string
  patientName?: string
}

type TraceStep = {
  step: string
  /** data: URL of a screenshot taken after this step, when available. */
  screenshot?: string
}

/** Runs one agent-browser command and returns its stdout. */
type CommandRunner = (args: string[]) => Promise<string>
/** Takes a screenshot and returns it as a data: URL (undefined on failure). */
type ScreenshotTaker = () => Promise<string | undefined>

// ---------------------------------------------------------------------------
// Snapshot parsing: lines look like `- button "Confirm booking" [ref=e4]`.
// Refs are only stable within one snapshot, so we always parse fresh output
// and locate elements by role + accessible name, never by hardcoded ref.
// ---------------------------------------------------------------------------
function findRef(snapshot: string, role: string, namePattern: RegExp): string | null {
  for (const line of snapshot.split('\n')) {
    const match = line.match(/-\s+(\w+)\s+"([^"]*)"(?:\s+\[([^\]]*)\])?/)
    if (!match) continue
    const [, lineRole, name, attrs = ''] = match
    if (lineRole !== role || !namePattern.test(name)) continue
    const refMatch = attrs.match(/ref=(e\d+)/)
    if (refMatch) return `@${refMatch[1]}`
  }
  return null
}

// ---------------------------------------------------------------------------
// The booking flow itself — identical for both drivers.
// ---------------------------------------------------------------------------
async function performBookingFlow(options: {
  run: CommandRunner
  takeScreenshot: ScreenshotTaker
  bookingUrl: string
  slotDetails: SlotDetails
  userConfirmed: boolean
}): Promise<{ steps: TraceStep[]; success: boolean; error?: string }> {
  const { run, takeScreenshot, bookingUrl, slotDetails, userConfirmed } = options
  const steps: TraceStep[] = []

  await run(['open', bookingUrl])
  await run(['wait', '--load', 'networkidle'])
  steps.push({ step: 'Opened the booking page', screenshot: await takeScreenshot() })

  const snapshot = await run(['snapshot', '-i'])

  const nameRef = findRef(snapshot, 'textbox', /patient/i)
  if (nameRef) {
    await run(['fill', nameRef, slotDetails.patientName || 'MedLingo patient'])
    steps.push({
      step: `Filled in the patient name and checked the slot: ${slotDetails.date} at ${slotDetails.time}, ${slotDetails.surgery}`,
      screenshot: await takeScreenshot(),
    })
  }

  const confirmRef = findRef(snapshot, 'button', /confirm booking/i)
  if (!confirmRef) {
    return {
      steps,
      success: false,
      error: 'Could not find the "Confirm booking" button on the page.',
    }
  }

  if (!userConfirmed) {
    // Never auto-confirm: without explicit user confirmation we stop here.
    steps.push({ step: 'Stopped before confirming — waiting for your approval' })
    return { steps, success: true }
  }

  await run(['click', confirmRef])
  await run(['wait', '--load', 'networkidle'])

  // Verify the outcome on-page: the full snapshot contains the result text.
  const resultSnapshot = await run(['snapshot'])
  const confirmed = /booking confirmed/i.test(resultSnapshot)
  steps.push({
    step: confirmed
      ? 'Clicked "Confirm booking" — the page shows the booking is confirmed'
      : 'Clicked "Confirm booking", but the page did not confirm the booking',
    screenshot: await takeScreenshot(),
  })

  return confirmed
    ? { steps, success: true }
    : { steps, success: false, error: 'The booking page reported an error.' }
}

// ---------------------------------------------------------------------------
// Local driver: spawns the agent-browser CLI on this machine. Used for local
// demos — a Vercel Sandbox runs in the cloud and cannot reach localhost.
// ---------------------------------------------------------------------------
const CLI_PATH = path.join(process.cwd(), 'node_modules', 'agent-browser', 'bin', 'agent-browser.js')

function runLocalCommand(sessionId: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_PATH, '--session', sessionId, ...args], {
      env: { ...process.env, AGENT_BROWSER_IDLE_TIMEOUT_MS: '120000' },
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    let settled = false

    // The CLI spawns a persistent background daemon that inherits the stdio
    // pipes, so the 'close' event never fires — settle on 'exit' instead,
    // with a hard timeout as a safety net.
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      reject(new Error(`agent-browser ${args[0]} timed out after 60s`))
    }, 60_000)

    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    })
    child.on('exit', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      // Give the pipes a moment to flush the last buffered output.
      setTimeout(() => {
        if (code === 0) resolve(stdout)
        else reject(new Error(`agent-browser ${args[0]} failed: ${stderr || stdout}`.trim()))
      }, 50)
    })
  })
}

async function runLocalFlow(options: {
  bookingUrl: string
  slotDetails: SlotDetails
  userConfirmed: boolean
}) {
  const sessionId = `book-${Date.now()}`
  // Headed by default so the demo shows a real Chrome window opening;
  // set AGENT_BROWSER_LOCAL_HEADED=0 to run headless.
  const headed = process.env.AGENT_BROWSER_LOCAL_HEADED !== '0'

  const run: CommandRunner = (args) => {
    if (args[0] === 'open' && headed) {
      return runLocalCommand(sessionId, [...args, '--headed'])
    }
    return runLocalCommand(sessionId, args)
  }

  const takeScreenshot: ScreenshotTaker = async () => {
    try {
      const output = await runLocalCommand(sessionId, ['screenshot', '--json'])
      const parsed = JSON.parse(output)
      const screenshotPath: string | undefined = parsed?.data?.path
      if (!screenshotPath) return undefined
      const bytes = await readFile(screenshotPath)
      return `data:image/png;base64,${bytes.toString('base64')}`
    } catch {
      return undefined
    }
  }

  try {
    return await performBookingFlow({ ...options, run, takeScreenshot })
  } finally {
    await runLocalCommand(sessionId, ['close']).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Vercel Sandbox driver: the pattern from the agent-browser docs. Requires
// Vercel credentials (VERCEL_OIDC_TOKEN, or VERCEL_TOKEN + VERCEL_TEAM_ID +
// VERCEL_PROJECT_ID) and a bookingUrl reachable from the public internet.
// ---------------------------------------------------------------------------
function hasVercelSandboxCredentials(): boolean {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN ||
      (process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID && process.env.VERCEL_PROJECT_ID),
  )
}

async function runSandboxFlow(options: {
  bookingUrl: string
  slotDetails: SlotDetails
  userConfirmed: boolean
}) {
  return withAgentBrowserSandbox(async (sandbox: VercelSandboxSession) => {
    const run: CommandRunner = async (args) => {
      const result = await runAgentBrowserCommand(sandbox, args, { json: false })
      return result.stdout
    }

    const takeScreenshot: ScreenshotTaker = async () => {
      try {
        const result = await runAgentBrowserCommand<{ data?: { path?: string } }>(sandbox, [
          'screenshot',
        ])
        const screenshotPath = result.json?.data?.path
        if (!screenshotPath) return undefined
        const b64 = await sandbox.runCommand('base64', ['-w', '0', screenshotPath])
        return `data:image/png;base64,${(await b64.stdout()).trim()}`
      } catch {
        return undefined
      }
    }

    try {
      return await performBookingFlow({ ...options, run, takeScreenshot })
    } finally {
      await runAgentBrowserCommand(sandbox, ['close'], { json: false }).catch(() => {})
    }
  })
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  let body: {
    slotDetails?: SlotDetails
    userConfirmed?: boolean
    bookingUrl?: string
    slotId?: string
    profileId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { slotDetails, userConfirmed = false } = body
  if (!slotDetails?.surgery || !slotDetails?.date || !slotDetails?.time) {
    return NextResponse.json(
      { error: 'slotDetails with surgery, date and time is required.' },
      { status: 400 },
    )
  }

  // Default to our own mock booking page on this deployment, with the agreed
  // slot passed through as query params.
  const origin = new URL(request.url).origin
  const bookingUrl =
    body.bookingUrl ??
    `${origin}/booking?${new URLSearchParams({
      surgery: slotDetails.surgery,
      address: slotDetails.address ?? '',
      date: slotDetails.date,
      time: slotDetails.time,
      ...(body.slotId ? { slotId: body.slotId } : {}),
      ...(body.profileId ? { profileId: body.profileId } : {}),
    }).toString()}`

  const flowOptions = { bookingUrl, slotDetails, userConfirmed }

  try {
    // Prefer the Vercel Sandbox when credentials exist (deployed usage);
    // otherwise drive a local browser (the sandbox cannot reach localhost).
    const result = hasVercelSandboxCredentials()
      ? await runSandboxFlow(flowOptions)
      : await runLocalFlow(flowOptions)

    return NextResponse.json(result)
  } catch (error) {
    console.error('browse-and-book failed:', error)
    return NextResponse.json(
      {
        success: false,
        steps: [],
        error: 'The browser automation could not complete. Falling back is recommended.',
      },
      { status: 500 },
    )
  }
}
