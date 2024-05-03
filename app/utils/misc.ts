export function getEnvOrThrow(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env variable: ${name}`);
  }

  return value;
}

// create a sleep function to delay the sending of messages
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function extractWarpcastHandle(url: string) {
  if (!url) return null;
  const match = url.match(/^https?:\/\/(www\.)?warpcast.com\/@?(?<handle>\w+)/);
  return match?.groups?.handle ? match.groups.handle.toLowerCase() : null;
}
