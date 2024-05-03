/** @jsxImportSource @airstack/frog/jsx */

import { Box, Heading, Text, VStack, vars } from '@utils/ui'
import { Button, FrameIntent, Frog, TextInput } from '@airstack/frog'
import { devtools } from '@airstack/frog/dev'
import { handle } from '@airstack/frog/next'
import { serveStatic } from '@airstack/frog/serve-static'
import { isFarcasterUserParticipantOfWorkChannel, getFarQuestUserDetails } from '@utils/farcaster'
import { airtable, getContributorsWithFarcasterUrl } from '@utils/airtable'

const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
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

app.hono.get("/airtable", async c => {
  const contributors =
    await getContributorsWithFarcasterUrl()
  const farcaster =
    await airtable.farcaster.select().all()

  return c.json({ contributors, farcaster })
})


app.hono.get('/healthcheck', (c) => {
  return c.text('ribbit')
})

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
        <div
          style={{
            color: "white",
            display: "flex",
            fontSize: 40,
          }}>No information found!</div>
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
          <Button.Link href="https://app.covariance.network/registration">Continue Online</Button.Link>,
          <Button
            action={isParticipantOfWork ? "/add_profile_data/start" : undefined}
          >Continue Inline</Button>
        ] :
        [<Button
          action={"/"}
        >Back</Button>],
  })
})


app.frame("/add_profile_data/:info", async (c) => {

  const { buttonValue, inputText, status, frameData } = c
  const { info } = c.req.param()
  console.log("add_profile_data", { info, buttonValue, inputText, status, });
  const intents: FrameIntent[] = []

  if (
    // buttonValue !== "start"
    // ||
    !frameData
  ) {
    return c.res({
      image: (
        <div
          style={{
            color: "white",
            display: "flex",
            fontSize: 40,
          }}>No information found!</div>
      ),
      intents: []
    })
  }
  const fid = isDev ? devFid : frameData.fid
  let placeholder = ''
  let label = ''
  let sublabel = ''
  let next = ''

  switch (info) {
    case 'expertise':
      next = "end"
      placeholder = "I love to code"
      label = "Anything else we need to know about you?"
      sublabel = `(optional. Enter 'none' if not applicable)`
      break;

    case 'name':
      next = "expertise"
      placeholder = "Videos, VC, NFTs, etc."
      label = "What are your top 5 areas of expertise?"
      break;

    case 'end':
      label = "Thank you for providing your information."
      sublabel = `We will get back to you soon.`
      break;

    default:
      next = 'name'
      placeholder = "John Doe"
      label = "What's tour full name?"
      break
  }

  console.log(`info: ${info}`, fid);

  if (info !== 'end') {
    intents.push(
      ...[
        <TextInput placeholder={placeholder} />,
        <Button
          action={`/add_profile_data/${next}`}
        >Save and Continue</Button>,
      ])
    // } else {
    //   intents.push(
    //     <Button action="/check_user_status">Finish</Button>
    //   )
  }


  return c.res({
    image: (
      <>
        <Box
          grow
          alignVertical="center"
          backgroundColor="white"
          padding="32"
          border="1em solid rgb(138, 99, 210)"
        >
          <VStack gap="20">
            <Heading color="fcPurple" align="center" size="48">
              Profile setup:
            </Heading>
            <>
              <Text align="center" size="20">
                {label}
              </Text>
              {sublabel.length > 1 ? <Text size="12">{sublabel}</Text> : <></>}
            </>
          </VStack>
        </Box>
      </>
    ),
    intents: [
      ...intents,
      <Button.Reset>♻️Reset</Button.Reset>
    ]
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
