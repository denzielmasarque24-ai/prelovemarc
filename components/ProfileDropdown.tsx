"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import EditProfileModal from "@/components/EditProfileModal";
import { getProfile } from "@/lib/auth";
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

export default function ProfileDropdown({
  user,
  onLogout,
  onProfileSaved,
}: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const displayName = profile?.full_name?.trim() || user.fullName;
  const displayEmail = profile?.email?.trim() || user.email;
  const avatarUrl = profile?.avatar?.trim();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfile(await getProfile());
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
    void getProfile().then(setProfile).catch((error) => {
      console.error("Failed to refresh navbar profile:", error);
    });
  };

  return (
    <div className="profile-menu" ref={dropdownRef}>
      <button
        type="button"
        className="profile-avatar-button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} />
        ) : (
          <span>{getInitials(displayName || displayEmail)}</span>
        )}
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
