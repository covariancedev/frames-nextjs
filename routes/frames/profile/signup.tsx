/** @jsxImportSource @airstack/frog/jsx */
import { Box, Heading, Text, VStack, vars } from "@/utils/ui";
import { Button, Frog, TextInput } from "@airstack/frog";
import { getFarQuestUserDetails, getFcUser, isFarcasterUserParticipantOfWorkChannel } from "@/utils/farcaster";
import { redis } from "@/utils/redis";
import { airtable } from "@/utils/airtable/client";
import { addFarcasterInfo } from "@/utils/airtable/farcaster";
import config from "@/utils/config";

type State = {
  info: Record<string, unknown>
  user?: Awaited<ReturnType<typeof getFarQuestUserDetails>>
}

type RedisFarcasterUser = Awaited<ReturnType<typeof getFcUser>>

const app = new Frog<{ State: State }>({
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars },
  initialState: {
    info: {},
    user: undefined
  },
  verify: true,
  headers: {
    'cache-control': 'max-age=0',
  }
});


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
  const state = await c.deriveState(async (previousState) => {
    if (c.frameData && !previousState.user) {
      previousState.user = await getFarQuestUserDetails(c.frameData.fid)
    }
    previousState.info = {}

  })

  const { buttonValue, inputText, status, frameData, verified } = c
  console.log("check_user_status", { inputText, status, verified });

  if (
    buttonValue !== "start"
    ||
    !frameData ||
    !state.user
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
  const fid = frameData.fid
  const frameUser = await redis.hget<RedisFarcasterUser>(`farcaster_contributors:${fid}`, 'username')
  const isParticipantOfWork = await isFarcasterUserParticipantOfWorkChannel(fid, "work")
  // const name = <Text>{state.user.username}</Text>

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


          <Text size='20'>
            {
              frameUser ? `Sorry ${state.user.username}, you'are already a Covariance Contributor` :
                isParticipantOfWork ?

                  `🎉 Congratulations, ${state.user.username}! 🎉 You're part of those allowed to apply`
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

  let { info } = c.req.param()
  const { inputText, status, frameData, deriveState, verified } = c
  const state = deriveState(previousState => {
    if (inputText && !['start'].includes(info)) {
      previousState.info[info === 'end' ? 'about' : info] = inputText
    }
  })
  console.log("add_profile_data", { info, state, inputText, status, verified });

  if (
    !frameData || !state.user
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
  const fid = frameData.fid
  let placeholder = ''
  let label = ''
  let sublabel = ''
  let next = ''
  let isError = false
  const saveToDb = !isDev
  let expertise = ((state.info.expertise ?? '') as string).split(',').map((e: string) => e.toLowerCase().trim())

  const emailResponse = info === 'email' ? await airtable.contributors.select({ filterByFormula: `{Email} = '${state.info.email}'`, maxRecords: 1 }).all() : []

  if (info === 'email' && emailResponse.length > 0) {
    console.log('emailResponse', emailResponse[0].id);

    sublabel = `${state.info.email} is already in use.`
    isError = true
    info = 'start'
  }

  if (info === 'expertise') {
    if (expertise.length > 5) {

      sublabel = `Please enter at least 5 areas of expertise.`
      isError = true
      info = 'role'
    }
    expertise = expertise.slice(0, 5)

  }

  if (info === 'end') {
    if (saveToDb) {
      const fcUser = await getFcUser(state.user.username)

      const contributor =
        await airtable.contributors.create({
          Name: state.info.name as string,
          Email: state.info.email as string,
          Notes: (inputText === 'none' ? '' : inputText) + `\n\nAdded through farcaster frames.`,
          Role: state.info.role as string,
          Company: state.info.company as string,
          ToS: true,
          Farcaster: `https://warpcast.com/${fid}`,
          fldnEG45PcwNEDObI: (state.info.expertise as string).split(',').map((e: string) => e.toLowerCase().trim()),
          "Source": [
            "Covariance"
          ], "Referred by": "Lior Goldenberg",
          "Profile Picture": [{ url: fcUser.pfp }] as { url: string }[],
          "Invite Code": config.inviteCode,
        }, { typecast: true })

      await addFarcasterInfo(fcUser, contributor.id)
      await redis.hset(`farcaster_contributors:${fid}`, fcUser)
    }
  }
  // 1. email
  // 2. name
  // 3. company
  // 4. role
  // 5. expertise
  // 6. end

  switch (info) {

    case 'email':
      next = 'name'
      placeholder = "John Doe"
      label = "What's your full name?"
      break

    case 'name':
      next = "company"
      placeholder = "Covariance"
      label = "What's your company name?"
      break;

    case 'company':
      next = "role"
      placeholder = "CEO"
      label = "What's your role at the company?"
      break;

    case 'role':
      next = "expertise"
      placeholder = "Videos, VC, NFTs, etc."
      label = "What are your top 5 areas of expertise?"
      break;

    case 'expertise':
      next = "end"
      placeholder = "I love to code"
      label = "Anything else we need to know about you?"
      sublabel = `(optional. Enter 'none' if not applicable)`
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
          backgroundColor='secondary'
          color='primary'
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
            {sublabel.length > 1 ? <Text size="20" align="center" color={isError ? 'red' : undefined}>{sublabel}</Text> : <></>}
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
