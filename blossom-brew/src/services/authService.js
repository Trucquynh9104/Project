import { useSyncExternalStore } from "react";
import {
  store,
  action,
  authenticate,
  getUser,
  subscribeUser,
} from "./dataStore";
import { SILVER_MIN_POINTS, GOLD_MIN_POINTS } from "../../shared/businessRules";
export { SILVER_MIN_POINTS, GOLD_MIN_POINTS };
export function getMembershipTier(points) {
  return Number(points) >= 101
    ? "Gold"
    : Number(points) >= 50
      ? "Silver"
      : "Member";
}
export function getMembershipLabel(points) {
  return `${getMembershipTier(points)} member`;
}
const users = () => JSON.parse(store.getItem("blossom-brew-users") || "[]");
export function getCurrentUser() {
  return getUser();
}
export function useCurrentUser() {
  return useSyncExternalStore(subscribeUser, getUser, getUser);
}
export function roleHome(role) {
  return (
    { customer: "/customer", cashier: "/cashier", admin: "/admin" }[role] ||
    "/login"
  );
}
export function loginUser(form) {
  return authenticate("/api/login", form);
}
export function registerUser(form) {
  return authenticate("/api/register", form);
}
export function logoutUser() {
  return store.logout();
}
export function updateUserProfile(form) {
  return action({ type: "profile", ...form });
}
export function getLoyaltyMembers() {
  return [
    ...users()
      .filter((v) => v.role === "customer")
      .map((v) => ({ ...v, memberType: "account" })),
    ...JSON.parse(store.getItem("blossom-brew-loyalty-members") || "[]"),
  ];
}
export function getCustomerMembers() {
  return getLoyaltyMembers().filter((v) => v.memberType === "account");
}
export function addLoyaltyMember(form) {
  return action({ type: "member-add", ...form });
}
export function updateMemberPoints(form) {
  return action({ type: "member-points", ...form });
}
export function addMemberPoints() {
  return { ok: false };
}
export function getPersonalVouchers(id) {
  return JSON.parse(store.getItem("blossom-personal-vouchers") || "[]").filter(
    (v) => v.userId === id && !v.used && new Date(v.expiry) > new Date(),
  );
}
export function redeemPointsVoucher(form) {
  return action({ type: "redeem", ...form });
}
export function consumePersonalVoucher() {}
export function resetUserPassword(form) {
  return authenticate("/api/recovery-reset", form);
}
