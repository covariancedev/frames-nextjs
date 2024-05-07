/** @jsxImportSource @airstack/frog/jsx */

import { vars } from '@/utils/ui'
import {
  Frog,
  FarcasterChannelActionType, getFarcasterChannelParticipants
} from '@airstack/frog'
import { devtools } from '@airstack/frog/dev'
import { handle } from '@airstack/frog/next'
import { serveStatic } from '@airstack/frog/serve-static'
import { getFarQuestUserDetails } from '@/utils/farcaster'

import profileSignupFrame from '@/routes/frames/profile/signup'


const app = new Frog({
  assetsPath: '/',
  basePath: '/frames',
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars }
})

// Uncomment to use Edge Runtime
// export const runtime = 'edge'

app.hono.get("/get-user/:id", async c => {
  const data = await getFarQuestUserDetails(c.req.param().id)
  return c.json(data)
})

app.hono.get("/channel-followers", async (c) => {
  const followers = await getFarcasterChannelParticipants({
    channel: 'work',
    actionType: [FarcasterChannelActionType.Follow],
  })
  return c.json({
    followers: {
      total: followers?.data?.length ?? 0,
      info: followers
    }
  })
})

app.route("/profile_signup", profileSignupFrame);



app.hono.get('/healthcheck', (c) => {
  return c.text('ribbit')
})

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
