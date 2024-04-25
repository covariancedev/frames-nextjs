/** @jsxImportSource @airstack/frog/jsx */

import { isFarcasterUserParticipantOfWorkChannel } from '@/app/utils/fc-allowed-list'
import { Button, Frog, TextInput } from '@airstack/frog'
import { devtools } from '@airstack/frog/dev'
import { handle } from '@airstack/frog/next'
import { serveStatic } from '@airstack/frog/serve-static'

const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
  apiKey: process.env.AIRSTACK_API_KEY as string,
})

// Uncomment to use Edge Runtime
// export const runtime = 'edge'

app.frame("/", async (c) => {
  const { buttonValue, inputText, status, frameData } = c
  const { fid } = frameData ?? {}

  console.log('frames.c', { buttonValue, inputText, frameData })
  const isParticipantOfWork = await isFarcasterUserParticipantOfWorkChannel(c.frameData?.fid ?? 1, "work")

  return c.res({
    image: (
      <div
        style={{
          color: "white",
          display: "flex",
          fontSize: 40,
        }}
      >
        {status === "initial" ? "Create your Covariance profile" : isParticipantOfWork ? "You can now create your profile" : `Sorry, you are not allowed to create a Covariance profile. Your fid is ${fid}`
        }
      </div>
    ),
    intents: [status === "initial" && <Button>Click Here</Button>],
  });
});

app.frame('/old', (c) => {
  const { buttonValue, inputText, status } = c
  const fruit = inputText || buttonValue
  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background:
            status === 'response'
              ? 'linear-gradient(to right, #432889, #17101F)'
              : 'black',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          height: '100%',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 60,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 30,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {status === 'response'
            ? `Nice choice.${fruit ? ` ${fruit.toUpperCase()}!!` : ''}`
            : 'Welcome!'}
        </div>
      </div>
    ),
    intents: [
      <TextInput placeholder="Enter custom fruit..." />,
      <Button value="apples">Apples</Button>,
      <Button value="oranges">Oranges</Button>,
      <Button value="bananas">Bananas</Button>,
      status === 'response' && <Button.Reset>Reset</Button.Reset>,
    ],
  })
})

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
