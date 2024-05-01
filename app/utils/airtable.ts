import Airtable from "airtable";
import config from "./config";

export const airtable = Airtable.configure({ apiKey: config.airtable.pat });
