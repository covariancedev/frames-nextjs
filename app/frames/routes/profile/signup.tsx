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
  whitelisted: {
    [key: string]: boolean
  }
  user?: Awaited<ReturnType<typeof getFarQuestUserDetails>>
}

const useNewImages = true


// type RedisFarcasterUser = Awaited<ReturnType<typeof getFcUser>>

const app = new Frog<{ State: State }>({
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars },
  initialState: {
    info: {},
    user: undefined,
    whitelisted: {
      covariance: false
    }
  },
  verify: process.env.NODE_ENV === 'production',
  headers: {
    'cache-control': 'max-age=0',
  }
});

const hub = 'covariance'


const isDev = process.env.NODE_ENV === 'development'


app.frame("/", (c) => {

  return c.res({
    action: "/check_user_status",
    image: `${config.baseUrl}/frame-slides/${hub}/disclaimer.png`,
    intents: [
      <Button.Reset>Go back</Button.Reset>,
      <Button value="start">Check Eligibilty</Button>
    ],
  })

});

// slide for lil info about the hub
app.frame("/about/:hub", async c => {
  const params = c.req.param()
  const hubs = config.hubs
  const hub = hubs.find(h => h.code === params.hub)


  if (!hub) {
    return c.res({
      image: <ErrorImage title="Hub not found" subtitle={`Sorry, the ${params.hub} hub cannot be found.`} />,
      intents: [
        <Button.Reset>Back</Button.Reset>,
      ]
    })
  }

  return c.res({
    image: `${config.baseUrl}/frame-slides/${hub.code}/about.png`,
    intents: [
      <Button.Link href={config.aboutUrl}>Read more</Button.Link>,
      <Button action="/check_user_status" value="start">Apply</Button>,
    ]
  })
})

app.frame("/check_user_status", async (c) => {
  console.log("check_user_status top",);
  const state = await c.deriveState(async (previousState) => {
    if (c.frameData) {
      previousState.user = previousState.user ??
        await getFarQuestUserDetails(c.frameData.fid)
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
  let isParticipantOfWork = state.whitelisted[hub]
  if (!isParticipantOfWork) {
    console.log(`User ${fid} is not a participant of the work channel`);
    isParticipantOfWork = await isFarcasterUserParticipantOfWorkChannel(fid, "work")
    state.whitelisted[hub] = isParticipantOfWork
  }

  // const name = <Text>{state.user.username}</Text>

  return c.res({
    image: `${config.baseUrl}/frame-slides/${hub}/${isParticipantOfWork ? "" : 'not-'}eligible.png`,
    intents: isParticipantOfWork ?
      [
        <Button action="/">{"🔙"}</Button>,
        <Button
          action={"/add_profile_data/start"}
        >Create Profile</Button>
      ] :
      [<Button.Link href="https://app.covariance.network/sign-up">Apply via Website</Button.Link>]
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
      previousState.info[info === 'end' ? 'telegram' : info] = inputText
    }
  })

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
      console.log(`add_profile_data >> farcasterUrl: ` + `https://warpcast.com/${state.user.username}`);
      console.log(`add_profile_data >> state.info: `, state.info);
      const email = state.info.email as string
      const farcasterUrl = `https://warpcast.com/${state.user.username}`
      const existingContributor = await airtable.contributors.select({ filterByFormula: `OR({Email} = '${email}', {Farcaster} = '${farcasterUrl}')`, maxRecords: 1 }).all()
      const existingUserGroup = await airtable.user_group.select({ filterByFormula: `{E-mail} = '${email}'`, maxRecords: 1 }).all()
      const user = existingUserGroup[0]
      const contributor = existingContributor[0]
      console.log(`existingContributor`, contributor?.fields, { Hubs: contributor?.fields?.Hubs, "User Groups": contributor?.fields?.["User Groups"] });
      console.log(`existingUserGroup`, user);
      if (saveToDb) {


        // const dbProfile = await airtable.contributors.select({ filterByFormula: `{Farcaster} = '${farcasterUrl}'`, maxRecords: 1 }).all()

        const fcUser = await getFcUser(state.user.username)

        if (!user) {
          console.log(`Adding new user group for ${state.info.email}`)
          const userGroup = user ? user : await airtable.user_group.create({
            "Name": state.info.name as string,
            "E-mail": state.info.email as string,
            // "Farcaster": `https://warpcast.com/${state.user.username}`
          })

          userGroupId = userGroup.id

        }


        const foundInHub = (contributor.fields.Hubs as string[]).find(h => h.toLowerCase() === hub)
        let profileId = contributor?.id
        let isFarcasterUser = contributor.fields.Farcaster === farcasterUrl
        if (!foundInHub) {
          let telegramUsername = state.info.telegram as string
          // remove "@" from username
          telegramUsername = telegramUsername.replace('@', '').trim().toLowerCase()
          const profile =
            await airtable.contributors.create({
              Name: state.info.name as string,
              Email: state.info.email as string,
              Notes: fcUser.bio,
              // Role: state.info.role as string,
              // Company: state.info.company as string,
              ToS: true,
              "Telegram": telegramUsername,
              Farcaster: `https://warpcast.com/${state.user.username}`,
              // expertise
              // fldnEG45PcwNEDObI: (state.info.expertise as string).split(',').map((e: string) => e.toLowerCase().trim()),
              "Source": [
                "Farcaster"
              ],
              Hubs: [config.hubs.find(h => h.code === hub)?.id as string],
              "Referred by": "Lior Goldenberg",
              // @ts-ignore
              "Profile Picture": [{ url: fcUser.pfp }] as { url: string }[],
              "Invite Code": config.inviteCode,
            },
              { typecast: true }
            )
          profileId = (profile as unknown as { id: string }).id

        }

        await addFarcasterInfo(fcUser, profileId, isFarcasterUser)
        // await redis.hset(`${hub}_contributors_${isDev ? 'test' : 'live'}:${fid}`, fcUser)
      }
    }

    const checkError = !['end', 'start'].includes(info)
    let emailExists = false
    let magicLink: string | undefined = undefined
    let image = ''
    console.log('checkError', { checkError, inputText })

    checkingErrors: {

      if ((checkError)) {
        let message = 'Invalid input: '
        if (!inputText) {
          message += `${info === 'name' ? 'Name' : info === 'email' ? 'Email' : 'Telegram username'} is required`
        } else {


          if (info === 'email') {
            const email = state.info.email as string

            if (!email.includes('@')) {
              message = `Invalid email address captured`
            } else {
              const userGroup = await airtable.user_group.select({ filterByFormula: `{E-mail} = '${state.info.email}'`, maxRecords: 1 }).all()
              console.log(`user group for ${state.info.email}`, userGroup[0]);

              if (userGroup[0]) {
                message = `Email address already in use.`
                emailExists = true
                if (saveToDb) {
                  magicLink = userGroup[0].fields['Magic Link'] as string
                }
                // break checkingErrors
              } else {
                console.log(`user not found for ${state.info.email}`);
                break checkingErrors
              }
            }
          } else {

            console.log(`info: ${info}`);

            break checkingErrors
          }
        }

        return c.error({ message })

      }

    }

    console.log(`out of checkingErrors`, {
      info, state
    });


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
        image = 'name'
        label = "What's your full name?"
      }
        break

      case 'name': {
        next = "end"
        previous = "email"
        label = "What's your telegram username?"
        image = 'telegram'
        sublabel = `We will use this to cross check your farcaster profile on Telegram`
        placeholder = "durov"
      }
        break;

      case 'end': {
        label = "Thank you for providing your information."
        sublabel = `Have a chat with our telegram bot for the group link and login information.`
        image = 'finished'
      }
        break;

      default: {
        next = 'email'
        placeholder = "email@example.com"
        label = "What's your email address?"
        image = 'email'
        sublabel = "This will be used to create your profile on the app so you can login."
      }
        break
    }

    image = info === 'end' ? image : `${image}-${isError ? 'error' : 'input'}`
    console.log(`info: ${info}`, {
      next, previous, placeholder, label, sublabel, image

    });


    if (useNewImages) {
      return c.res({
        image: `/frame-slides/${hub}/${image}.png`,
        intents: info !== 'end' ? [

          <TextInput placeholder={placeholder} />,
          // ...[previous !== '' ? 
          <Button action={`/add_profile_data/${previous}`}>Back</Button>,
          //  :
          // <Button.Reset>♻️Reset</Button.Reset>,
          // ],
          <Button
            action={`/add_profile_data/${next}`}
          >Next </Button>,

        ] :
          [
            <Button.Link href={`https://t.me/CovarianceBot?start=magiclink_${userGroupId}`}>Launch 🤖</Button.Link>
          ]
      })
    }


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
        // ...[previous !== '' ? 
        <Button action={`/add_profile_data/${previous}`}>Back</Button>,
        //  :
        // <Button.Reset>♻️Reset</Button.Reset>,
        // ],
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
    console.error(`Error in add_profile_data`, error);

    return c.error({ message: error.message })
  }
})

export default app;
