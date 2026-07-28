import { getAuth } from "@/server/auth/auth";

async function handleAuthRequest(request: Request): Promise<Response> {
  const auth = await getAuth();
  return auth.handler(request);
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
