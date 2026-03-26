import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const keyPrefix = hasKey
    ? process.env.ANTHROPIC_API_KEY.slice(0, 10) + "..."
    : "NOT SET";

  return NextResponse.json({
    status: "ok",
    apiKeyConfigured: hasKey,
    keyPrefix,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
}
