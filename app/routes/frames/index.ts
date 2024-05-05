import { vars } from "@utils/ui";
import { Frog } from "@airstack/frog";

const app = new Frog({
  apiKey: process.env.AIRSTACK_API_KEY as string,
  ui: { vars },
});

export default app;
