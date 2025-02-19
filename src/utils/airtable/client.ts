import Airtable from "airtable";
import config from "../config";

const client = new Airtable({ apiKey: config.airtable.pat });
const base = client.base(config.airtable.database.id);

export const airtable = {
  contributors: base.table(config.airtable.database.tables.contributors),
  farcaster: base.table(config.airtable.database.tables.farcaster),
  user_group: base.table(config.airtable.database.tables.user_group),
  hubs: base.table("Hubs"),
};
