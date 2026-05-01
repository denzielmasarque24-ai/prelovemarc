"use client";

import { useEffect, useState } from "react";
import { adminGetAllUsers } from "@/lib/admin";
import type { Profile } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    adminGetAllUsers()
      .then(setUsers)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Failed to load"));
  }, []);

  const normalizedSearch = search.toLowerCase();
  const filtered = users.filter(
    (user) =>
      (user.full_name ?? "").toLowerCase().includes(normalizedSearch) ||
      (user.phone ?? "").toLowerCase().includes(normalizedSearch),
  );

  return (
    <>
      <h1 className="admin-page-title">Customers</h1>
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Role</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name ?? "-"}</td>
                    <td>{user.phone ?? "-"}</td>
                    <td>{user.address ?? "-"}</td>
                    <td>
                      <span className={`status-badge ${user.role === "admin" ? "status-confirmed" : "status-pending"}`}>
                        {user.role ?? "user"}
                      </span>
                    </td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleDateString("en-PH") : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="admin-empty">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
