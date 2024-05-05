import { syncContributorsWithFarcasterDataOnAirtable } from "@utils/airtable/farcaster";

export async function GET() {
  const result = await syncContributorsWithFarcasterDataOnAirtable();

  return Response.json(result);
}
