/** @jsxImportSource @airstack/frog/jsx */
import { Box, Heading, Text, VStack, vars } from "@/utils/ui";
import { Button, Frog, TextInput } from "@airstack/frog";
import { checkAllowList, getFarQuestUserDetails, getFcUser } from "@/utils/farcaster";
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
  userGroupId?: string
  profileId?: string
  hubs: string[]
  user?: Awaited<ReturnType<typeof getFarQuestUserDetails>>
}



// type RedisFarcasterUser = Awaited<ReturnType<typeof getFcUser>>

const app = new Frog<{ State: State }>({
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars },
  initialState: {
    info: {},
    user: undefined,
    whitelisted: {
      covariance: false
    },
    hubs: []
  },
  verify: process.env.NODE_ENV === 'production',
  headers: {
    'cache-control': 'max-age=0',
  }
});





app.frame("/apply/:hub", async c => {
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
    image: `${config.baseUrl}/frame-slides/${hub.code}/disclaimer.png`,
    intents: [
      <Button action={`/about/${hub.code}`}>What is {hub.name}?</Button>,
      <Button action={`/check_user_status/${hub.code}`} value="start">Check Eligibilty</Button>,
    ]
  })
}
)

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
      <Button.Link href={hub.aboutUrl}>Read more</Button.Link>,
      <Button action={`/check_user_status/${hub.code}`} value="start">Check Eligibilty</Button>,
    ]
  })
})

app.frame("/check_user_status/:hub", async (c) => {
  const hub = config.hubs.find(h => h.code === c.req.param().hub)

  if (!hub) {
    return c.res({
      image: <ErrorImage title="Hub not found" subtitle={`Sorry, the ${hub} hub cannot be found.`} />,
      intents: [
        <Button.Reset>Back</Button.Reset>,
      ]
    })
  }

  console.log("check_user_status top", { hub });
  const state = await c.deriveState(async (previousState) => {
    if (c.frameData) {
      previousState.user = previousState.user ??
        await getFarQuestUserDetails(c.frameData.fid)
    }
    previousState.info = {
      ...previousState.info,
      [hub.code]: previousState.info[hub.code] ?? {}
    }

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
  let isAllowed = state.whitelisted[hub.code]
  if (!isAllowed) {
    console.log(`User ${fid} is not a participant of the work channel`);
    const allowlist = await checkAllowList(hub.code, fid)
    console.log(`User ${fid} is ${allowlist.isAllowed ? 'allowed' : 'not allowed'}`, { allowlist, whitelist: state.whitelisted });
    isAllowed = allowlist.isAllowed
    state.whitelisted[hub.code] = isAllowed
  }

  // const name = <Text>{state.user.username}</Text>

  return c.res({
    image: `${config.baseUrl}/frame-slides/${hub.code}/${isAllowed ? "" : 'not-'}eligible.png`,
    intents: isAllowed ?
      [
        <Button action={`/apply/${hub.code}`}>{"🔙"}</Button>,
        <Button action={`/add_profile_data/${hub.code}/start`}>Create Profile</Button>
      ] :
      [<Button.Link href="https://app.covariance.network/sign-up">Apply via Website</Button.Link>]
  })
})


app.frame("/add_profile_data/:hub/:info", async (c) => {
  const hub = config.hubs.find(h => h.code === c.req.param().hub)

  if (!hub) {
    return c.res({
      image: <ErrorImage title="Hub not found" subtitle={`Sorry, the ${hub} hub cannot be found.`} />,
      intents: [
        <Button.Reset>Back</Button.Reset>,
      ]
    })
  }

  let { info } = c.req.param()
  const { inputText, frameData, deriveState } = c
  const state = deriveState(previousState => {
    if (inputText && !['start'].includes(info)) {
      const hubState = previousState.info[hub.code] as Record<string, unknown>
      hubState[info === 'end' ? 'telegram' : info] = inputText
      previousState.info[hub.code] = hubState
    }

  })
  const hubState = state.info[hub.code] as Record<string, unknown>

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
  let placeholder = ''
  let label = ''
  let sublabel = ''
  let next = ''
  let previous = ''
  let isError = false
  let isPartOfHub = false
  let hasFCUrl = false

  const saveToDb = true// !isDev

  try {

    const email = hubState.email as string
    const farcasterUrl = `https://warpcast.com/${state.user.username}`
    const existingContributorFromFid = await airtable.contributors.select({ filterByFormula: `{Farcaster} = '${farcasterUrl}'`, maxRecords: 1 }).all()

    checkExistingFarcasterUser: {
      if (info === 'start') {

        if (existingContributorFromFid[0]) {
          state.profileId = existingContributorFromFid[0].id
          const hubs = existingContributorFromFid[0]?.fields.Hubs as string[]
          state.hubs.push(...hubs)
          const foundInHub = hubs.find(h => h.toLowerCase() === hub.id)
          isPartOfHub = !!foundInHub
          hasFCUrl = existingContributorFromFid[0]?.fields.Farcaster === farcasterUrl
          const ugid = existingContributorFromFid[0]?.fields["User Groups"] as string[]
          console.log(`existingContributorFromFid`, state.profileId, { Hubs: hubs, foundInHub, "User Groups": ugid, isPartOfHub, hasFCUrl });
          const hasTg = existingContributorFromFid[0]?.fields?.Telegram ? true : false

          if (ugid.length > 0) {

            const user = await airtable.user_group.find(ugid[0])

            if (!user) {
              console.log(`user group not found for ${hubState.email}`, user);
              break checkExistingFarcasterUser

            }
            state.userGroupId = user.id
            console.log(`user group for ${state.user.fid}`, user.fields.Name);
            // return c.error({ message: 'You are already here' })
            if (!hasTg) {
              info = 'name'
              break checkExistingFarcasterUser
            }
            state.info[hub.code] = {
              ...(state.info[hub.code] ?? {}),
              telegram: existingContributorFromFid[0]?.fields?.Telegram
            }
          }
          info = 'end'
        }
        break checkExistingFarcasterUser
      }
    }


    if (info === 'end') {
      console.log(`add_profile_data/${hub.code} >> farcasterUrl: ` + `https://warpcast.com/${state.user.username}`);
      console.log(`add_profile_data/${hub.code} >> hubState: `, hubState);

      if (!state.profileId) {
        console.log(`User not an existing contributor based on farcaster url`);
        console.log(`Checking if user is an existing contributor based on email or farcaster url`);
        const existingContributor = await airtable.contributors.select({ filterByFormula: `OR({Email} = '${email}', {Farcaster} = '${farcasterUrl}')`, maxRecords: 1 }).all()

        const contributor = existingContributor[0]
        console.log(`existingContributor`, { Hubs: contributor?.fields?.Hubs, "User Groups": contributor?.fields?.["User Groups"], userGroupId: state.userGroupId });

      }

      if (saveToDb) {


        // const dbProfile = await airtable.contributors.select({ filterByFormula: `{Farcaster} = '${farcasterUrl}'`, maxRecords: 1 }).all()

        const fcUser = await getFcUser(state.user.username)

        if (!state.userGroupId) {
          const existingUserGroup = await airtable.user_group.select({ filterByFormula: `{E-mail} = '${email}'`, maxRecords: 1 }).all()
          const user = existingUserGroup[0]
          console.log(`Adding new user group for ${hubState.email}`)
          const userGroup = user ? user : await airtable.user_group.create({
            "Name": hubState.name as string,
            "E-mail": hubState.email as string,
            // "Farcaster": `https://warpcast.com/${state.user.username}`
          })

          state.userGroupId = userGroup.id

        } // end if userGroupId is empty

        if (!state.profileId) {
          const contributorByEmail = await airtable.contributors.select({ filterByFormula: `OR({Email} = '${email}', {Farcaster} = '${farcasterUrl}')`, maxRecords: 1 }).all()

          const contributor = contributorByEmail[0]
          if (contributor) {
            console.log(`contributorByEmail >> contributor`, contributor.id, { Hubs: contributor?.fields?.Hubs, "User Groups": contributor?.fields?.["User Groups"] });

            state.profileId = contributor?.id
            hasFCUrl = contributor.fields.Farcaster === farcasterUrl

          }

        }



        if (!isPartOfHub) {
          let telegramUsername = hubState.telegram as string
          // remove "@" from username
          telegramUsername = telegramUsername.replace('@', '').trim().toLowerCase()
          if (state.profileId) {
            const hubs = [...state.hubs, hub.id]
            console.log(`Updating existing contributor for ${farcasterUrl}`, state.profileId, { hubs });
            const updated = await airtable.contributors.update(state.profileId!, {
              Hubs: hubs,
              Farcaster: `https://warpcast.com/${state.user.username}`,
              "Telegram": telegramUsername,

            })
            console.log(`updated contributor profile for ${farcasterUrl}`, updated.fields.Hubs);
          } else {
            console.log(`Creating new contributor for ${farcasterUrl}`);
            const profile =
              await airtable.contributors.create({
                Name: hubState.name as string,
                Email: hubState.email as string,
                Notes: fcUser.bio,
                // Role: hubState.role as string,
                // Company: hubState.company as string,
                ToS: true,
                "Telegram": telegramUsername,
                Farcaster: `https://warpcast.com/${state.user.username}`,
                // expertise
                // fldnEG45PcwNEDObI: (hubState.expertise as string).split(',').map((e: string) => e.toLowerCase().trim()),
                "Source": [
                  "Farcaster"
                ],
                Hubs: [hub.id],
                "Referred by": "Lior Goldenberg",
                // @ts-ignore
                "Profile Picture": [{ url: fcUser.pfp }] as { url: string }[],
                "Invite Code": config.inviteCode,
              },
                { typecast: true }
              )
            console.log(`created contributor profile for ${farcasterUrl}`, profile.fields);
            state.profileId = (profile as unknown as { id: string }).id
          }

        }

        await addFarcasterInfo(fcUser, state.profileId!, hasFCUrl)
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

        if (state.profileId) {
          console.log(`Skipping error checking because User is an existing contributor`);
          break checkingErrors
        }

        let message = 'Invalid input: '
        if (!inputText) {
          message += `${info === 'name' ? 'Name' : info === 'email' ? 'Email' : 'Telegram username'} is required`
        } else {


          if (info === 'email') {
            const email = hubState.email as string

            if (!email.includes('@')) {
              message = `Invalid email address captured`
            } else {
              const userGroup = await airtable.user_group.select({ filterByFormula: `{E-mail} = '${hubState.email}'`, maxRecords: 1 }).all()
              console.log(`user group for ${hubState.email}`, userGroup[0]);

              if (userGroup[0]) {
                message = `Email address already in use.`
                emailExists = true
                if (saveToDb) {
                  magicLink = userGroup[0].fields['Magic Link'] as string
                }
                // break checkingErrors
              } else {
                console.log(`user not found for ${hubState.email}`);
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
      state.info[hub.code] = {}
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


    return c.res({
      image: `/frame-slides/${hub.code}/${image}.png`,
      intents: info !== 'end' ? [

        <TextInput placeholder={placeholder} />,
        // ...[previous !== '' ? 
        <Button action={`/add_profile_data/${hub.code}/${previous}`}>Back</Button>,
        //  :
        // <Button.Reset>♻️Reset</Button.Reset>,
        // ],
        <Button
          action={`/add_profile_data/${hub.code}/${next}`}
        >Next </Button>,

      ] :
        [
          <Button.Link href={`https://t.me/CovarianceBot?start=magiclink_${state.userGroupId}`}>Launch 🤖</Button.Link>
        ]
    })


  } catch (e) {
    const error = e as Error
    console.error(`Error in add_profile_data/${hub.code}`, error);

    return c.error({ message: error.message })
  }
})

export default app;
