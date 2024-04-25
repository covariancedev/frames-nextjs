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
const isDev = process.env.NODE_ENV === 'development'
const devFid = 7589
// Uncomment to use Edge Runtime
// export const runtime = 'edge'

app.frame("/", (c) => {
  return c.res({
    action: "/check_user_status",
    image: (
      <div
        style={{
          color: "white",
          display: "flex",
          fontSize: 40,
        }}
      >
        Create your Covariance profile

      </div>
    ),
    intents: [<Button value="start"
    >Click Here to start</Button>
    ],
  });
});

app.frame("/check_user_status", async (c) => {

  const { buttonValue, inputText, status, frameData } = c
  console.log("check_user_status", { buttonValue, inputText, status });

  if (
    buttonValue !== "start"
    ||
    !frameData
  ) {
    return c.res({
      image: (
        <>No information found!</>
      ),
      intents: []
    })
  }
  const fid = isDev ? devFid : frameData.fid
  const isParticipantOfWork = await isFarcasterUserParticipantOfWorkChannel(fid, "work")

  return c.res({
    image: (
      <div
        style={{
          color: "white",
          display: "flex",
          fontSize: 40,
        }}
      >
        {isParticipantOfWork ? "You can now create your profile" : `Sorry, you are not allowed to create a Covariance profile because you do not belong to /work channel. Your fid is ${fid}`
        }
      </div>
    ),
    intents:
      isParticipantOfWork ?
        [
          <Button.Redirect location="https://covariance.network" >Continue Online</Button.Redirect>,
          <Button
            action={isParticipantOfWork ? "/add_profile_data" : undefined}
          >Continue Inline</Button>
        ] :
        [<Button
          action={"/"}
        >Back</Button>],
  })
})


app.frame("/add_profile_data/:info?", async (c) => {
  const { info } = c.req.param()

  const { buttonValue, inputText, status, frameData } = c

  if (
    // buttonValue !== "start"
    // ||
    !frameData
  ) {
    return c.res({
      image: (
        <>No information found!</>
      ),
      intents: []
    })
  }
  const fid = isDev ? devFid : frameData.fid

  console.log(`info: ${info}`, fid);


  return c.res({
    image: (
      <div>
        {info ? `You have entered ${info}` : "Please enter your information"}
      </div>
    ),
    intents: []
  })
})

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
