import { action, store } from "./dataStore";
import {
  ORDER_TRANSITIONS,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
} from "../../shared/businessRules";
export { PAYMENT_LABELS, PAYMENT_METHODS };
const next = ORDER_TRANSITIONS;
export function getNextOrderStatuses(status, paymentStatus = "paid") {
  return (next[status] || []).filter(
    (s) => paymentStatus === "paid" || s === "Đã hủy",
  );
}
export async function saveOrderStatus(form) {
  const r = await action({ type: "order-status", ...form });
  return { ...r, orders: JSON.parse(store.getItem("blossom-orders") || "[]") };
}
export function createCustomerOrder(form) {
  return action({
    type: "create-order",
    items: form.cart,
    orderType: "pickup",
    paymentMethod: form.paymentMethod,
  });
}
