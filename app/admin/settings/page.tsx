"use client";

import { FormEvent, useEffect, useState } from "react";

const SETTINGS_KEY = "prelove-admin-settings";

type SettingsForm = {
  gcashNumber: string;
  bankName: string;
  bankAccountNumber: string;
  accountName: string;
  storeName: string;
  supportContact: string;
};

const defaultSettings: SettingsForm = {
  gcashNumber: "09XX XXX XXXX",
  bankName: "BDO / BPI",
  bankAccountNumber: "XXXX XXXX XXXX",
  accountName: "PRELOVE SHOP",
  storeName: "PRELOVE SHOP",
  supportContact: "prelove.shop@gmail.com",
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(SETTINGS_KEY);
    if (!saved) return;

    try {
      setForm({ ...defaultSettings, ...JSON.parse(saved) });
    } catch {
      window.localStorage.removeItem(SETTINGS_KEY);
    }
  }, []);

  const updateField = (field: keyof SettingsForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess("");
    setError("");
  };

  const handleSave = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setIsSaving(true);
    setSuccess("");
    setError("");

    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(form));
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      setSuccess("Settings updated successfully");
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-settings-shell">
      <div className="admin-settings-header">
        <div>
          <p className="admin-settings-eyebrow">Configuration</p>
          <h1 className="admin-page-title">Settings</h1>
          <p className="admin-settings-subtitle">
            Manage payment details and storefront information for checkout and customer support.
          </p>
        </div>
        <button type="button" className="admin-settings-save-top" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {success && <div className="admin-settings-alert success">{success}</div>}
      {error && <div className="admin-settings-alert error">{error}</div>}

      <form className="admin-settings-form" onSubmit={handleSave}>
        <section className="admin-settings-card">
          <div className="admin-settings-section-head">
            <div>
              <h2>Payment Methods</h2>
              <p>These details are shown to shoppers when they choose manual payment options.</p>
            </div>
          </div>

          <div className="admin-settings-grid">
            <label className="admin-settings-field">
              <span>GCash Number</span>
              <div className="admin-settings-input-wrap">
                <span aria-hidden="true">#</span>
                <input value={form.gcashNumber} onChange={(event) => updateField("gcashNumber", event.target.value)} />
              </div>
            </label>

            <label className="admin-settings-field">
              <span>Bank Name</span>
              <div className="admin-settings-input-wrap">
                <span aria-hidden="true">$</span>
                <input value={form.bankName} onChange={(event) => updateField("bankName", event.target.value)} />
              </div>
            </label>

            <label className="admin-settings-field">
              <span>Bank Account Number</span>
              <div className="admin-settings-input-wrap">
                <span aria-hidden="true">••</span>
                <input
                  value={form.bankAccountNumber}
                  onChange={(event) => updateField("bankAccountNumber", event.target.value)}
                />
              </div>
            </label>

            <label className="admin-settings-field">
              <span>Account Name</span>
              <div className="admin-settings-input-wrap">
                <span aria-hidden="true">@</span>
                <input value={form.accountName} onChange={(event) => updateField("accountName", event.target.value)} />
              </div>
            </label>
          </div>
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-section-head">
            <div>
              <h2>Store Info</h2>
              <p>Keep customer-facing store identity and support details ready for future screens.</p>
            </div>
          </div>

          <div className="admin-settings-grid">
            <label className="admin-settings-field">
              <span>Store Name</span>
              <div className="admin-settings-input-wrap">
                <span aria-hidden="true">*</span>
                <input value={form.storeName} onChange={(event) => updateField("storeName", event.target.value)} />
              </div>
            </label>

            <label className="admin-settings-field">
              <span>Support Contact</span>
              <div className="admin-settings-input-wrap">
                <span aria-hidden="true">@</span>
                <input
                  type="email"
                  value={form.supportContact}
                  onChange={(event) => updateField("supportContact", event.target.value)}
                />
              </div>
            </label>
          </div>
        </section>

        <div className="admin-settings-actions">
          <button type="submit" className="admin-settings-save" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
