// Store policy for the Capacitor iOS/Android apps (Apple 3.1.1, Google Play
// billing): credits are bought on the website only. Inside the native apps
// there is no purchase UI at all -- no Pricing link, buy/upgrade/top-up
// buttons, prices, Stripe checkout or billing portal, and no pointer to buy
// elsewhere. A low-credit state says only NO_CREDITS_TEXT. The web build is
// unchanged (Capacitor.isNativePlatform() is false there).
import { Capacitor } from "@capacitor/core";

export function purchasesAllowed() {
  return !Capacitor.isNativePlatform();
}

export const NO_CREDITS_TEXT = "You don't have enough credits for this.";
export const NOT_ON_PLAN_TEXT = "This isn't available on your current plan.";

// Backend messages can carry purchase wording ("Top up to use...",
// "Upgrade your plan"). In the native apps, credit messages become
// NO_CREDITS_TEXT and plan-limit messages NOT_ON_PLAN_TEXT; any other
// message, and every message on the web, is returned as is.
const CREDIT_RE = /credit/i;
const PURCHASE_RE = /\b(top[ -]?up|upgrade|buy|purchase|pricing|billing|subscribe)\b|\$\d/i;

export function storeSafeMessage(message) {
  if (purchasesAllowed() || !message) return message;
  const text = String(message);
  if (/insufficient credits|not enough credits|INSUFFICIENT_CREDITS/i.test(text)) return NO_CREDITS_TEXT;
  if (PURCHASE_RE.test(text)) return CREDIT_RE.test(text) ? NO_CREDITS_TEXT : NOT_ON_PLAN_TEXT;
  return text;
}
