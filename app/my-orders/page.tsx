"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrderStatusClass, getOrderStatusLabel } from "@/lib/orderStatus";
import { supabase } from "@/lib/supabase";
import type { Order, OrderItem } from "@/lib/types";
import "../profile/profile.css";

type OrderRow = Order & {
  total_price?: number | string | null;
  order_items?: OrderItem[];
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function formatPrice(value: number) {
  return pesoFormatter.format(value / 100);
}

function readOrderTotal(order: OrderRow) {
  const value = order.total_price ?? order.total ?? 0;
  const total = typeof value === "number" ? value : Number(value);
  return Number.isFinite(total) ? total : 0;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setError("");

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Failed to load auth session for My Orders:", sessionError);
          setError(sessionError.message);
          return;
        }

        if (!session?.user) {
          router.push("/login");
          return;
        }

        const { data, error: ordersError } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (ordersError) {
          console.error("Failed to fetch My Orders:", {
            message: ordersError.message,
            details: ordersError.details,
            hint: ordersError.hint,
            code: ordersError.code,
          });
          setError(ordersError.message);
          return;
        }

        setOrders((data ?? []) as OrderRow[]);
      } catch (loadError) {
        console.error("Unexpected error loading My Orders:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Unable to load orders.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrders();
  }, [router]);

  if (isLoading) {
    return (
      <main className="profile-page-main">
        <section className="profile-page-card profile-page-state">
          <p>Loading orders...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page-main">
      <section className="profile-page-card" aria-labelledby="my-orders-title">
        <div className="profile-page-hero">
          <div>
            <h1 id="my-orders-title">My Orders</h1>
            <p>Track your orders and ordered items.</p>
          </div>
        </div>

        {error ? <div className="profile-page-error">{error}</div> : null}

        <div className="profile-orders">
          {orders.length ? (
            orders.map((order) => (
              <article key={order.id} className="profile-order-card">
                <div className="profile-order-header">
                  <span className="profile-order-id">Order #{order.id.slice(0, 8)}</span>
                  <span className={`status-badge ${getOrderStatusClass(order.status)}`}>
                    {getOrderStatusLabel(order.status)}
                  </span>
                  <span className="profile-order-date">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString("en-PH") : "-"}
                  </span>
                </div>

                {order.order_items?.length ? (
                  <ul className="profile-order-items">
                    {order.order_items.map((item) => (
                      <li key={item.id}>
                        {item.product_name} x {item.quantity} - {formatPrice(item.price)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="profile-orders-empty" style={{ padding: "0.5rem 0", textAlign: "left" }}>
                    No items found for this order.
                  </p>
                )}

                <div className="profile-order-total">
                  <strong>Total Price: {formatPrice(readOrderTotal(order))}</strong>
                  <span>{order.payment_method?.replace(/_/g, " ") || "Payment pending"}</span>
                </div>
              </article>
            ))
          ) : (
            <p className="profile-orders-empty">No orders yet</p>
          )}
        </div>
      </section>
    </main>
  );
}
