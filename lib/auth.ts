import { Profile } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { clearSession, setSession } from "@/lib/storage";

const profileColumns = "id, full_name, phone, avatar, address, role, created_at";

type ProfileRow = {
  full_name: string | null;
  role: string | null;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function getFallbackFullName(email?: string | null) {
  if (!email) return "User";
  return email.split("@")[0]?.trim() || "User";
}

function isMissingAuthSessionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AuthSessionMissingError" ||
      error.message.includes("Auth session missing"))
  );
}

export async function syncSessionFromUser(userId: string, email?: string | null) {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error("syncSessionFromUser failed:", error);
  }

  setSession({
    fullName: data?.full_name?.trim() || getFallbackFullName(email),
    email: email?.trim() || "",
    role: data?.role ?? "user",
  });
}

export async function upsertProfile(payload: {
  id: string;
  fullName: string;
  phone?: string;
  address?: string;
  avatar?: string;
  role?: string;
}) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: payload.id,
      full_name: payload.fullName || "User",
      phone: payload.phone ?? "",
      address: payload.address ?? "",
      avatar: payload.avatar ?? "",
      role: payload.role ?? "user",
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("upsertProfile failed:", error.message, error.details, error.hint, error.code);
    throw new Error(error.message);
  }
}

export async function getProfile(): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message || "No authenticated user found.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .eq("id", user.id)
    .single<Profile>();

  if (error || !data) {
    throw new Error(error?.message || "User profile not found.");
  }

  return data;
}

export async function updateProfile(profile: {
  fullName: string;
  phone: string;
  address: string;
  avatarUrl: string;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message || "No active session found.");
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  const { error: updateError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: profile.fullName.trim() || "User",
      phone: profile.phone.trim(),
      address: profile.address.trim(),
      avatar: profile.avatarUrl.trim(),
      role: existing?.role ?? "user",
    },
    { onConflict: "id" },
  );

  if (updateError) {
    throw new Error(updateError.message);
  }

  await syncSessionFromUser(user.id, user.email);
}

export async function ensureBrowserSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    if (isMissingAuthSessionError(error)) {
      clearSession();
      return false;
    }
    console.error("Failed to read Supabase auth session:", error);
    return false;
  }

  if (!session?.user) {
    clearSession();
    return false;
  }

  await syncSessionFromUser(session.user.id, session.user.email);
  return true;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (isBrowser()) {
    localStorage.removeItem("prelove-pending-profile");
  }
  clearSession();
  if (error) throw error;
}
