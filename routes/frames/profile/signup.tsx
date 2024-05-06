/** @jsxImportSource @airstack/frog/jsx */
import { Box, Heading, Text, VStack, vars } from "@/utils/ui";
import { Button, Frog, TextInput } from "@airstack/frog";
import { isFarcasterUserParticipantOfWorkChannel } from "@/utils/farcaster";
import { redis } from "@/utils/redis";

type State = {
  info: Record<string, unknown>
}

const app = new Frog<{ State: State }>({
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars },
  initialState: {
    info: {}
  }
});

type RedisFarcasterUser = {
  fid: number
  username: string
}


const isDev = process.env.NODE_ENV === 'development'
const devFid = 7589



app.frame("/", (c) => {
  return c.res({
    action: "/check_user_status",
    image: (
      <Box
        grow
        backgroundColor="secondary"
        color="primary"
        padding="32"
        alignVertical="center"
      >
        <VStack gap="20">
          <Heading align="center" size="48">
            Join Covariance
          </Heading>

          <Box alignVertical='center'>
            <Text align="center" size="18">
              Before you are able to join, we'll first need to check you eligibility
            </Text>
            {/* <Spacer /> */}
            <Text wrap='balance'>
              You can also find out more about us by clicking the first button below 😉
            </Text>

          </Box>
        </VStack>

      </Box>
    ),
    intents: [<Button.Link href="https://app.covariance.network">Find out more</Button.Link>
      , <Button value="start"
      >Check eligibilty</Button>
    ],
  });
});

app.frame("/check_user_status", async (c) => {

  const { buttonValue, inputText, status, frameData, verified } = c
  console.log("check_user_status", { buttonValue, inputText, status, verified });

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
  const frameUser = await redis.hget<RedisFarcasterUser>("farcaster_contributors", `${fid}`)
  const isParticipantOfWork = await isFarcasterUserParticipantOfWorkChannel(fid, "work")

  return c.res({
    image: (
      <Box
        backgroundColor="secondary"
        color="primary"
        padding="32"
        grow
        alignVertical="center"
      >
        <VStack gap='4'>
          <Heading align="center" size="48">Join Covariance</Heading>
          {/* <Box alignVertical='center'> */}


          <Text size='20' wrap="balance">
            {
              frameUser ? "Sorry, you'are already a Covariance Contributor" :
                isParticipantOfWork ?

                  `🎉 Congratulations! 🎉 You're part of those allowed to apply`
                  :
                  `Sorry, you are not allowed to create a Covariance profile because you do not belong to the /work channel.`
            }
          </Text>
          {/* <Spacer /> */}
          {!frameUser && !isParticipantOfWork ?
            <Text size='20'>
              To join, you need to apply first. You can decide in apply in-frame or on the web.
            </Text> : <></>
          }

          {/* </Box> */}
        </VStack>
      </Box>
    ),
    intents:
      isParticipantOfWork ?
        [
          <Button.Link href="https://app.covariance.network/registration">Apply Online</Button.Link>,
          <Button
            action={isParticipantOfWork ? "/add_profile_data/start" : undefined}
          >Apply Inline</Button>
        ] :
        [<Button
          action={"/"}
        >Back</Button>],
  })
})


app.frame("/add_profile_data/:info", async (c) => {

  const { buttonValue, inputText, status, frameData, previousState, deriveState } = c
  const { info } = c.req.param()
  const pstate = previousState.info
  const state = deriveState(previousState => {
    if (buttonValue && !['start', 'end'].includes(info)) {
      previousState.info[info] = buttonValue
    }
  })
  console.log("add_profile_data", { info, state, pstate, buttonValue, inputText, status, });

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

    case 'email':
      next = 'name'
      placeholder = "John Doe"
      label = "What's your full name?"
      break

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
      next = 'email'
      placeholder = "email@example.com"
      label = "What's your email address?"
      break
  }

  console.log(`info: ${info}`, fid);


  return c.res({
    image: (
      <>
        <Box
          grow
          alignVertical="center"
          backgroundColor='primary'
          color='secondary'
          padding="32"
        // border="1em solid rgb(138, 99, 210)"
        >
          <VStack gap="20">
            <Heading align="center" size="48">
              Profile setup:
            </Heading>
            <Text align="center" size="20">
              {label}
            </Text>
            {sublabel.length > 1 ? <Text size="12">{sublabel}</Text> : <></>}
          </VStack>
        </Box>
      </>
    ),
    intents: info !== 'end' ? [

      <TextInput placeholder={placeholder} />,
      <Button
        action={`/add_profile_data/${next}`}
      >Save and Continue</Button>,

      <Button.Reset>♻️Reset</Button.Reset>
    ] : [<Button.Reset>♻️Reset</Button.Reset>
    ]
  })
})

export default app;
