import Airtable from "airtable";
import config from "./config";
import { AirtableBase } from "airtable/lib/airtable_base";
import { extractWarpcastHandle } from "./misc";
import {
  getAirstackUserDetails,
  getFarQuestUserDetails,
  getFcUser,
} from "./farcaster";

const client = new Airtable({ apiKey: config.airtable.pat });
const base = client.base(config.airtable.database.id);

export const airtable = {
  contributors: base.table(config.airtable.database.tables.contributors),
  farcaster: base.table(config.airtable.database.tables.farcaster),
  hubs: base.table("Hubs"),
};

async function updateFarcasterUrl(id: string, url: string) {
  const res = await airtable.contributors.update(id, { Farcaster: url });
  return res;
}

async function addFarcasterInfo(
  {
    fid,
    bio,
    addressTypes,
    addresses,
    fnames,
    displayName,
    pfp,
  }: Awaited<ReturnType<typeof getFcUser>>,
  contributorId: string
) {
  try {
    const add = Object.fromEntries(
      addressTypes.map((k) => {
        let key = k as keyof typeof addresses;
        const val = addresses[key];
        key = key + (val && typeof val === "string" ? "Address" : "Addresses");
        return [key, typeof val === "string" ? val : val?.join(",")];
      })
    );

    const data = {
      fid,
      fnames: fnames.map((f) => "- " + f).join("\n"),
      displayName,
      fldixPzLtIfgkEEiT: [contributorId],
      addressTypes,
      pfp: [{ url: pfp }],
      bio,
      ...add,
    };
    const res = await airtable.farcaster.create(data);
    console.log(`addFarcasterInfo >> saved for ${fnames[0]}`, res.id);

    return res;
  } catch (error) {
    console.error(`addFarcasterInfo >> error for ${fnames[0]}`, error);
  }
}

async function getContributorFarcasterInfo(fid: number) {
  console.log(`getContributorFarcasterInfo fid`, fid);

  const res = await airtable.farcaster
    .select({
      filterByFormula: `{fid} = ${fid}`,
      maxRecords: 1,
    })
    .all();

  return res;
}

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

export async function saveContributorFarcasterInfo(
  fid: string,
  data: Record<string, unknown>
) {
  const res = await airtable.contributors.create({ Fid: fid, ...data });
  return res;
}

export async function syncContributorsWithFarcasterDataOnAirtable() {
  const urls: Record<string, unknown>[] = [];
  let ok = true;

  try {
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
      const fc = await getFcUser(username);
      console.log(
        `syncContributorsWithFarcasterDataOnAirtable >> user(${rec.fields["Name"]}) FC url:`,
        url
      );

      if (!fc) {
        console.warn(
          `syncContributorsWithFarcasterDataOnAirtable >> farcaster data not found for`,
          username
        );
        continue;
      }

      const fcData = await getContributorFarcasterInfo(fc.fid);
      console.log(
        `syncContributorsWithFarcasterDataOnAirtable >> user(${rec.fields["Name"]}) is available?`,
        Boolean(fcData.length)
      );

      if (!fcData.length) {
        addFarcasterInfo(fc, rec.id);
      }

      urls.push({
        [username]: fc,
      });
    }
  } catch (error) {
    ok = false;
    console.error(
      `syncContributorsWithFarcasterDataOnAirtable >> error`,
      error
    );
  }

  return { ok };
}
