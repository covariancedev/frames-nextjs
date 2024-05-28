import { getEnvOrThrow } from "./misc";

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
          process.env.AIRTABLE_USER_GROUP_TABLE_ID || "tblHb3Gme0EplWznL",
      },
    },
  },
  baseUrl:
    process.env.NODE_ENV === "production"
      ? `https://covariance-api.vercel.app`
      : "http://localhost:3000",
  aboutUrl: "https://paragraph.xyz/@0xcovariance.eth/introducing-covariance",
  hubs: [
    {
      name: "Covariance",
      id: "recZmdQC0qwTh1PWE",
      code: "covariance",
    },
  ],
};
