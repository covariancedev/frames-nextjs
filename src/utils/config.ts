import { getEnvOrThrow, isDev } from "./misc";

type Hub = {
  name: "Covariance" | "CoOwnCaster";
  id: string;
  code: "covariance" | "coowncaster";
  aboutUrl: string;
  website: string;
  groupChat: string;
};

export default {
  inviteCode: "recEIenGo8Sfgr3F1",
  farquestApiKey: getEnvOrThrow("FARQUEST_API_KEY"),
  airtable: {
    pat: getEnvOrThrow("AIRTABLE_PAT"),
    database: {
      id: getEnvOrThrow("AIRTABLE_BASE_ID"),
      tables: {
        contributors: getEnvOrThrow("AIRTABLE_CONTRIBUTORS_TABLE_ID"),
        farcaster: getEnvOrThrow("AIRTABLE_FARCASTER_PROFILE_TABLE_ID"),
        user_group:
          process.env.AIRTABLE_USER_GROUP_TABLE_ID || "tblW3sBlsBvbN66qV",
      },
    },
  },
  baseUrl:
    process.env.NODE_ENV === "production"
      ? "https://covariance-api.vercel.app"
      : "http://localhost:3000",
  aboutUrl: "https://paragraph.xyz/@0xcovariance.eth/introducing-covariance",
  hubs: [
    {
      name: "Covariance",
      id: isDev ? "receeCLBe1nFJbmZO" : "recZmdQC0qwTh1PWE",
      code: "covariance",
      aboutUrl:
        "https://paragraph.xyz/@0xcovariance.eth/introducing-covariance",
      website: "https://app.covariance.network",
      groupChat: "https://t.me/CovarianceBot",
    },
    {
      name: "CoOwnCaster",
      id: isDev ? "recopV3PhfPbiGkAj" : "rec9xw8Q3EYpQwNx9",
      code: "coowncaster",
      aboutUrl:
        "https://paragraph.xyz/@0xcovariance.eth/coowncaster-an-experiment-in-co-ownership",
      website: "https://app.covariance.network/coowncaster",
      groupChat: "https://warpcast.com/~/group/Gmb_KhNulZh326RMdTpa2g",
    },
  ] as Hub[],
};
