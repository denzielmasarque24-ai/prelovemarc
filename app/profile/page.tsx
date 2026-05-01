"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, signOutUser, updateProfile } from "@/lib/auth";
import { getUserOrders } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import type { Order, Profile } from "@/lib/types";
import "./profile.css";

const pesoFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const formatPrice = (value: number) => pesoFormatter.format(value / 100);

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"info" | "orders" | "edit">("info");
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", address: "", avatarUrl: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/login");
          return;
        }

        const [profileData, ordersData] = await Promise.all([
          getProfile(),
          getUserOrders(user.id).catch(() => [] as Order[]),
        ]);

        setProfile(profileData);
        setOrders(ordersData);
        setEditForm({
          fullName: profileData.full_name ?? "",
          phone: profileData.phone ?? "",
          address: profileData.address ?? "",
          avatarUrl: profileData.avatar ?? "",
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [router]);

  const displayName = profile?.full_name?.trim() || "User";
  const avatarUrl = profile?.avatar?.trim();

  const infoItems = useMemo(
    () => [
      { label: "Full Name", value: profile?.full_name?.trim() || "-" },
      { label: "Phone", value: profile?.phone?.trim() || "-" },
      { label: "Address", value: profile?.address?.trim() || "-" },
    ],
    [profile],
  );

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg("");

    try {
      await updateProfile(editForm);
      const updated = await getProfile();
      setProfile(updated);
      setSaveMsg("Profile updated successfully!");
      setTab("info");
    } catch (saveError) {
      setSaveMsg(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await signOutUser();
      router.push("/");
    } catch (logoutError) {
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
            <div className="profile-page-avatar" style={{ backgroundImage: `url(${avatarUrl})` }} />
          ) : (
            <div className="profile-page-avatar initials">{getInitials(displayName)}</div>
          )}
          <div>
            <h1 id="profile-page-title">{displayName}</h1>
          </div>
        </div>

        {error && <div className="profile-page-error">{error}</div>}

        <div className="profile-tabs">
          {(["info", "orders", "edit"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`profile-tab-btn${tab === item ? " active" : ""}`}
              onClick={() => setTab(item)}
            >
              {item === "info" ? "My Info" : item === "orders" ? `Orders (${orders.length})` : "Edit Profile"}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="profile-info-list">
            {infoItems.map((item) => (
              <article className="profile-info-card" key={item.label}>
                <div>
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === "orders" && (
          <div className="profile-orders">
            {orders.length ? (
              orders.map((order) => (
                <div key={order.id} className="profile-order-card">
                  <div className="profile-order-header">
                    <span className="profile-order-id">#{order.id.slice(0, 8)}</span>
                    <span className={`status-badge status-${order.status}`}>{order.status.replace(/_/g, " ")}</span>
                    <span className="profile-order-date">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString("en-PH") : ""}
                    </span>
                  </div>
                  {order.order_items?.length ? (
                    <ul className="profile-order-items">
                      {order.order_items.map((item) => (
                        <li key={item.id}>
                          {item.product_name} x {item.quantity} - {formatPrice(item.price * item.quantity)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="profile-order-total">
                    <strong>Total: {formatPrice(order.total)}</strong>
                    <span style={{ textTransform: "capitalize" }}>{order.payment_method.replace(/_/g, " ")}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="profile-orders-empty">
                No orders yet. <a href="/shop">Start shopping!</a>
              </p>
            )}
          </div>
        )}

        {tab === "edit" && (
          <div className="profile-edit-form">
            {saveMsg && <div className="profile-save-msg">{saveMsg}</div>}
            {[
              { label: "Full Name", key: "fullName" as const },
              { label: "Phone", key: "phone" as const },
              { label: "Address", key: "address" as const },
              { label: "Avatar URL", key: "avatarUrl" as const },
            ].map(({ label, key }) => (
              <div className="profile-field" key={key}>
                <label>{label}</label>
                <input value={editForm[key]} onChange={(event) => setEditForm({ ...editForm, [key]: event.target.value })} />
              </div>
            ))}
            <button type="button" className="profile-save-button" onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        <div className="profile-page-actions">
          <button type="button" className="profile-back-button" onClick={() => router.push("/")}>
            Back to Shop
          </button>
          <button type="button" className="profile-logout-button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </section>
    </main>
  );
}
