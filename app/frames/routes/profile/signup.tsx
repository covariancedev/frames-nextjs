/** @jsxImportSource @airstack/frog/jsx */
import { Box, Heading, Text, VStack, vars } from "@/utils/ui";
import { Button, Frog, TextInput } from "@airstack/frog";
import { getFarQuestUserDetails, getFcUser, isFarcasterUserParticipantOfWorkChannel } from "@/utils/farcaster";
// import { redis } from "@/utils/redis";
import { airtable } from "@/utils/airtable/client";
import { addFarcasterInfo } from "@/utils/airtable/farcaster";
import config from "@/utils/config";
import { ErrorImage } from "../../utils/errors";

type State = {
  info: Record<string, unknown>
  user?: Awaited<ReturnType<typeof getFarQuestUserDetails>>
}

// type RedisFarcasterUser = Awaited<ReturnType<typeof getFcUser>>

const app = new Frog<{ State: State }>({
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars },
  initialState: {
    info: {},
    user: undefined
  },
  verify: process.env.NODE_ENV === 'production',
  headers: {
    'cache-control': 'max-age=0',
  }
});

// const hub = 'covariance'


const isDev = process.env.NODE_ENV === 'development'



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
              Before you are able to join, we'll first need to check your eligibility
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
        <ErrorImage
          title={`Oops, something went wrong`}
          subtitle="Send a DC to @lior or ping him in a cast for support"
        />
      ),
      intents: []
    })
  }
  const fid = frameData.fid
  // const frameUser = await redis.hget<RedisFarcasterUser>(`${hub}_contributors_${isDev ? 'test' : 'live'}:${fid}`, 'fid')
  // const isParticipantOfWork = !frameUser ? await isFarcasterUserParticipantOfWorkChannel(fid, "work") : false
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


          {/* <Text size='20' color={frameUser ? "red" : undefined}> */}
          <Text size='20' color={undefined}>
            {
              // frameUser ? `Sorry ${state.user.username}, you're already a Covariance Contributor` :
              isParticipantOfWork ?

                `🎉 Congratulations, ${state.user.username}! 🎉 You're on the allow list!`
                :
                `Sorry, you are not on the allow list.`
            }
          </Text>
          {/* <Spacer /> */}
          {isParticipantOfWork ?
            <Box>
              <Text size='20'>
                To join, you need to create your contributor profile.
              </Text>
              <Text size='18'>
                Either do in Frame, or on the app.
              </Text>
            </Box>
            : <></>
          }

          {/* </Box> */}
        </VStack>
      </Box>
    ),
    intents:
      // !frameUser &&
      isParticipantOfWork ?
        [
          <Button.Link href="https://app.covariance.network/registration">Create Profile Online</Button.Link>,
          <Button
            action={"/show_notice"}
          >Apply Inline</Button>
        ] :
        [<Button
          action={"/"}
        >Back</Button>],
  })
})

app.frame("/show_notice", (c) => {
  const { inputText, status, frameData, verified, deriveState } = c
  const state = deriveState()
  console.log("show_notice", { inputText, status, verified, state });

  if (
    !frameData || !state.user
  ) {
    return c.res({
      image: (
        <ErrorImage
          title={`Oops, something went wrong`}
          subtitle="Send a DC to @lior or ping him in a cast for support"
        />
      ),
    })
  }

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
          <Heading align="center" size="48">Disclaimer</Heading>

          <Box>
            <Text size='20'>
              The following steps will setup your contributor profile, which will be used to direct opportunities that are most relevant to you
            </Text>
            {/* <ErrorImage
            title={`Oops, something went wrong`}
            subtitle="Send a DC to @lior or ping him in a cast for support"
          /> */}
          </Box>
        </VStack>
      </Box>
    ),
    intents: [
      <Button action={"/check_user_status"}>Back</Button>,
      <Button
        action={"/add_profile_data/start"}
      >Continue</Button>,
      // <Button.Reset>♻️Reset</Button.Reset>,

    ]
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
        <ErrorImage
          title={`Oops, something went wrong`}
          subtitle="Send a DC to @lior or ping him in a cast for support"
        />
      ),
    })
  }
  const fid = frameData.fid
  let placeholder = ''
  let label = ''
  let sublabel = ''
  let next = ''
  let previous = ''
  let userGroupId = ''
  let isError = false
  const saveToDb = !isDev

  try {



    if (info === 'end') {
      if (saveToDb) {



        const fcUser = await getFcUser(state.user.username)

        const userGroup = await airtable.user_group.create({
          "Name": state.info.name as string,
          "E-mail": state.info.email as string,
        })

        console.log(`user group created`, userGroup)

        userGroupId = userGroup.id

        const contributor =
          await airtable.contributors.create({
            Name: state.info.name as string,
            Email: state.info.email as string,
            // Notes: (inputText === 'none' ? '' : inputText) + `\n\nAdded through farcaster frames.`,
            // Role: state.info.role as string,
            // Company: state.info.company as string,
            ToS: true,
            "Telegram": state.user.username,
            Farcaster: `https://warpcast.com/${state.user.username}`,
            // expertise
            // fldnEG45PcwNEDObI: (state.info.expertise as string).split(',').map((e: string) => e.toLowerCase().trim()),
            "Source": [
              "Farcaster"
            ],
            "Referred by": "Lior Goldenberg",
            // @ts-ignore
            "Profile Picture": [{ url: fcUser.pfp }] as { url: string }[],
            "Invite Code": config.inviteCode,
          },
            { typecast: true }
          )

        // @ts-ignore
        await addFarcasterInfo(fcUser, contributor.id)
        // await redis.hset(`${hub}_contributors_${isDev ? 'test' : 'live'}:${fid}`, fcUser)
      }
    }

    const checkError = !['end', 'start'].includes(info)
    let emailExists = false
    let magicLink: string | undefined = undefined
    console.log('checkError', { checkError, inputText })

    checkingErrors: {

      if ((checkError)) {
        let message = 'Invalid input: '
        if (!inputText) {
          message += 'Text cannot be empty'
        } else {


          if (info === 'email') {
            const email = state.info.email as string

            if (!email.includes('@')) {
              message = `Invalid email address captured`
            } else {
              const userGroup = await airtable.user_group.select({ filterByFormula: `{E-mail} = '${state.info.email}'`, maxRecords: 1 }).all()

              if (userGroup[0]) {
                console.log(`user group for ${state.info.email}`, userGroup[0]);
                message = `Email address already in use.`
                emailExists = true
                if (saveToDb) {
                  magicLink = userGroup[0].fields['Magic Link'] as string
                }
                break checkingErrors
              }

            }
          }

        }

        return c.error({ message })

      }

    }

    if (emailExists) {
      state.info = {}
      return c.res({
        image: (
          <Box
            grow
            alignVertical="center"
            backgroundColor='secondary'
            color='primary'
            padding='128'
            height={'100%'}

          // border="1em solid rgb(138, 99, 210)"
          >
            <VStack gap="20">
              <Heading align="center" size="48">
                Contributor found
              </Heading>
              <Box gap={'10'}>
                <Text align="center" size="20">
                  Sorry, you're already part of Covariance's network. Click the button below to go to the platform.
                </Text>
                {/* <Text size='16' align="center" color='red'>{sublabel}</Text>
                <Text size='16' align="center" color='red'>Magic Link: {magicLink}</Text> */}
              </Box>
            </VStack>
          </Box>
        ),
        intents: [
          <Button action={magicLink ?? "https://app.covariance.network"}>🔗 Go to Platform</Button>
        ]
      })
    }

    // 1. email (default)
    // 2. name
    // 3. telegram username
    // 4. end
    switch (info) {

      case 'email': {
        next = 'name'
        previous = 'start'
        placeholder = "John Doe"
        label = "What's your full name?"
      }
        break

      case 'name': {
        next = "telegram"
        previous = "email"
        placeholder = "Company or organization you identify with?"
        label = "What's your company name?"
      }
        break;

      case 'telegram': {
        next = "end"
        previous = "name"
        placeholder = "durov"
        label = "What's your telegram username?"
        sublabel = `We will use this to cross check your farcaster profile on Telegram`
      }
        break;

      case 'end': {
        label = "Thank you for providing your information."
        sublabel = `Have a chat with our telegram bot for the group link and login information.`
      }
        break;

      default: {
        next = 'email'
        placeholder = "email@example.com"
        label = "What's your email address?"
        sublabel = "This will be used to create your profile on the app so you can login."
      }
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
            padding='128'
            height={'100%'}

          // border="1em solid rgb(138, 99, 210)"
          >
            <VStack gap="20">
              <Heading align="center" size="48">
                Profile Creation:
              </Heading>
              <Box gap={'10'}>
                <Text align="center" size="20">
                  {label}
                </Text>
                {sublabel.length > 1 ? <Text size='16' align="center" color={isError ? 'red' : undefined}>{sublabel}</Text> : <></>}

              </Box>
            </VStack>
          </Box>
        </>
      ),
      intents: info !== 'end' ? [

        <TextInput placeholder={placeholder} />,
        ...[previous !== '' ? <Button action={`/add_profile_data/${previous}`}>Back</Button> :
          <Button.Reset>♻️Reset</Button.Reset>,
        ],
        <Button
          action={`/add_profile_data/${next}`}
        >Save and Continue</Button>,

      ] :
        [
          <Button.Link href={`https://t.me/CovarianceBot?start=magic_${userGroupId}`}>🤖 Chat with CovarianceAiBot</Button.Link>
        ]
    })

  } catch (e) {
    const error = e as Error
    return c.error({ message: error.message })
  }
})

export default app;
