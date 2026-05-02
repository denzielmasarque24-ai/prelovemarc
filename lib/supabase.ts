import { createClient, type PostgrestError } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

function readJwtPayload(token?: string) {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );
    const decodedPayload =
      typeof atob === "function"
        ? atob(paddedPayload)
        : typeof Buffer !== "undefined"
          ? Buffer.from(paddedPayload, "base64").toString("utf8")
          : null;

    if (!decodedPayload) return null;

    return JSON.parse(decodedPayload) as {
      role?: string;
      ref?: string;
    };
  } catch {
    return null;
  }
}

function getSupabaseConfigError() {
  if (!supabaseUrl) return "NEXT_PUBLIC_SUPABASE_URL is missing.";
  if (!supabaseAnonKey) return "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.";

  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:") {
      return "NEXT_PUBLIC_SUPABASE_URL must start with https://.";
    }
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL.";
  }

  const payload = readJwtPayload(supabaseAnonKey);
  if (payload?.role === "service_role") {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is using a service_role key. Use the anon public key in frontend code.";
  }

  return null;
}

const supabaseConfigError = getSupabaseConfigError();

if (supabaseConfigError) {
  console.error(`Supabase configuration error: ${supabaseConfigError}`);
}

export const isSupabaseConfigured = !supabaseConfigError;

export function logSupabaseError(context: string, error: unknown) {
  if (!error) return;

  const postgrestError = error as Partial<PostgrestError>;
  console.error(`Supabase error in ${context}:`, {
    message:
      postgrestError.message ||
      (error instanceof Error ? error.message : "Unknown Supabase error"),
    details: postgrestError.details,
    hint: postgrestError.hint,
    code: postgrestError.code,
  });
}

export const supabase = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
