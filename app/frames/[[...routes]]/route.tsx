/** @jsxImportSource @airstack/frog/jsx */

import { Box, Heading, Text, VStack, vars } from '@utils/ui'
import { Button, FrameIntent, Frog, TextInput } from '@airstack/frog'
import { devtools } from '@airstack/frog/dev'
import { handle } from '@airstack/frog/next'
import { serveStatic } from '@airstack/frog/serve-static'
import { isFarcasterUserParticipantOfWorkChannel, getFarQuestUserDetails } from '@utils/farcaster'
import { airtable, getHubs, syncContributorsWithFarcasterDataOnAirtable } from '@utils/airtable'

import profileSignupFrame from '@routes/frames/profile/signup'
import { airtableData } from '@/app/data'


const app = new Frog({
  assetsPath: '/',
  basePath: '/frames',
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars }
})
const isDev = process.env.NODE_ENV === 'development'
const devFid = 7589
// Uncomment to use Edge Runtime
// export const runtime = 'edge'

app.hono.get("/get-user/:id", async c => {
  const data = await getFarQuestUserDetails(c.req.param().id)
  return c.json(data)
})

app.route("/profile_signup", profileSignupFrame);

app.hono.get("/airtable", async c => {
  const hubs = await getHubs()

  return c.json({ hubs, airtableData })
})


app.hono.get('/healthcheck', (c) => {
  return c.text('ribbit')
})

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
