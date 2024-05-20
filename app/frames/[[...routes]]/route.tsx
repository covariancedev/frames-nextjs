/** @jsxImportSource @airstack/frog/jsx */

import { Image, vars } from '@/utils/ui'
import {
  Frog,
  FarcasterChannelActionType, getFarcasterChannelParticipants
} from '@airstack/frog'
import { devtools } from '@airstack/frog/dev'
import { handle } from '@airstack/frog/next'
import { serveStatic } from '@airstack/frog/serve-static'
import { getFarQuestUserDetails } from '@/utils/farcaster'

import profileSignupFrame from '@/routes/frames/profile/signup'
import { Button } from 'frog'
import { backgroundImages, backgroundStyle, bluePrimary } from '@/routes/styles'
import config from '@/utils/config'


const app = new Frog({
  assetsPath: '/',
  basePath: '/frames',
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars },
  verify: process.env.NODE_ENV === 'production',
  headers: {
    'cache-control': 'max-age=0',
  }
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

app.frame("/", c => {
  return c.res({
    image: (
      <>
        {/* <Image src="/covariance-frame.png" objectFit='contain' /> */}
        <div style={{ ...backgroundStyle }}>
          <div
            style={{
              ...backgroundStyle,
              alignItems: "center",
              justifyContent: "center",
              // background: `url(${backgroundImages.startScreen})`,
              background: `url(${config.baseUrl}/covariance-frame.png)`,
            }} />
        </div>
      </>
    ),
    intents: [
      <Button>Start</Button>
    ]
  })
})

app.route("/profile_signup", profileSignupFrame);



app.hono.get('/healthcheck', (c) => {
  return c.text('ribbit')
})

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
