import config from "./config";
import {
  createAllowList,
  CreateAllowListInput,
  CreateAllowListOutput,
  TokenBlockchain,
  getFarcasterChannelParticipants,
  FarcasterChannelParticipantsInput,
  FarcasterChannelParticipantsOutput,
  getFarcasterUserDetails,
  FarcasterUserDetailsInput,
  FarcasterChannelActionType,
} from "@airstack/frog";

export async function getAirstackUserDetails(id: string | number) {
  const fid = typeof id === "string" ? Number(id) : id;
  const input: FarcasterUserDetailsInput = {
    fid,
  };
  const { data, error } = await getFarcasterUserDetails(input);

  if (error || !data) throw new Error(error);

  console.log("getAirstackUserDetails >> ok", fid);

  return data;
}

export async function isFarcasterUserParticipantOfWorkChannelFromWarpcastAPI(
  fid: number,
  channel = "farcaster"
) {
  console.log("isFarcasterUserParticipantOfWorkChannelFromWarpcastAPI", {
    fid,
    channel,
  });

  const res = await fetch(
    `https://api.warpcast.com/v1/channel-followers?channelId=${channel}`
  );

  if (res.status !== 200) {
    const json = (await res.json()) as { errors: { message: string }[] };
    console.error(json.errors.join("\n"));
    return false;
  }

  const data = (await res.json()) as {
    result: { users: number[]; fids: number[] };
  };

  const found = data.result.fids.find((participant) => participant === fid);
  console.log(
    `isFarcasterUserParticipantOfWorkChannelFromWarpcastAPI >> is ${found} a follower of ${channel}?`,
    !!found
  );
  return !!found;
}

export async function isFarcasterUserParticipantOfWorkChannelFromAirstack(
  fid: number,
  channel = "farcaster"
) {
  console.log("isFarcasterUserParticipantOfWorkChannelFromAirstack", {
    fid,
    channel,
  });
  const input: FarcasterChannelParticipantsInput = {
    channel,
    actionType: [FarcasterChannelActionType.Follow],
    // lastActionTimestamp: {
    //   after: "2024-02-01T00:00:00Z",
    //   before: "2024-02-28T00:00:00Z",
    // },
    // limit: 100,
  };

  const { data, error }: FarcasterChannelParticipantsOutput =
    await getFarcasterChannelParticipants(input);

  if (error) {
    console.error("isFarcasterUserParticipantOfWorkChannelFromAirstack", error);
    return false;
  } // throw new Error(error);

  const found = data?.find(
    (participant) =>
      // participant.profileName!.toLowerCase().startsWith("wapt")
      //   );
      participant.fid === fid.toString()
  );
  console.log(
    "isFarcasterUserParticipantOfWorkChannelFromAirstack",
    found?.profileName
  );
  return !!found;
}

export async function isFarcasterUserParticipantOfWorkChannel(
  fid: number,
  channel = "farcaster",
  from: "warpcast" | "airstack" = "airstack"
) {
  console.log("isFarcasterUserParticipantOfWorkChannel", {
    fid,
    channel,
    from,
  });

  const found =
    from === "warpcast"
      ? await isFarcasterUserParticipantOfWorkChannelFromWarpcastAPI(
          fid,
          channel
        )
      : await isFarcasterUserParticipantOfWorkChannelFromAirstack(fid, channel);
  console.log(`is ${found} a follower of ${channel} from ${from}?`, found);
  return found;
}

export async function getFarcasterUserAllowedList(fid: number) {
  const allowListCriteria = {
    eventIds: [166577],
    numberOfFollowersOnFarcaster: 100,
    isFollowingOnFarcaster: [2602],
    tokens: [
      {
        tokenAddress: "0x95cb845b525f3a2126546e39d84169f1eca8c77f",
        chain: TokenBlockchain.Ethereum,
      },
      {
        tokenAddress: "0x2d45c399d7ca25341992038f12610c41a00a66ed",
        chain: TokenBlockchain.Base,
      },
      {
        tokenAddress: "0x743658ace931ea241dd0cb4ed38ec72cc8162ce1",
        chain: TokenBlockchain.Zora,
      },
    ],
  };
  const input: CreateAllowListInput = {
    fid,
    allowListCriteria,
    isAllowedFunction: function (data) {
      console.log(data);
      return true;
    },
  };

  const { isAllowed, error }: CreateAllowListOutput = await createAllowList(
    input
  );

  if (error) {
    console.error("getFarcasterUserAllowedList", error);
    return;
  } // throw new Error(error);

  console.log("getFarcasterUserAllowedList", isAllowed);
}

const FARQUEST_BASE_URL = "https://build.far.quest/farcaster/v2";

async function request<T>({
  path,
  method = "GET",
}: {
  path: string;
  method?: string;
}) {
  path = `${FARQUEST_BASE_URL}/${path}`;
  console.log("request for " + path);

  const response = await fetch(path, {
    headers: {
      accept: "application/json",
      "API-KEY": config.farquestApiKey,
    },
    method,
  });

  if (!response.ok) {
    console.error("request for " + path, response.statusText);

    throw new Error(response.statusText);
  }

  const json = await response.json();

  return json as T;
}

export async function getFarQuestUserDetails(id: string | number) {
  try {
    const data = await request<{
      result: {
        user: {
          fid: string;
          followingCount: number;
          followerCount: number;
          pfp: {
            url: string;
            verified: boolean;
          };
          bio: {
            text: string;
            mentions: string[];
          };
          external: boolean;
          custodyAddress: string;
          connectedAddress: string;
          allConnectedAddresses?: {
            ethereum: string[];
            solana: string[];
          };
          username: string;
          displayName: string;
          registeredAt: number;
        };
      };
    }>({
      path:
        `user${isNaN(Number(id)) ? "-by-username?username=" : "?fid="}` + id,
    });
    return data.result.user;
  } catch (e) {
    console.error("getFarQuestUserDetails failed", e);

    throw e;
  }
}

export async function getFcUser(username: string) {
  const fromFarQuest = await getFarQuestUserDetails(username);
  const fromAirstack = await getAirstackUserDetails(fromFarQuest.fid);
  const user = {
    fid: Number(fromFarQuest.fid),
    bio: fromFarQuest.bio.text,
    fnames: fromAirstack.fnames as unknown as string[],
    displayName: fromFarQuest.displayName,
    addresses: {
      custody: fromFarQuest.custodyAddress,
      ethereum: fromFarQuest.allConnectedAddresses?.ethereum,
      solana: fromFarQuest.allConnectedAddresses?.solana,
    },
    pfp: fromAirstack.profileImage?.large ?? fromFarQuest.pfp.url,
    url: `https://warpcast.com/${fromFarQuest.username}`,
  };
  const data = {
    ...user,
    addressTypes: Object.keys(user.addresses).filter((k) => {
      const key = k as keyof typeof user.addresses;
      return typeof user.addresses[key] === "object"
        ? user.addresses[key]?.length
        : user.addresses[key];
    }),
  };

  return data;
}
