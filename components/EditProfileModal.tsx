"use client";

import { FormEvent, useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/auth";

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
    fullName: "",
    phone: "",
    address: "",
    barangay: "",
    city: "",
    province: "",
    zipCode: "",
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
        const profile = await getProfile();

        if (!profile) {
          setError("Please log in to edit your profile.");
          return;
        }

        setFormData({
          fullName: profile.full_name ?? "User",
          phone: profile.phone ?? "",
          address: profile.address ?? "",
          barangay: profile.barangay ?? "",
          city: profile.city ?? "",
          province: profile.province ?? "",
          zipCode: profile.zip_code ?? "",
          avatarUrl: profile.avatar ?? "",
        });
      } catch (profileError) {
        console.error("Failed to load profile:", profileError);
        setError(
          profileError instanceof Error
            ? profileError.message
            : "Failed to load profile.",
        );
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

    if (!formData.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!formData.address.trim() || !formData.barangay.trim() || !formData.city.trim() || !formData.province.trim()) {
      setError("Street address, barangay, city, and province are required.");
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
      setError(
        profileError instanceof Error
          ? profileError.message
          : "We could not save your profile. Please try again.",
      );
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
                value={formData.fullName}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, fullName: event.target.value }))
                }
                required
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

            {[
              { id: "profile-address", label: "Street Address", key: "address" as const, autoComplete: "street-address", required: true },
              { id: "profile-barangay", label: "Barangay", key: "barangay" as const, required: true },
              { id: "profile-city", label: "City", key: "city" as const, autoComplete: "address-level2", required: true },
              { id: "profile-province", label: "Province", key: "province" as const, autoComplete: "address-level1", required: true },
              { id: "profile-zip", label: "Zip Code", key: "zipCode" as const, autoComplete: "postal-code" },
            ].map((field) => (
              <div className="profile-field" key={field.key}>
                <label htmlFor={field.id}>{field.label}</label>
                <input
                  id={field.id}
                  type="text"
                  value={formData[field.key]}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  autoComplete={field.autoComplete}
                  required={field.required}
                />
              </div>
            ))}

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
