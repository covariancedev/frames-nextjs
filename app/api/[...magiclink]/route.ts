import { NextResponse } from "next/server";

const APP_URL = `https://app.covariance.network`;

/**
 * Redirects to the app if the magic link is invalid
 * Otherwise, it redirects to the path after authentication
 * @example: /magiclink/ijijijin/google -> https://app.covariance.network/magic-authentication?magic-token=ijijijin&next-page=/google
 *
 * @param req Request
 * @param params {params: {magiclink: string[]}}
 * @returns NextResponse
 */
export async function GET(
  req: Request,
  { params }: { params: { magiclink: string[] } }
) {
  const url = new URL(req.url);

  if (params.magiclink.length !== 3) {
    return NextResponse.redirect(APP_URL);
  }

  const [, token, path] = params.magiclink;

  const link = `${APP_URL}/magic-authentication?magic-token=${token}&next-page=/${path}`;

  return NextResponse.redirect(link);
}
