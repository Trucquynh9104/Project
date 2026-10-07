import { store } from "./dataStore";
const read = () =>
  JSON.parse(store.getItem("blossom-brew-notifications") || "[]");
export function initializeNotifications() {}
export function getNotificationsForUser(user) {
  if (!user) return [];
  return read()
    .filter(
      (v) =>
        v.recipientRole === user.role &&
        (!v.recipientUserId || v.recipientUserId === user.id),
    )
    .map((v) => ({ ...v, read: v.readBy?.includes(user.id) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function markNotificationRead(user, id) {
  store.setItem(
    "blossom-brew-notifications",
    JSON.stringify(
      read().map((v) =>
        v.id === id
          ? { ...v, readBy: [...new Set([...(v.readBy || []), user.id])] }
          : v,
      ),
    ),
  );
  window.dispatchEvent(new Event("blossom-notifications-updated"));
}
export function markAllNotificationsRead(user) {
  for (const v of getNotificationsForUser(user))
    markNotificationRead(user, v.id);
  return getNotificationsForUser(user);
}
export function subscribeNotifications(callback) {
  window.addEventListener("blossom-notifications-updated", callback);
  return () =>
    window.removeEventListener("blossom-notifications-updated", callback);
}
export function getNotificationTime(n) {
  return new Date(n.createdAt).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function getNotificationDate(n) {
  return new Date(n.createdAt).toLocaleDateString("vi-VN");
}
export function getNotificationLabel(n) {
  return getNotificationDate(n) + " · " + getNotificationTime(n);
}
export function notifyOrderCreated() {}
export function notifyOrderStatusChanged() {}
export function notifyPointsAwarded() {}
export function notifyMemberPointsAdjusted() {}
export function notifyVoucherChanged() {}
export function notifyVoucherUsed() {}
export function notifyPointsRedeemed() {}
export function notifyShiftCloseRequested() {}
