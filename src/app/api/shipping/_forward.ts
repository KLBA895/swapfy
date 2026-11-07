function authHeader(request: Request) {
  return request.headers.get("authorization") || "";
}

export function requireUserToken(request: Request) {
  const auth = authHeader(request);
  if (!/^Bearer\s+\S+/i.test(auth)) return "";
  return auth;
}

export async function forwardRpc(auth: string, name: string, body: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) {
    return { status: 500, data: { message: "Supabase-URL fehlt." } };
  }
  const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      Authorization: auth,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  return { status: res.status, data };
}
