/** @jsxImportSource @airstack/frog/jsx */

import { Box, Heading, Text, VStack, vars } from "@/utils/ui";
import {
	Frog,
	FarcasterChannelActionType,
	getFarcasterChannelParticipants,
} from "@airstack/frog";
import { devtools } from "@airstack/frog/dev";
import { handle } from "@airstack/frog/next";
import { serveStatic } from "@airstack/frog/serve-static";
import {
	getCoOwnCasterUserAllowedList,
	getFarQuestUserDetails,
} from "@/utils/farcaster";

import onboardingFrameV1 from "../routes/profile/v1.signup";
import onboardingFrameV2 from "../routes/profile/v2.signup";
import { Button } from "frog";
import config from "@/utils/config";
import { ErrorImage } from "../utils/errors";
import { withAxiom } from "next-axiom";

const app = new Frog({
	assetsPath: "/",
	basePath: "/frames",
	apiKey: process.env.AIRSTACK_API_KEY as string,
	ui: { vars },
	verify: process.env.NODE_ENV === "production",
	// headers: {
	//   'cache-control': 'max-age=0',
	// }
});

// Uncomment to use Edge Runtime
// export const runtime = 'edge'

app.hono
	.get("/healthcheck", (c) => {
		return c.text("ribbit");
	})
	.get("/get-user/:id", async (c) => {
		const data = await getFarQuestUserDetails(c.req.param().id);
		return c.json(data);
	})
	.get("/eligibilty/:id", async (c) => {
		const data = await getCoOwnCasterUserAllowedList(Number(c.req.param().id));
		return c.json(data);
	})
	.get("/channel-followers", async (c) => {
		const followers = await getFarcasterChannelParticipants({
			channel: "work",
			actionType: [FarcasterChannelActionType.Follow],
		});
		return c.json({
			followers: {
				total: followers?.data?.length ?? 0,
				info: followers,
			},
		});
	});

app
	.frame("/", (c) => {
		return c.res({
			image: (
				<Box
					grow
					alignVertical="center"
					backgroundColor="background"
					padding="32"
				>
					<VStack gap="4">
						<Heading>Covariance 😉</Heading>
						<Text color="text200" size="20">
							The first curated business development and sales network for web3
							professionals.
						</Text>
					</VStack>
				</Box>
			),
		});
	})
	.frame("/v1/join/:hub", (c) => {
		const hub = config.hubs.find((h) => h.code === c.req.param().hub);
		if (!hub) {
			return c.res({
				image: (
					<ErrorImage
						title="Hub not found"
						subtitle={`Hub ${c.req.param().hub} not found`}
					/>
				),
			});
		}

		return c.res({
			image: `${config.baseUrl}/frame-slides/${hub.code}/intro.png`,
			intents: [
				<Button action={`/v1/profile_signup/apply/${hub.code}`} key="start">
					Lets go!
				</Button>,
			],
		});
	})
	.route("/v1/profile_signup", onboardingFrameV1);

app
	.frame("/v2/join/:hub", (c) => {
		const hub = config.hubs.find((h) => h.code === c.req.param().hub);
		if (!hub) {
			return c.res({
				image: (
					<ErrorImage
						title="Hub not found"
						subtitle={`Hub ${c.req.param().hub} not found`}
					/>
				),
			});
		}

		return c.res({
			image: `${config.baseUrl}/frame-slides/${hub.code}/intro.png`,
			intents: [
				<Button action={`/v2/profile_signup/apply/${hub.code}`} key="start">
					Lets go!
				</Button>,
			],
		});
	})
	.route("/v2/profile_signup", onboardingFrameV2);

devtools(app, { serveStatic });

export const GET = withAxiom(handle(app));
export const POST = withAxiom(handle(app));
