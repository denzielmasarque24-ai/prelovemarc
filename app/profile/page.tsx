"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, signOutUser } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/lib/types";
import "./profile.css";

type InfoItem = {
  icon: "user" | "mail" | "home" | "phone";
  label: string;
  value: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Failed to load current user for profile page:", userError);
          throw new Error(userError.message);
        }

        if (!user) {
          router.push("/login");
          return;
        }

        setProfile(await getProfile());
      } catch (profileError) {
        console.error("Failed to load profile page:", profileError);
        setError(
          profileError instanceof Error
            ? profileError.message
            : "Unable to load your profile.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [router]);

  const displayName = profile?.full_name?.trim() || "User";
  const displayEmail = profile?.email?.trim() || "No email available";
  const avatarUrl = profile?.avatar?.trim();

  const infoItems: InfoItem[] = useMemo(
    () => [
      {
        icon: "user",
        label: "Full Name",
        value: profile?.full_name?.trim() || "User",
      },
      {
        icon: "mail",
        label: "Email",
        value: profile?.email?.trim() || "No email available",
      },
      {
        icon: "home",
        label: "Address",
        value: profile?.address?.trim() || "No address added",
      },
      {
        icon: "phone",
        label: "Contact Number",
        value: profile?.phone?.trim() || "No contact number added",
      },
    ],
    [profile],
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await signOutUser();
      router.push("/");
    } catch (logoutError) {
      console.error("Failed to logout from profile page:", logoutError);
      setError(logoutError instanceof Error ? logoutError.message : "Unable to logout.");
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <main className="profile-page-main">
        <section className="profile-page-card profile-page-state">
          <p>Loading profile...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page-main">
      <section className="profile-page-card" aria-labelledby="profile-page-title">
        <div className="profile-page-hero">
          {avatarUrl ? (
            <div
              className="profile-page-avatar"
              aria-label={`${displayName} profile photo`}
              style={{ backgroundImage: `url(${avatarUrl})` }}
            />
          ) : (
            <div className="profile-page-avatar initials" aria-hidden="true">
              {getInitials(displayName)}
            </div>
          )}

          <div>
            <h1 id="profile-page-title">{displayName}</h1>
            <p>{displayEmail}</p>
          </div>
        </div>

        {error ? <div className="profile-page-error">{error}</div> : null}

        <div className="profile-info-list">
          {infoItems.map((item) => (
            <article className="profile-info-card" key={item.label}>
              <span className={`profile-info-icon ${item.icon}`} aria-hidden="true" />
              <div>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </div>
            </article>
          ))}
        </div>

        <div className="profile-page-actions">
          <button type="button" className="profile-back-button" onClick={() => router.push("/")}>
            <span aria-hidden="true">←</span>
            Back to Shop
          </button>
          <button
            type="button"
            className="profile-logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </section>
    </main>
  );
}
