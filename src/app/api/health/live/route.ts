import { handleLiveness } from "@/server/health/liveness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Response {
  return handleLiveness(request);
}
