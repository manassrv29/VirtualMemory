import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Memory Management Algorithm API",
    version: "1.0.0",
    endpoints: {
      simulate: "/api/simulate",
      health: "/api/health",
    },
  })
}
