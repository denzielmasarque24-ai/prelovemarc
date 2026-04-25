import { Profile } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { clearSession, setSession } from "@/lib/storage";

const PENDING_PROFILE_KEY = "rosette-pending-profile";

type ProfilePayload = {
  fullName?: string;
  email?: string;
  username?: string;
  phone?: string;
};

type ProfileRecord = {
  full_name: string | null;
  email: string | null;
};

type PendingProfile = ProfilePayload & {
  userId: string;
};

const profileColumns = "id, full_name, email, username, phone, avatar, address, role, created_at";

function isBrowser() {
  return typeof window !== "undefined";
}

function getFallbackFullName(email?: string | null) {
  if (!email) {
    return "User";
  }

  return email.split("@")[0]?.trim() || email.trim() || "User";
}

function isMissingAuthSessionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AuthSessionMissingError" || error.message.includes("Auth session missing"))
  );
}

export async function syncSessionFromUser(userId: string, email?: string | null) {
  let profile: ProfileRecord | null = null;

  const { data, error } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle<ProfileRecord>();

  if (error) {
    console.error("Failed to load profile during session sync:", error);
  } else {
    profile = data;
  }

  setSession({
    fullName: profile?.full_name?.trim() || getFallbackFullName(email),
    email: profile?.email?.trim() || email?.trim() || "",
  });
}

function writePendingProfile(profile: PendingProfile) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profile));
}

function readPendingProfile() {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_PROFILE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingProfile;
  } catch {
    return null;
  }
}

function clearPendingProfile() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(PENDING_PROFILE_KEY);
}

export function rememberPendingProfile(userId: string, profile: ProfilePayload) {
  writePendingProfile({
    userId,
    ...profile,
  });
}

export async function saveProfile(userId: string, profile: ProfilePayload) {
  const payload = {
    id: userId,
    full_name: profile.fullName?.trim() || "User",
    email: profile.email?.trim() || "",
    address: "",
    username: profile.username?.trim() || "",
    phone: profile.phone?.trim() || "",
    avatar: "",
    role: "user",
  };

  const { error } = await supabase.from("users").upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("Direct user save failed:", error);
    throw error;
  }

  clearPendingProfile();
}

export async function getProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Failed to read current Supabase user:", userError);
    throw new Error(userError.message || "No active session found.");
  }

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const { data, error } = await supabase
    .from("users")
    .select(profileColumns)
    .eq("id", user.id)
    .single<Profile>();

  if (error && error.code !== "PGRST116") {
    console.error("Failed to load profile from public.users:", error);
    throw new Error(error.message || "Failed to load profile.");
  }

  if (data) {
    return data;
  }

  const fallbackName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : getFallbackFullName(user.email);

  const defaultProfile = {
    id: user.id,
    full_name: fallbackName || "User",
    email: user.email ?? "",
    address: "",
    username:
      typeof user.user_metadata?.username === "string" ? user.user_metadata.username : "",
    phone: typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : "",
    avatar: "",
    role: "user",
  };

  const { data: createdProfile, error: createError } = await supabase
    .from("users")
    .upsert(defaultProfile, { onConflict: "id" })
    .select(profileColumns)
    .single<Profile>();

  if (createError || !createdProfile) {
    console.error("Failed to auto-create profile in public.users:", createError);
    throw new Error(createError?.message || "Failed to create profile.");
  }

  return createdProfile;
}

export async function updateProfile(profile: {
  fullName: string;
  username: string;
  phone: string;
  address: string;
  avatarUrl: string;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Failed to read current Supabase user:", userError);
    throw new Error(userError.message || "No active session found.");
  }

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const updatePayload = {
    id: user.id,
    email: user.email ?? "",
    full_name: profile.fullName.trim() || "User",
    username: profile.username.trim(),
    phone: profile.phone.trim(),
    address: profile.address.trim(),
    avatar: profile.avatarUrl.trim(),
    role: "user",
  };

  const { error: updateError } = await supabase
    .from("users")
    .upsert(updatePayload, { onConflict: "id" });

  if (updateError) {
    console.error("Failed to upsert profile in public.users:", updateError);
    throw new Error(updateError.message || "Failed to save profile.");
  }

  await syncSessionFromUser(user.id, user.email);
}

export async function flushPendingProfile(userId: string) {
  const pendingProfile = readPendingProfile();

  if (!pendingProfile || pendingProfile.userId !== userId) {
    return;
  }

  try {
    await saveProfile(userId, pendingProfile);
  } catch (error) {
    console.error("Failed to flush pending profile:", error);
  }
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
  await flushPendingProfile(session.user.id);
  return true;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  clearSession();
  clearPendingProfile();

  if (error) {
    throw error;
  }
}
