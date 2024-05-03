import Airtable from "airtable";
import config from "./config";
import { AirtableBase } from "airtable/lib/airtable_base";
import { extractWarpcastHandle } from "./misc";
import { getAirstackUserDetails, getFarQuestUserDetails } from "./farcaster";

const client = new Airtable({ apiKey: config.airtable.pat });
const base = client.base(config.airtable.database.id);

async function updateFarcasterUrl(id: string, url: string) {
  const res = await airtable.contributors.update(id, { Farcaster: url });
  return res;
}

export const airtable = {
  contributors: base.table(config.airtable.database.tables.contributors),
  farcaster: base.table(config.airtable.database.tables.farcaster),
};

async function getContributorFarcasterInfo(fid: string) {
  console.log(`getContributorFarcasterInfo fid`, fid);

  const res = await airtable.contributors
    .select({
      filterByFormula: `{Fid} = "${fid}"`,
    })
    .all();

  return res;
}

export async function saveContributorFarcasterInfo(
  fid: string,
  data: Record<string, unknown>
) {
  const res = await airtable.contributors.create({ Fid: fid, ...data });
  return res;
}

export async function getContributorsWithFarcasterUrl() {
  const urls: Record<string, unknown>[] = [];
  const records = await airtable.contributors
    .select({ filterByFormula: `Farcaster` })
    .all();

  for (const rec of records) {
    let url = rec.fields["Farcaster"] as string | undefined;
    if (!url) {
      continue;
    }
    // console.log(`Records info for recid:${rec.id}`, rec.fields);

    // remove trailing slash and trim
    url = url.replace(/\/$/, "").trim();
    const split = url.split("/");

    if (!url.startsWith("https://warpcast.com")) {
      url = `https://warpcast.com/${split.findLast((_) => true)}`;
      console.log(`new url built:`, url);
      await updateFarcasterUrl(rec.id, url);
    }
    const username = extractWarpcastHandle(url);
    console.log("username >>", username);

    if (!username) {
      continue;
    }

    url = new URL(url).toString();
    const fc = await getFarQuestUserDetails(username);
    console.log(
      `getContributorsWithFarcasterUrl >> user(${rec.fields["Name"]}) FC url:`,
      url
    );

    if (!fc) {
      console.warn(
        `getContributorsWithFarcasterUrl >> farcaster data not found for`,
        username
      );
      continue;
    }

    const fcData = await getContributorFarcasterInfo(fc.fid).catch(() => {});
    console.log(
      `getContributorsWithFarcasterUrl >> user(${rec.fields["Name"]}) FC data:`,
      fcData
    );
    const airstack = await getAirstackUserDetails(fc.fid).catch((e) => {
      console.warn(
        `getContributorsWithFarcasterUrl >> airstack data not found for`,
        username,
        e
      );
    });

    urls.push({
      [url]: {
        fc,
        airstack,
      },
    });
  }

  return urls;
}
