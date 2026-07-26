// One-off: builds a Vercel Sandbox with agent-browser + Chrome pre-installed
// and saves it as a snapshot. Set the printed id as AGENT_BROWSER_SNAPSHOT_ID
// (Vercel env var) so /api/browse-and-book boots from it in seconds instead
// of installing everything on every booking.
//
// Run with fresh sandbox credentials, e.g.:
//   npx vercel env pull .env.vercel
//   node --env-file=.env.vercel scripts/create-sandbox-snapshot.mjs
import { createAgentBrowserSnapshot } from '@agent-browser/sandbox/vercel'

const snapshotId = await createAgentBrowserSnapshot({
  onStep: (event) => {
    const elapsed = event.elapsed ? ` (${(event.elapsed / 1000).toFixed(1)}s)` : ''
    console.log(`[${event.status}] ${event.step}${elapsed}`)
  },
})

console.log(`\nAGENT_BROWSER_SNAPSHOT_ID=${snapshotId}`)
