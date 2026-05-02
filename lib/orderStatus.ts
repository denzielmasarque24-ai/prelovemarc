import type { OrderStatus } from "@/lib/types";

export const orderStatuses: OrderStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function normalizeOrderStatus(value: string): OrderStatus {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

  switch (normalized) {
    case "pending":
      return "pending";
    case "in_progress":
    case "confirmed":
    case "preparing":
    case "out_for_delivery":
      return "in_progress";
    case "completed":
    case "paid":
    case "delivered":
      return "completed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
}

export function getOrderStatusLabel(status: string) {
  return orderStatusLabels[normalizeOrderStatus(status)];
}

export function getOrderStatusClass(status: string) {
  return `status-${normalizeOrderStatus(status)}`;
}
