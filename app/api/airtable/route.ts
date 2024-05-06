import { airtableData } from "@/app/data";
import { getHubs } from "@/utils/airtable/utils";

export async function GET() {
  const hubs = await getHubs();
  return Response.json({ hubs, airtableData });
}

export const dynamic = "force-dynamic"; // defaults to auto
export const revalidate = 60;
