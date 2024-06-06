/** @jsxImportSource @airstack/frog/jsx */
import { Box, Heading, Text, VStack, vars } from "@/utils/ui";
import { Button, Frog, TextInput } from "@airstack/frog";
import { checkAllowList, getFarQuestUserDetails, getFcUser } from "@/utils/farcaster";
// import { redis } from "@/utils/redis";
import { airtable } from "@/utils/airtable/client";
import { addFarcasterInfo, checkFarcasterInfo } from "@/utils/airtable/farcaster";
import config from "@/utils/config";
import { ErrorImage } from "../../utils/errors";

type State = {
  info: Record<string, unknown>
  whitelisted: {
    [key: string]: boolean
  }
  userGroupId?: string
  profileId?: string
  hasFCUrl: boolean
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
    hasFCUrl: false,
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
  // reset
  const state = c.deriveState(prev => {
    prev = {
      // ...prev,
      info: {},
      user: undefined,
      whitelisted: {
        covariance: false
      },
      hasFCUrl: false,
      hubs: []
    }



  })
  console.log(`apply/${hub?.code}`, { state })

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
  const hubInfo = state.info[hub.code] as Record<string, unknown>

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

  const saveToDb = true// !isDev
  console.log(`add_profile_data/${hub.code} >> info: ${info}`, { hubInfo, state });

  try {

    const email = hubInfo.email as string
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
          const ugid = existingContributorFromFid[0]?.fields["User Groups"] as string[]
          console.log(`existingContributorFromFid`, state.profileId, { Hubs: hubs, foundInHub, "User Groups": ugid, isPartOfHub, });
          const hasTg = existingContributorFromFid[0]?.fields?.Telegram ? true : false
          console.log(`hasTg`, hasTg);
          if (ugid.length > 0) {

            const user = await airtable.user_group.find(ugid[0])

            if (!user) {
              console.log(`user group not found for ${hubInfo?.email}`, user);
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
      console.log(`add_profile_data/${hub.code} >> hubInfo: `, hubInfo);


      if (saveToDb) {


        // const dbProfile = await airtable.contributors.select({ filterByFormula: `{Farcaster} = '${farcasterUrl}'`, maxRecords: 1 }).all()

        const fcUser = await getFcUser(state.user.username)
        const fcData = await checkFarcasterInfo(fcUser.fid)
        state.hasFCUrl = fcData ? true : false
        console.log(`add_profile_data/${hub.code} >> hasFCUrl? ${state.hasFCUrl}`);

        if (!state.userGroupId) {
          console.log(`add_profile_data/${hub.code} >> User group not found for ${hubInfo?.email} in state. Checking Airtable...`);
          const existingUserGroup = await airtable.user_group.select({ filterByFormula: `{E-mail} = '${email}'`, maxRecords: 1 }).all()
          const user = existingUserGroup[0]
          console.log(`add_profile_data/${hub.code} >> Adding new user group for ${hubInfo?.email}`, user?.id)
          const userGroup = user ? user : await airtable.user_group.create({
            "Name": hubInfo.name as string,
            "E-mail": hubInfo.email as string,
            // "Farcaster": `https://warpcast.com/${state.user.username}`
          })
          console.log(`add_profile_data/${hub.code} >> created user group for ${hubInfo?.email}`, userGroup.id);

          state.userGroupId = userGroup.id

        } // end if userGroupId is empty

        if (!state.profileId) {
          console.log(`add_profile_data/${hub.code} >> Checking if user is already in the hub...`);
          const contributorByEmail = await airtable.contributors.select({ filterByFormula: `OR({Email} = '${email}', {Farcaster} = '${farcasterUrl}')`, maxRecords: 1 }).all()

          const contributor = contributorByEmail[0]
          if (contributor) {
            console.log(`add_profile_data/${hub.code} >> contributorByEmail >> contributor`, contributor.id, { Hubs: contributor?.fields?.Hubs, "User Groups": contributor?.fields?.["User Groups"] });

            state.profileId = contributor?.id

          } else {
            console.log(`add_profile_data/${hub.code} >> User not found in the hub ${hub.code}...`);
          }

        }



        if (!isPartOfHub) {
          let telegramUsername = hubInfo?.telegram as string | undefined
          // remove "@" from username
          telegramUsername = telegramUsername?.replace('@', '').trim().toLowerCase()
          if (state.profileId) {
            const hubs = [...new Set<string>([...state.hubs, hub.id])]
            console.log(`add_profile_data/${hub.code} >> Updating existing contributor for ${farcasterUrl}`, state.profileId, { hubs });
            const updated = await airtable.contributors.update(state.profileId!, {
              Hubs: hubs,
              Farcaster: `https://warpcast.com/${state.user.username}`,
              ...(telegramUsername ? { "Telegram": `https://t.me/${telegramUsername}`, } : {})

            })
            console.log(`add_profile_data/${hub.code} >> updated contributor profile for ${farcasterUrl}`, updated.fields.Hubs);
          } else {
            console.log(`add_profile_data/${hub.code} >> Creating new contributor for ${farcasterUrl}`);
            const profile =
              await airtable.contributors.create({
                Name: hubInfo.name as string,
                Email: hubInfo.email as string,
                Notes: fcUser.bio,
                ToS: true,
                "Telegram": telegramUsername,
                Farcaster: `https://warpcast.com/${state.user.username}`,
                "Source": ["Farcaster"],
                Hubs: [hub.id],
                "Referred by": "Lior Goldenberg",
                // @ts-ignore
                "Profile Picture": [{ url: fcUser.pfp }] as { url: string }[],
                "Invite Code": config.inviteCode,
              },
                { typecast: true }
              )
            console.log(`add_profile_data/${hub.code} >> created contributor profile for ${farcasterUrl}`, profile?.fields);
            state.profileId = (profile as unknown as { id: string }).id
          }

        }



        await addFarcasterInfo(fcUser, state.profileId!, state.hasFCUrl)
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
            const email = hubInfo.email as string

            if (!email.includes('@')) {
              message = `Invalid email address captured`
            } else {
              break checkingErrors
            }
          } else {

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
