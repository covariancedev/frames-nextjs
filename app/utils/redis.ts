import { Redis } from "@upstash/redis";
import { getEnvOrThrow } from "./misc";

export const redis = new Redis({
  url: getEnvOrThrow("UPSTASH_REDIS_REST_URL"),
  token: getEnvOrThrow("UPSTASH_REDIS_REST_TOKEN"),
});
