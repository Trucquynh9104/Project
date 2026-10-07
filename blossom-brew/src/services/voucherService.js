import { store } from "./dataStore";
import { evaluateVoucher } from "../../shared/businessRules";
export function applyVoucher(code, subtotal, member) {
  const normalized = code.trim().toUpperCase();
  const vouchers = [
    ...JSON.parse(store.getItem("blossom-personal-vouchers") || "[]"),
    ...JSON.parse(store.getItem("blossom-vouchers") || "[]"),
  ];
  return evaluateVoucher(
    vouchers.find(
      (v) => v.code === normalized && (!v.userId || v.userId === member?.id),
    ),
    subtotal,
    member,
  );
}
