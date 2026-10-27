import { Webhook } from "standardwebhooks";

type CheckoutArgs = {
  productId: string;
  amount: number;
  customer: { email: string; name?: string | null };
  metadata: Record<string, string>;
  returnUrl: string;
};

const PRODUCTION_SUPABASE_PROJECT_REF = "puxdqzrdrzpkgigawfnd";

export function isDodoSelected() {
  return process.env.PAYMENT_PROVIDER?.trim().toLowerCase() === "dodo";
}

/**
 * Dodo support in this branch is test-only. It requires an explicit non-production
 * Supabase project reference and blocks both Vercel Production and ProjectHub's live DB.
 */
export function isDodoTestSetupReady() {
  const projectRef = process.env.DODO_PAYMENTS_TEST_SUPABASE_PROJECT_REF?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  let hostname = "";

  try {
    hostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";
  } catch {
    return false;
  }

  return (
    process.env.DODO_PAYMENTS_TEST_DATA_ISOLATED === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    Boolean(projectRef) &&
    projectRef !== PRODUCTION_SUPABASE_PROJECT_REF &&
    hostname === `${projectRef}.supabase.co` &&
    Boolean(process.env.DODO_PAYMENTS_TEST_API_KEY?.startsWith("dodo_test_")) &&
    Boolean(process.env.DODO_PAYMENTS_TEST_WEBHOOK_KEY) &&
    Boolean(process.env.DODO_PAYMENTS_TEST_PRODUCT_ID)
  );
}

export async function createDodoTestCheckout(args: CheckoutArgs) {
  const apiKey = process.env.DODO_PAYMENTS_TEST_API_KEY;
  if (!isDodoTestSetupReady() || !apiKey?.startsWith("dodo_test_")) {
    throw new Error("Dodo test mode is not configured for an isolated staging environment.");
  }
  if (!args.customer.email) throw new Error("A customer email is required.");
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new Error("Invalid server-calculated checkout amount.");
  }

  const response = await fetch("https://test.dodopayments.com/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{
        product_id: args.productId,
        quantity: 1,
        // Supported by Dodo only for one-time products with Pay What You Want enabled.
        // Amounts use the lowest denomination: paise for INR.
        amount: Math.round(args.amount * 100),
      }],
      customer: {
        email: args.customer.email,
        name: args.customer.name?.trim() || args.customer.email.split("@")[0] || "ProjectHub customer",
      },
      // Pin INR so international customers are also charged against the INR amount
      // verified by the ProjectHub payment record, even if adaptive pricing is enabled.
      billing_currency: "INR",
      metadata: args.metadata,
      return_url: args.returnUrl,
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({})) as {
    session_id?: string;
    checkout_url?: string | null;
  };

  if (!response.ok || !data.session_id || !data.checkout_url) {
    console.error("Dodo test checkout creation failed", { status: response.status });
    throw new Error("Dodo test checkout could not be created. Check the test API key and Pay What You Want product.");
  }

  return { sessionId: data.session_id, checkoutUrl: data.checkout_url };
}

export async function verifyDodoTestWebhook(
  rawBody: string,
  headers: { "webhook-id": string; "webhook-signature": string; "webhook-timestamp": string },
) {
  const secret = process.env.DODO_PAYMENTS_TEST_WEBHOOK_KEY;
  if (!isDodoTestSetupReady() || !secret) {
    throw new Error("Dodo test webhook is not configured for an isolated staging environment.");
  }
  await new Webhook(secret).verify(rawBody, headers);
}
