import { syncContributorsWithFarcasterDataOnAirtable } from "@utils/airtable";

export async function GET() {
  const result = await syncContributorsWithFarcasterDataOnAirtable();

  return Response.json(result);
}
