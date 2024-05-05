/** @jsxImportSource @airstack/frog/jsx */
import { Box, Heading, Text, VStack, vars } from "@utils/ui";
import { Button, FrameIntent, Frog, TextInput } from "@airstack/frog";
import { isFarcasterUserParticipantOfWorkChannel } from "@utils/farcaster";

const app = new Frog({
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars },
});


const isDev = process.env.NODE_ENV === 'development'
const devFid = 7589



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

export default app;
