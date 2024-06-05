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
  // match the url with the warpcast pattern and extract the handle. The handle can be found in the 'handle' group with the key 'handle'
  // a handle can be in the form of @username or username or @user-name or user-name or @user_name or user_name
  const match = url.match(
    /^https?:\/\/(www\.)?warpcast.com\/(?<handle>(@)?[a-zA-Z0-9_\-]+)$/
  );
  return match?.groups?.handle ? match.groups.handle.toLowerCase() : null;
}
