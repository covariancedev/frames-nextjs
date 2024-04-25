import {
  createAllowList,
  CreateAllowListInput,
  CreateAllowListOutput,
  TokenBlockchain,
  getFarcasterChannelParticipants,
  FarcasterChannelParticipantsInput,
  FarcasterChannelParticipantsOutput,
  FarcasterChannelActionType,
} from "@airstack/frog";

export async function isFarcasterUserParticipantOfWorkChannel(
  fid: number,
  channel = "farcaster"
) {
  console.log("isFarcasterUserParticipantOfWorkChannel", { fid, channel });
  const input: FarcasterChannelParticipantsInput = {
    channel,
    // actionType: [
    //   FarcasterChannelActionType.Cast,
    //   FarcasterChannelActionType.Reply,
    // ],
    // lastActionTimestamp: {
    //   after: "2024-02-01T00:00:00Z",
    //   before: "2024-02-28T00:00:00Z",
    // },
    // limit: 100,
  };

  const { data, error }: FarcasterChannelParticipantsOutput =
    await getFarcasterChannelParticipants(input);

  if (error) {
    console.error("isFarcasterUserParticipantOfWorkChannel", error);
    return false;
  } // throw new Error(error);

  const found=data?.find((participant) => participant.fid === fid.toString());
  console.log("isFarcasterUserParticipantOfWorkChannel", {  found });
return !!found}

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
