import { openKv } from "@deno/kv";
import { z } from "zod";
import { kvdex, collection } from "@olli/kvdex";
import { zodModel } from "@olli/kvdex/ext/zod";

export const kv = await openKv(
  "https://api.deno.com/databases/c0600d91-e07d-4427-ae00-d24dc29eaccd/connect"
);

// type User = z.infer<typeof ContributorModel>

const ContributorModel = z.object({
  username: z.string(),
  fid: z.number(),
});

export const db = kvdex(kv, {
  farcaster_contributors: collection(zodModel(ContributorModel), {
    indices: {
      fid: "primary",
      username: "primary",
    },
  }),
});
