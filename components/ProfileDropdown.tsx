"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import EditProfileModal from "@/components/EditProfileModal";
import { getProfile } from "@/lib/auth";
import { requestAuthModal } from "@/lib/authModal";
import { clearSession } from "@/lib/storage";
import { logSupabaseError, supabase } from "@/lib/supabase";
import type { Profile, SessionUser } from "@/lib/types";

type ProfileDropdownProps = {
  user: SessionUser;
  onLogout: () => Promise<void>;
  onProfileSaved: () => void;
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

const defaultAvatar = "/default-avatar.png";

function getSafeAvatarUrl(value?: string | null) {
  const avatar = value?.trim();
  if (!avatar || avatar.includes("via.placeholder.com")) return defaultAvatar;
  return avatar;
}

export default function ProfileDropdown({
  user,
  onLogout,
  onProfileSaved,
}: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const displayName = profile?.full_name?.trim() || user.fullName;
  const displayEmail = user.email;
  const avatarUrl = getSafeAvatarUrl(profile?.avatar);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          if (error) {
            logSupabaseError("ProfileDropdown auth session", error);
          }
          clearSession();
          setHasActiveSession(false);
          setProfile(null);
          return;
        }

        setHasActiveSession(true);
        const loadedProfile = await getProfile();
        setProfile(loadedProfile);
      } catch (error) {
        console.error("Failed to load navbar profile:", error);
      }
    };

    void loadProfile();
  }, [user.email]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleProfileSaved = () => {
    onProfileSaved();
    void supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error || !session?.user) {
          if (error) {
            logSupabaseError("ProfileDropdown refresh auth session", error);
          }
          clearSession();
          setHasActiveSession(false);
          setProfile(null);
          return null;
        }

        setHasActiveSession(true);
        return getProfile().then((loadedProfile) => {
          setProfile(loadedProfile);
        });
      })
      .catch((error) => {
        console.error("Failed to refresh navbar profile:", error);
      });
  };

  if (!hasActiveSession) {
    return (
      <>
        <button
          type="button"
          className="auth-link auth-link-outline"
          onClick={() => requestAuthModal("login")}
        >
          Log In
        </button>
        <button
          type="button"
          className="auth-link auth-link-filled"
          onClick={() => requestAuthModal("register")}
        >
          Register
        </button>
      </>
    );
  }

  return (
    <div className="profile-menu" ref={dropdownRef}>
      <button
        type="button"
        className="profile-avatar-button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
      >
        <img
          src={avatarUrl}
          alt={displayName || getInitials(displayEmail)}
          onError={(event) => {
            event.currentTarget.src = defaultAvatar;
          }}
        />
      </button>

      {isOpen ? (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-header">
            <p className="profile-menu-label">Signed in</p>
            <strong>{displayName}</strong>
            <span>{displayEmail}</span>
          </div>

          <button
            type="button"
            className="profile-menu-action"
            onClick={() => {
              setIsOpen(false);
              setIsEditing(true);
            }}
          >
            Edit Profile
          </button>

          <Link
            href="/profile"
            className="profile-menu-action profile-menu-link"
            onClick={() => setIsOpen(false)}
          >
            View Profile
          </Link>

          <button
            type="button"
            className="profile-menu-action danger"
            onClick={() => {
              setIsOpen(false);
              void onLogout();
            }}
          >
            Log Out
          </button>
        </div>
      ) : null}

      {isEditing ? (
        <EditProfileModal
          onClose={() => setIsEditing(false)}
          onSaved={handleProfileSaved}
        />
      ) : null}
    </div>
  );
}
