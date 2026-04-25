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
  name: string | null;
  email: string | null;
};

type PendingProfile = ProfilePayload & {
  userId: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function getFallbackFullName(email?: string | null) {
  if (!email) {
    return "Member";
  }

  return email.split("@")[0]?.trim() || email.trim() || "Member";
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
    .select("name, email")
    .eq("id", userId)
    .maybeSingle<ProfileRecord>();

  if (error) {
    console.error("Failed to load profile during session sync:", error);
  } else {
    profile = data;
  }

  setSession({
    fullName: profile?.name?.trim() || getFallbackFullName(email),
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

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
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
    name: profile.fullName?.trim() || null,
    email: profile.email?.trim() || null,
  };

  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session?.user.id !== userId) {
    throw new Error(
      "Your account was created, but your user record could not be saved yet. Confirm your email and try again.",
    );
  }

  const { error } = await supabase.from("users").upsert(payload);

  if (error) {
    console.error("Direct user save failed:", error);
    throw error;
  }

  clearPendingProfile();
}

export async function getProfile() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("No active session found.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken);

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, username, phone, avatar, role, created_at")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (error) {
    throw new Error(error.message || "Failed to load profile.");
  }

  if (data) {
    return data;
  }

  const fallbackName =
    typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
      ? user.user_metadata.name.trim()
      : getFallbackFullName(user.email);

  const defaultProfile = {
    id: user.id,
    name: fallbackName,
    email: user.email ?? "",
    username:
      typeof user.user_metadata?.username === "string" ? user.user_metadata.username : null,
    phone: typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null,
    avatar: null,
    role: "user",
  };

  const { data: createdProfile, error: createError } = await supabase
    .from("users")
    .upsert(defaultProfile, { onConflict: "id" })
    .select("id, name, email, username, phone, avatar, role, created_at")
    .single<Profile>();

  if (createError || !createdProfile) {
    throw new Error(createError?.message || "Failed to create profile.");
  }

  return createdProfile;
}

export async function updateProfile(profile: {
  name: string;
  username: string;
  phone: string;
  avatarUrl: string;
}) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("No active session found.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken);

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const payload = {
    name: profile.name.trim(),
    username: profile.username.trim() || null,
    phone: profile.phone.trim() || null,
    avatar: profile.avatarUrl.trim() || null,
  };

  const { error } = await supabase.from("users").update(payload).eq("id", user.id);

  if (error) {
    throw error;
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
