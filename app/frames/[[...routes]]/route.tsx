/** @jsxImportSource @airstack/frog/jsx */

import { vars } from '@/utils/ui'
import {
  Frog,
  FarcasterChannelActionType, getFarcasterChannelParticipants
} from '@airstack/frog'
import { devtools } from '@airstack/frog/dev'
import { handle } from '@airstack/frog/next'
import { serveStatic } from '@airstack/frog/serve-static'
import { getFarQuestUserDetails, getFarcasterUserAllowedList } from '@/utils/farcaster'

import profileSignupFrame from '../routes/profile/signup'
import { Button } from 'frog'
import config from '@/utils/config'


const app = new Frog({
  assetsPath: '/',
  basePath: '/frames',
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars },
  verify: process.env.NODE_ENV === 'production',
  // headers: {
  //   'cache-control': 'max-age=0',
  // }
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

app.hono.get("/allow-list/:id", async c => {
  const fid = Number(c.req.param('id'))
  try {

    const data = await getFarcasterUserAllowedList(fid)
    return c.json(data)
  } catch (e) {
    const error = e as Error
    return c.json({ error: error.message })
  }
})

app.frame("/", c => {
  return c.res({
    image: `${config.baseUrl}/frame-slides/covariance/intro.png`,
    // imageAspectRatio: "1:1",
    // imageOptions: {
    //   height: 1071,
    //   width: 1071,
    // },
    intents: [
      <Button action='/profile_signup/about/covariance'>What is Covariance?</Button>,
      <Button action='/profile_signup'>{"Apply"}</Button>
    ]
  })
})

app.frame("/nope",
  c => c.error({ message: 'Bad inputs!' })
)

app.route("/profile_signup", profileSignupFrame);

app.hono.get('/healthcheck', (c) => {
  return c.text('ribbit')
})

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
