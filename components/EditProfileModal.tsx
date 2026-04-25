"use client";

import { FormEvent, useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/auth";
import type { Profile } from "@/lib/types";

type EditProfileModalProps = {
  onClose: () => void;
  onSaved: () => void;
};

export default function EditProfileModal({ onClose, onSaved }: EditProfileModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    phone: "",
    avatarUrl: "",
  });

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile: Profile = await getProfile();

        setFormData({
          name: profile.name ?? "",
          username: profile.username ?? "",
          phone: profile.phone ?? "",
          avatarUrl: profile.avatar ?? "",
        });
      } catch (profileError) {
        console.error("Failed to load profile:", profileError);
        setError("We could not load your profile right now.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Full name is required.");
      return;
    }

    setIsSaving(true);

    try {
      await updateProfile(formData);
      setSuccess("Profile updated.");
      onSaved();
      window.setTimeout(onClose, 600);
    } catch (profileError) {
      console.error("Failed to update profile:", profileError);
      setError("We could not save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="profile-modal-close"
          onClick={onClose}
          aria-label="Close edit profile"
        >
          X
        </button>

        <div className="profile-modal-header">
          <p className="profile-menu-label">Profile</p>
          <h2 id="profile-modal-title">Edit Profile</h2>
        </div>

        {isLoading ? (
          <p className="profile-modal-loading">Loading profile...</p>
        ) : (
          <form className="profile-edit-form" onSubmit={handleSubmit}>
            <div className="profile-field">
              <label htmlFor="profile-name">Full Name</label>
              <input
                id="profile-name"
                type="text"
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="profile-field">
              <label htmlFor="profile-username">Username</label>
              <input
                id="profile-username"
                type="text"
                value={formData.username}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, username: event.target.value }))
                }
              />
            </div>

            <div className="profile-field">
              <label htmlFor="profile-phone">Phone Number</label>
              <input
                id="profile-phone"
                type="tel"
                value={formData.phone}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>

            <div className="profile-field">
              <label htmlFor="profile-avatar">Profile Picture URL</label>
              <input
                id="profile-avatar"
                type="url"
                value={formData.avatarUrl}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, avatarUrl: event.target.value }))
                }
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            {error ? <div className="message-banner error">{error}</div> : null}
            {success ? <div className="message-banner success">{success}</div> : null}

            <button type="submit" className="profile-save-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
