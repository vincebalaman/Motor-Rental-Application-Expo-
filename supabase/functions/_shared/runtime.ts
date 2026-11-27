// Pin the Edge Function SDK independently of the mobile dependency tree.
// deno-lint-ignore no-import-prefix
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
export function required(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_${name}`);
  return value;
}
export function adminClient() {
  return createClient(
    required("SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function providerConfig() {
  const key = required("PAYMONGO_SECRET_KEY");
  const live = Deno.env.get("PAYMENTS_LIVE_MODE") === "true";
  if (!key.startsWith(live ? "sk_live_" : "sk_test_")) {
    throw new Error("payment_key_mode_mismatch");
  }
  return { key, live };
}
export async function provider(path: string, method = "GET", body?: unknown) {
  const { key } = providerConfig();
  const response = await fetch(`https://api.paymongo.com${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${key}:`)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw Object.assign(new Error("provider_request_failed"), {
      status: response.status,
    });
  }
  return (await response.json()).data;
}
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
