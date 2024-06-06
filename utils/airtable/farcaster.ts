import { getFcUser } from "../farcaster";
import { extractWarpcastHandle } from "../misc";
import { airtable } from "./client";

async function updateFarcasterUrl(id: string, url: string) {
  const res = await airtable.contributors.update(id, { Farcaster: url });
  return res;
}

export async function addFarcasterInfo(
  {
    fid,
    bio,
    addressTypes,
    addresses,
    fnames,
    displayName,
    pfp,
  }: Awaited<ReturnType<typeof getFcUser>>,
  contributorId: string,
  skip = false
) {
  if (skip) {
    return;
  }

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
      "Contributor name": [contributorId],
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

export async function getContributorFarcasterInfo(fid: number) {
  console.log(`getContributorFarcasterInfo fid`, fid);

  const res = await airtable.farcaster
    .select({
      filterByFormula: `{fid} = ${fid}`,
      maxRecords: 1,
    })
    .all();

  return res.length ? res[0] : null;
}

export async function checkFarcasterInfo(fid: string | number) {
  const res = await airtable.farcaster
    .select({
      filterByFormula: `{fid} = ${fid}`,
      maxRecords: 1,
    })
    .all();

  return res.length ? res[0] : null;
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
      const oldUrl = url.replace(/\/$/, "").trim();
      url = oldUrl;
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

      const newUrl = `https://warpcast.com/${username}`;

      if (url !== newUrl) {
        console.log(
          `syncContributorsWithFarcasterDataOnAirtable >> updating url for ${username} from ${url} to ${newUrl}`
        );
        await updateFarcasterUrl(rec.id, newUrl);
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
        Boolean(fcData)
      );

      if (!fcData) {
        addFarcasterInfo(fc, rec.id);
      } else {
        console.log(
          `syncContributorsWithFarcasterDataOnAirtable >> user(${rec.fields["Name"]}) already exists`
        );

        if (fcData.fields.url !== url) {
          console.log(
            `syncContributorsWithFarcasterDataOnAirtable >> updating url for ${username} from ${fcData.fields.url} to ${url}`
          );
          const addresses = Object.fromEntries(
            fc.addressTypes.map((k) => {
              const key = k as keyof typeof fcData.fields;
              return [key, fcData.fields[key]];
            })
          );
          const updated = await airtable.farcaster.update(fcData.id, {
            ...addresses,
            url,
            fid: fc.fid,
            fnames: fc.fnames.map((f) => "- " + f).join("\n"),
            displayName: fc.displayName,
            pfp: [{ url: fc.pfp }],
            bio: fc.bio,
            addressTypes: fc.addressTypes,
          });
          console.log(
            `syncContributorsWithFarcasterDataOnAirtable >> updated for ${username}`,
            updated.id
          );
        }
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
