import { Logger } from "next-axiom";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const logger = new Logger({ source: "nextjs-frames:middleware" });
  logger.middleware(request);

  event.waitUntil(logger.flush());
  return NextResponse.next();
}

export const config = {};
