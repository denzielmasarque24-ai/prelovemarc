import { Profile } from "@/lib/types";
import { isSupabaseConfigured, logSupabaseError, supabase } from "@/lib/supabase";
import { clearSession, setSession } from "@/lib/storage";

const baseProfileColumns = "id, full_name, phone, avatar, address, role, created_at";
const profileColumns = `${baseProfileColumns}, barangay, city, province, zip_code`;

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

function getProfileAddressSchemaErrorMessage() {
  return "Your profiles table is missing one or more address columns. Run data/fix-profile-address-fields.sql in Supabase, then refresh the app.";
}

function isMissingProfileAddressColumnError(error: { message?: string; code?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  const mentionsAddressColumn = ["barangay", "city", "province", "zip_code"].some((column) =>
    message.includes(column),
  );

  return (
    mentionsAddressColumn &&
    (error.code === "42703" ||
      error.code === "PGRST204" ||
      message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find"))
  );
}

export async function syncSessionFromUser(userId: string, email?: string | null) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

    if (error) {
      logSupabaseError("syncSessionFromUser profiles select", error);
    }

    setSession({
      fullName: data?.full_name?.trim() || getFallbackFullName(email),
      email: email?.trim() || "",
      role: data?.role ?? "user",
    });
  } catch (error) {
    console.error("Unexpected error in syncSessionFromUser:", error);
    setSession({
      fullName: getFallbackFullName(email),
      email: email?.trim() || "",
      role: "user",
    });
  }
}

export async function upsertProfile(payload: {
  id: string;
  fullName: string;
  phone?: string;
  address?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  avatar?: string;
  role?: string;
}) {
  try {
    const profilePayload = {
      id: payload.id,
      full_name: payload.fullName || "User",
      phone: payload.phone ?? "",
      address: payload.address ?? "",
      barangay: payload.barangay ?? "",
      city: payload.city ?? "",
      province: payload.province ?? "",
      zip_code: payload.zipCode ?? "",
      avatar: payload.avatar ?? "",
      role: payload.role ?? "user",
    };

    const { error } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

    if (error) {
      logSupabaseError("upsertProfile profiles upsert", error);
      if (isMissingProfileAddressColumnError(error)) {
        throw new Error(getProfileAddressSchemaErrorMessage());
      }

      throw new Error(error.message);
    }
  } catch (error) {
    console.error("Unexpected error in upsertProfile:", error);
    throw error;
  }
}

export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      if (!isMissingAuthSessionError(sessionError)) {
        logSupabaseError("getProfile auth session", sessionError);
      }

      return null;
    }

    if (!session?.user) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(profileColumns)
      .eq("id", session.user.id)
      .maybeSingle<Profile>();

    if (error) {
      logSupabaseError("getProfile profiles select", error);
      if (isMissingProfileAddressColumnError(error)) {
        throw new Error(getProfileAddressSchemaErrorMessage());
      }

      return null;
    }

    return data ?? null;
  } catch (error) {
    console.error("Unexpected error in getProfile:", error);

    return null;
  }
}

export async function updateProfile(profile: {
  fullName: string;
  phone: string;
  address: string;
  barangay?: string;
  city?: string;
  province?: string;
  zipCode?: string;
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

  const profilePayload = {
    id: user.id,
    full_name: profile.fullName.trim() || "User",
    phone: profile.phone.trim(),
    address: profile.address.trim(),
    barangay: profile.barangay?.trim() ?? "",
    city: profile.city?.trim() ?? "",
    province: profile.province?.trim() ?? "",
    zip_code: profile.zipCode?.trim() ?? "",
    avatar: profile.avatarUrl.trim(),
    role: existing?.role ?? "user",
  };

  const { error: updateError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

  if (updateError) {
    logSupabaseError("updateProfile profiles upsert", updateError);
    if (isMissingProfileAddressColumnError(updateError)) {
      throw new Error(getProfileAddressSchemaErrorMessage());
    }

    throw new Error(updateError.message);
  }

  await syncSessionFromUser(user.id, user.email);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("profile-updated"));
  }
}

export async function ensureBrowserSession() {
  if (!isSupabaseConfigured) {
    clearSession();
    return false;
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      if (isMissingAuthSessionError(error)) {
        clearSession();
        return false;
      }
      logSupabaseError("ensureBrowserSession auth session", error);
      return false;
    }

    if (!session?.user) {
      clearSession();
      return false;
    }

    await syncSessionFromUser(session.user.id, session.user.email);
    return true;
  } catch (error) {
    console.error("Unexpected error in ensureBrowserSession:", error);
    clearSession();
    return false;
  }
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (isBrowser()) {
    localStorage.removeItem("prelove-pending-profile");
  }
  clearSession();
  if (error) throw error;
}
