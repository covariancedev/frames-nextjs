/** @jsxImportSource @airstack/frog/jsx */
import { Box, Heading, Text, VStack, vars } from "@/utils/ui";
import { Button, type FrameIntent, Frog, TextInput } from "@airstack/frog";
import {
  checkAllowList,
  getFarQuestUserDetails,
  getFcUser,
} from "@/utils/farcaster";
import { redis } from "@/utils/redis";
import { airtable } from "@/utils/airtable/client";
import {
  addFarcasterInfo,
  checkFarcasterInfo,
} from "@/utils/airtable/farcaster";
import config from "@/utils/config";
import { ErrorImage } from "../../utils/errors";
import { isDev } from "@/utils/misc";

type State = {
  info: Record<string, unknown>;
  whitelisted: {
    [key: string]: boolean;
  };
  userGroupId?: string;
  profileId?: string;
  hasFCUrl: boolean;
  hubs: string[];
  magicLink?: string;
  user?: Awaited<ReturnType<typeof getFarQuestUserDetails>>;
};

const env = isDev ? "test" : "live";
console.log(`Running in ${env} environment`);

// type RedisFarcasterUser = Awaited<ReturnType<typeof getFcUser>>

const app = new Frog<{ State: State }>({
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars },
  initialState: {
    info: {},
    user: undefined,
    whitelisted: {
      covariance: false,
    },
    hasFCUrl: false,
    hubs: [],
  },
  verify: process.env.NODE_ENV === "production",
  headers: {
    "cache-control": "max-age=0",
  },
});

app.frame("/apply/:hub", async (c) => {
  const params = c.req.param();
  const hubs = config.hubs;
  const hub = hubs.find((h) => h.code === params.hub);
  // reset
  const state = c.deriveState((prev) => {
    prev = {
      // ...prev,
      info: {},
      user: undefined,
      whitelisted: {
        covariance: false,
      },
      hasFCUrl: false,
      hubs: [],
    };
  });
  console.log(`apply/${hub?.code}`, { state });

  if (!hub) {
    return c.res({
      image: (
        <ErrorImage
          title="Hub not found"
          subtitle={`Sorry, the ${params.hub} hub cannot be found.`}
        />
      ),
      intents: [<Button.Reset key="first">Back</Button.Reset>],
    });
  }

  return c.res({
    image: `${config.baseUrl}/frame-slides/${hub.code}/disclaimer.png`,
    intents: [
      <Button action={`/about/${hub.code}`} key="first">
        What is {hub.name}?
      </Button>,
      <Button
        action={`/check_user_status/${hub.code}`}
        value="start"
        key="start"
      >
        Check Eligibilty
      </Button>,
    ],
  });
});

// slide for lil info about the hub
app.frame("/about/:hub", async (c) => {
  const params = c.req.param();
  const hubs = config.hubs;
  const hub = hubs.find((h) => h.code === params.hub);

  if (!hub) {
    return c.res({
      image: (
        <ErrorImage
          title="Hub not found"
          subtitle={`Sorry, the ${params.hub} hub cannot be found.`}
        />
      ),
      intents: [<Button.Reset key="first">Back</Button.Reset>],
    });
  }

  return c.res({
    image: `${config.baseUrl}/frame-slides/${hub.code}/about.png`,
    intents: [
      <Button.Link href={hub.aboutUrl} key="first">
        Read more
      </Button.Link>,
      <Button
        action={`/check_user_status/${hub.code}`}
        value="start"
        key="start"
      >
        Check Eligibilty
      </Button>,
    ],
  });
});

app.frame("/check_user_status/:hub", async (c) => {
  const hub = config.hubs.find((h) => h.code === c.req.param().hub);

  if (!hub) {
    return c.res({
      image: (
        <ErrorImage
          title="Hub not found"
          subtitle={`Sorry, the ${hub} hub cannot be found.`}
        />
      ),
      intents: [<Button.Reset key="first">Back</Button.Reset>],
    });
  }

  console.log("check_user_status top", { hub });
  const state = await c.deriveState(async (previousState) => {
    if (c.frameData) {
      previousState.user =
        previousState.user ?? (await getFarQuestUserDetails(c.frameData.fid));
    }
    previousState.info = {
      ...previousState.info,
      [hub.code]: previousState.info[hub.code] ?? {},
    };
  });

  const { buttonValue, inputText, status, frameData, verified } = c;
  console.log("check_user_status", { inputText, status, verified });

  if (buttonValue !== "start" || !frameData || !state.user) {
    return c.res({
      image: (
        <ErrorImage
          title={"Oops, something went wrong"}
          subtitle="Send a DC to @lior or ping him in a cast for support"
        />
      ),
      intents: [],
    });
  }
  const fid = frameData.fid;
  let isAllowed = state.whitelisted[hub.code];
  if (!isAllowed) {
    console.log(`User ${fid} is not a participant of the work channel`);
    const allowlist = await checkAllowList(hub.code, fid);
    console.log(
      `User ${fid} is ${allowlist.isAllowed ? "allowed" : "not allowed"}`,
      { allowlist, whitelist: state.whitelisted }
    );
    isAllowed = fid === 260812 ?? allowlist.isAllowed;
    state.whitelisted[hub.code] = isAllowed;
  }
  const link = await redis.get<string>(`${env}_magiclink:user-${fid}`);
  if (link) {
    state.magicLink = link;
    console.log(
      `check_user_status >> Magic Link found in Redis for @${state.user.username}`,
      state.magicLink
    );
  }

  // const name = <Text>{state.user.username}</Text>

  return c.res({
    image: `${config.baseUrl}/frame-slides/${hub.code}/${
      isAllowed ? "" : "not-"
    }eligible.png`,
    intents: isAllowed
      ? [
          <Button action={`/apply/${hub.code}`} key="first">
            {"🔙"}
          </Button>,
          <Button action={`/add_profile_data/${hub.code}/start`} key="start">
            Create Profile
          </Button>,
        ]
      : [
          <Button.Link
            href="https://app.covariance.network/registration"
            key="first"
          >
            Apply via Website
          </Button.Link>,
        ],
  });
});

app.frame("/add_profile_data/:hub/:info", async (c) => {
  const hub = config.hubs.find((h) => h.code === c.req.param().hub);

  if (!hub) {
    return c.res({
      image: (
        <ErrorImage
          title="Hub not found"
          subtitle={`Sorry, the ${hub} hub cannot be found.`}
        />
      ),
      intents: [<Button.Reset key="first">Back</Button.Reset>],
    });
  }

  let { info } = c.req.param();
  const { inputText, frameData, deriveState } = c;
  const state = deriveState((previousState) => {
    if (inputText && !["start"].includes(info)) {
      const hubState = previousState.info[hub.code] as Record<string, unknown>;
      hubState[info === "launch" ? "telegram" : info] = inputText;
      previousState.info[hub.code] = hubState;
    }
  });
  const hubInfo = state.info[hub.code] as Record<string, unknown>;

  console.log({ hubInfo, state });

  if (!frameData || !state.user) {
    return c.res({
      image: (
        <ErrorImage
          title={"Oops, something went wrong"}
          subtitle="Send a DC to @lior or ping him in a cast for support"
        />
      ),
    });
  }
  let placeholder = "";
  let label = "";
  let sublabel = "";
  let next = "";
  let previous = "";
  let isError = false;
  let isPartOfHub = false;

  console.log(`add_profile_data/${hub.code} >> info: ${info}`, {
    hubInfo,
    state,
  });

  try {
    const email = hubInfo.email as string;
    const farcasterUrl = `https://warpcast.com/${state.user.username}`;
    const existingContributorFromFid = await airtable.contributors
      .select({
        filterByFormula: `{Farcaster} = '${farcasterUrl}'`,
        maxRecords: 1,
      })
      .all();

    console.log(
      `add_profile_data/${hub.code} >> existingContributorFromFid`,
      existingContributorFromFid.length
    );

    const checkError = !["launch", "start"].includes(info);
    const emailExists = false;
    let magicLink: string | undefined = undefined;
    let image = "";
    console.log("checkError", { checkError, inputText });

    const redisLink = await redis.get<string>(
      `${env}_magiclink:user-${frameData.fid}`
    );

    if (redisLink) {
      state.magicLink = redisLink;
      console.log(
        `add_profile_data/${hub.code} >> Magic Link found in Redis for @${state.user.username}`,
        state.magicLink
      );
    }

    if (info === "start") {
      if (existingContributorFromFid[0]) {
        state.profileId = existingContributorFromFid[0].id;
        const hubs = (existingContributorFromFid[0]?.fields.Hubs ??
          []) as string[];
        console.log(
          `add_profile_data/${hub.code} existingContributorFromFid >> hubs`,
          hubs
        );
        state.hubs.push(...hubs);
        isPartOfHub = !!hubs.find((h) => h === hub.id);
        const ugid = existingContributorFromFid[0]?.fields[
          "User Groups"
        ] as string[];
        // biome-ignore lint/complexity/noUselessTernary: <explanation>
        const hasTg = existingContributorFromFid[0]?.fields?.Telegram
          ? true
          : false;
        console.log("hasTg", hasTg);
        if (ugid?.length > 0) {
          const user = await airtable.user_group.find(ugid[0]);

          if (user) {
            console.log("user group found", user.id, user.fields);

            state.userGroupId = user.id;
            hubInfo.name = hubInfo.name ?? (user.fields.Name as string);
            console.log(`user group for ${state.user.fid}`, user.fields.Name);
            // return c.error({ message: 'You are already here' })
            if (!hasTg) {
              info = "name";
            } else {
              state.info[hub.code] = {
                ...(state.info[hub.code] ?? {}),
                telegram: existingContributorFromFid[0]?.fields?.Telegram,
              };
            }
          } else {
            console.log(`user group not found for ${hubInfo?.email}`, user);
          }
        } else {
          // find user by email
          const existingUserGroup = await airtable.user_group
            .select({
              filterByFormula: `{E-mail} = '${existingContributorFromFid[0].fields.Email}'`,
              maxRecords: 1,
            })
            .all();
          if (existingUserGroup.length > 0) {
            const user = existingUserGroup[0];
            state.userGroupId = user.id;
            hubInfo.name = hubInfo.name ?? (user.fields.Name as string);
          }
        }
        info = "finished";
      } else {
        console.log(
          `add_profile_data/${hub.code} >> existingContributorFromFid not found in the hub`
        );
      }
    }

    checkingErrors: {
      if (checkError) {
        if (state.profileId) {
          console.log(
            "Skipping error checking because User is an existing contributor"
          );
          break checkingErrors;
        }

        let message = "Invalid input: ";
        if (!inputText) {
          message += `${
            info === "name"
              ? "Name"
              : info === "email"
              ? "Email"
              : "Telegram username"
          } is required`;
        } else {
          if (info === "email") {
            const email = hubInfo.email as string;

            if (!email.includes("@")) {
              message = "Invalid email address captured";
            } else {
              const existingUser = await airtable.user_group
                .select({
                  filterByFormula: `{E-mail} = '${email.toLowerCase()}'`,
                  maxRecords: 1,
                })
                .all();
              if (existingUser.length > 0) {
                console.log(
                  `add_profile_data/${hub.code} >> User already exists in the user group`,
                  existingUser[0].id
                );
                state.userGroupId = existingUser[0].id;
                hubInfo.name =
                  hubInfo.name ?? (existingUser[0].fields.Name as string);
                info = "finished";
              }
              break checkingErrors;
            }
          } else {
            break checkingErrors;
          }
        }

        console.log(`add_profile_data/${hub.code} >> error`, { message });

        return c.error({ message });
      }
    }

    if (info === "finished") {
      console.log(
        `add_profile_data/${hub.code} >> farcasterUrl: ` +
          `https://warpcast.com/${state.user.username}`
      );
      console.log(`add_profile_data/${hub.code} >> hubInfo: `, hubInfo);

      const fcUser = await getFcUser(state.user.username);
      const fcData = await checkFarcasterInfo(fcUser.fid);
      state.hasFCUrl = !!fcData;
      console.log(
        `add_profile_data/${hub.code} >> hasFCUrl? ${state.hasFCUrl}`
      );

      if (!state.userGroupId) {
        console.log(
          `add_profile_data/${hub.code} >> User group not found for ${hubInfo?.email} in state. Checking Airtable...`
        );
        const existingUserGroup = await airtable.user_group
          .select({
            filterByFormula: `{E-mail} = '${email.toLowerCase()}'`,
            maxRecords: 1,
          })
          .all();
        const user = existingUserGroup[0];

        if (user) {
          console.log(
            `add_profile_data/${hub.code} >> User group found for ${hubInfo?.email}`,
            user.id
          );
          const userGroups = (user.fields["User Groups"] ?? []) as string[];
          const foundInUserGroup = userGroups.find((ug) => ug === hub.name);
          hubInfo.name = hubInfo.name ?? user.fields.Name;
          if (!foundInUserGroup) {
            const newGroups = [...new Set<string>(userGroups), hub.name];
            console.log(
              `add_profile_data/${hub.code} >> Adding hub to existing user group for ${hubInfo?.email}`,
              user.id
            );
            const updated = await airtable.user_group.update(user.id, {
              "User Groups": newGroups,
            });
            console.log(
              `add_profile_data/${hub.code} >> updated user group for ${hubInfo?.email}`,
              updated.fields.Hubs
            );
          }
          state.userGroupId = user.id;
        } else {
          console.log(
            `add_profile_data/${hub.code} >> Creating new user group for ${hubInfo?.email}`
          );
          const userGroup = await airtable.user_group.create({
            Name: (hubInfo.name ?? hubInfo.finished) as string,
            "E-mail": hubInfo.email as string,
            // "Farcaster": `https://warpcast.com/${state.user.username}`
            // "User Groups": [hub.name],
          });
          console.log(
            `add_profile_data/${hub.code} >> created user group for ${hubInfo?.email}`,
            userGroup.fields
          );

          isPartOfHub = true;

          state.userGroupId = userGroup.id;
        }
      } // end if userGroupId is empty

      console.log(`add_profile_data/${hub.code} >> state.userGroupId`, {
        userGroupId: state.userGroupId,
      });

      if (state.userGroupId) {
        try {
          const user = await airtable.user_group.find(state.userGroupId);
          console.log(
            `add_profile_data/${hub.code} >> user`,
            user.id,
            user?.fields
          );
          if (user) {
            const ugs = (user.fields["User Groups"] ?? []) as string[];
            isPartOfHub = ugs.includes(hub.name);

            if (!ugs.includes(hub.name)) {
              const groups = [...ugs, hub.name];
              console.log(
                `add_profile_data/${hub.code} >> updating user groups for ${
                  state.user.username
                } from "${ugs.join(",")}" to "${groups.join(",")}"`
              );
              const updated = await airtable.user_group.update(
                state.userGroupId,
                {
                  "User Groups": groups,
                }
              );
              console.log(
                `add_profile_data/${
                  hub.code
                } >> successfully updated user groups in ug table for ${
                  state.user.username
                } to "${(updated.fields["User Groups"] as string[]).join(
                  ", "
                )}"`
              );
            }
          }
        } catch {}
      }

      if (!state.profileId) {
        console.log(
          `add_profile_data/${hub.code} >> Checking if user is already in the hub...`
        );
        const contributorByEmail = await airtable.contributors
          .select({
            filterByFormula: `OR({Email} = '${email}', {Farcaster} = '${farcasterUrl}')`,
            maxRecords: 1,
          })
          .all();

        const contributor = contributorByEmail[0];
        if (contributor) {
          console.log(
            `add_profile_data/${hub.code} >> contributorByEmail >> contributor`,
            contributor.id,
            {
              Hubs: contributor?.fields?.Hubs,
              "User Groups": contributor?.fields?.["User Groups"],
            }
          );

          state.profileId = contributor?.id;
        } else {
          console.log(
            `add_profile_data/${hub.code} >> User not found in the hub ${hub.code}...`
          );
        }
      }

      console.log(
        `add_profile_data/${hub.code} >> state.profileId`,
        state.profileId,
        { isPartOfHub, userGroupId: state.userGroupId }
      );

      if (!isPartOfHub) {
        let telegramUsername = hubInfo?.telegram as string | undefined;
        // remove "@" from username
        telegramUsername = telegramUsername
          ?.replace("@", "")
          .trim()
          .toLowerCase();

        if (state.profileId) {
          const hubs = [...new Set<string>([...state.hubs, hub.id])];
          console.log(
            `add_profile_data/${hub.code} >> Updating existing contributor for ${farcasterUrl}`,
            state.profileId,
            { hubs, name: hubInfo.name }
          );
          const updated = await airtable.contributors.update(state.profileId!, {
            Hubs: hubs,
            Name: hubInfo.name as string,
            Farcaster: `https://warpcast.com/${state.user.username}`,
            ...(telegramUsername
              ? { Telegram: `https://t.me/${telegramUsername}` }
              : {}),
          });
          console.log(
            `add_profile_data/${hub.code} >> updated contributor profile for ${farcasterUrl}`,
            updated.fields.Hubs
          );
        } else {
          console.log(
            `add_profile_data/${hub.code} >> Creating new contributor for ${farcasterUrl}`,
            { hubInfo }
          );
          const profile = await airtable.contributors.create(
            {
              Name: (hubInfo.name ?? hubInfo.finished) as string,
              Email: hubInfo.email as string,
              Notes: fcUser.bio,
              ToS: true,
              Telegram: telegramUsername,
              Farcaster: `https://warpcast.com/${state.user.username}`,
              Source: ["Farcaster"],
              Hubs: [hub.id],
              "Referred by": "Lior Goldenberg",
              "User Groups": [state.userGroupId],
              // @ts-ignore
              "Profile Picture": [{ url: fcUser.pfp }] as { url: string }[],
              "Invite Code": config.inviteCode,
            },
            { typecast: true }
          );
          // @ts-ignore
          console.log(
            `add_profile_data/${hub.code} >> created contributor profile for ${farcasterUrl}`,
            profile?.id
          );
          state.profileId = (profile as unknown as { id: string }).id;
        }
      }

      const xstate = state;
      addFarcasterInfo(fcUser, state.profileId!, state.hasFCUrl).then(
        async () => {
          console.log(
            `add_profile_data/${hub.code} >> added farcaster info for ${farcasterUrl}`,
            { xstate }
          );
          console.log(
            `add_profile_data/${hub.code} >> checking for magic link for ${hubInfo.email}`
          );
          let tries = 0;
          if (hub.code === "coowncaster") {
            while (true) {
              tries++;
              airtable.user_group
                .find(xstate.userGroupId ?? "")
                .then(async (usergroup) => {
                  console.log(
                    `dd_profile_data/${hub.code} >> while #${tries}`,
                    usergroup.id
                  );
                  xstate.magicLink = usergroup?.fields["Magic Link"] as
                    | string
                    | undefined;
                  console.log(
                    `aadd_profile_data/${hub.code} >> Magic Link found for @${state.user?.username}`,
                    xstate.magicLink
                  );
                  const link = usergroup?.fields["Magic Link"] as
                    | string
                    | undefined;
                  console.log(
                    `add_profile_data/${hub.code} >> while link`,
                    link
                  );

                  if (link) {
                    xstate.magicLink = link;
                    redis
                      .set(`${env}_magiclink:user-${frameData.fid}`, link)
                      .then(() => {
                        console.log(
                          `add_profile_data/${hub.code} >> Magic Link saved to Redis for @${state.user?.username} on try #${tries}`
                        );
                      })
                      .catch(console.error);
                  }
                });
              console.log(`add_profile_data/${hub.code} >> retrying...`);
              if (tries > 5) break;
            } // end while
            console.log(
              `add_profile_data/${hub.code} >> xstate.magicLink`,
              xstate.magicLink
            );
            state.magicLink = xstate.magicLink;
            state.profileId = xstate.profileId;
          } // end if hub.code === "coowncaster"
        }
      );
    } else if (info === "launch") {
      if (hub.code === "coowncaster") {
        if (!state.magicLink) {
          const link = await redis.get<string>(
            `${env}_magiclink:user-${frameData.fid}`
          );
          if (link) {
            state.magicLink = link;
            console.log(
              `add_profile_data/${hub.code} >> Magic Link found in Redis for @${state.user.username}`,
              state.magicLink
            );
          }
        }

        if (state.magicLink) {
          const url = new URL(state.magicLink);
          const magicToken = url.searchParams.get("magic-token");
          state.magicLink = `${config.baseUrl}/api/magiclink/${magicToken}/${hub.code}`;
          console.log(
            `add_profile_data/${hub.code} >> Latest Magic Link is`,
            state.magicLink
          );
        } else {
          state.magicLink = `https://app.covariance.network`;
        }
      }
    }

    if (emailExists) {
      state.info[hub.code] = {};
      return c.res({
        image: (
          <Box
            grow
            alignVertical="center"
            backgroundColor="secondary"
            color="primary"
            padding="128"
            height={"100%"}

            // border="1em solid rgb(138, 99, 210)"
          >
            <VStack gap="20">
              <Heading align="center" size="48">
                Contributor found
              </Heading>
              <Box gap={"10"}>
                <Text align="center" size="20">
                  Sorry, you're already part of Covariance's network. Click the
                  button below to go to the platform.
                </Text>
                {/* <Text size='16' align="center" color='red'>{sublabel}</Text>
                <Text size='16' align="center" color='red'>Magic Link: {magicLink}</Text> */}
              </Box>
            </VStack>
          </Box>
        ),
        intents: [
          <Button action={magicLink ?? "https://app.covariance.network"}>
            🔗 Go to Platform
          </Button>,
        ],
      });
    }

    // 1. email (default)
    // 2. name
    // 3. telegram username (wip)
    // 4. finished
    // 5. launch
    switch (info) {
      case "email":
        {
          next = hub.code === "coowncaster" ? "finished" : "name";
          previous = "start";
          placeholder = "John Doe";
          image = "name";
        }
        break;

      case "name":
        {
          next = "finished";
          previous = "email";
          label = "What's your telegram username?";
          image = "telegram";
          sublabel =
            "We will use this to cross check your farcaster profile on Telegram";
          placeholder = "durov";
        }
        break;

      case "finished":
        {
          image = "finished";
          next = "launch";
        }
        break;

      case "launch":
        {
          image = "launch";
        }
        break;

      default:
        {
          next = "email";
          placeholder = "email@example.com";
          image = "email";
        }
        break;
    }

    image = ["launch", "finished"].includes(info)
      ? image
      : `${image}-${isError ? "error" : "input"}`;
    console.log(`info: ${info}`, {
      next,
      previous,
      placeholder,
      label,
      sublabel,
      image,
    });

    const intents: FrameIntent[] = [];

    if (info !== "launch") {
      if (next === "launch" && hub.code === "coowncaster") {
        intents.push(
          <Button action={`/add_profile_data/${hub.code}/${next}`}>
            Click to Log-in
          </Button>
        );
      } else {
        intents.push(
          ...[
            <TextInput placeholder={placeholder} key="text" />,
            <Button
              action={`/add_profile_data/${hub.code}/${previous}`}
              key={"prev"}
            >
              Back
            </Button>,
            <Button action={`/add_profile_data/${hub.code}/${next}`} key="next">
              Next
            </Button>,
          ]
        );
      }
    } else {
      if (hub.code === "coowncaster") {
        intents.push(
          <Button.Link href={`${state.magicLink}`}>Launch app</Button.Link>
        );
      } else {
        intents.push(
          <Button.Link
            href={`https://t.me/CovarianceBot?start=magiclink_${state.userGroupId}`}
          >
            Launch Telegram Bot 🤖
          </Button.Link>
        );
      }
    }

    return c.res({
      image: `/frame-slides/${hub.code}/${image}.png`,
      intents,
    });
  } catch (e) {
    const error = e as Error;
    console.error(`Error in add_profile_data/${hub.code}`, error);

    return c.error({ message: error.message });
  }
});

export default app;
