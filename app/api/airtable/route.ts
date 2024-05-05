import { airtableData } from "@/app/data";
import {
  getHubs,
  syncContributorsWithFarcasterDataOnAirtable,
} from "@utils/airtable";

export async function GET() {
  const hubs = await getHubs();
  return Response.json({ hubs, airtableData });
}
