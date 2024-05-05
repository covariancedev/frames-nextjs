import { airtable } from "./client";

export async function getHubs() {
  const hubs: Record<string, string>[] = [];
  const res = await airtable.hubs.select().all();

  for (const rec of res) {
    hubs.push({
      id: rec.id,
      name: rec.fields["Hub Name"] as string,
    });
  }
  return hubs;
}
