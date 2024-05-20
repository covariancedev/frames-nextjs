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
      },
    },
  },
  baseUrl:
    process.env.NODE_ENV === "production"
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000",
};
