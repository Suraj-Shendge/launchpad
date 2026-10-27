# Dodo Payments — isolated test-mode rollout

This branch adds test-mode code only. Do not deploy it to Production or use it to accept live payments.

## Dodo dashboard setup
1. Switch Dodo to Test Mode.
2. Create a one-time ProjectHub placement product with **Pay What You Want** enabled and default currency INR. The server sends the current amount in paise; the browser never supplies the amount.
3. Create a test API key starting with `dodo_test_` and copy the test webhook signing secret.
4. Register `https://<staging-host>/api/payments/dodo-webhook` for `payment.succeeded`, `payment.failed`, `payment.cancelled`, and `refund.succeeded`.

## Mandatory data isolation
Use a separate staging Supabase project with its own URL, publishable key and service-role key. A valid Dodo test webhook mutates whichever database the app is connected to; never point this branch at production data.

Set only in local development or Vercel Preview:
```dotenv
PAYMENT_PROVIDER=dodo
DODO_PAYMENTS_TEST_API_KEY=dodo_test_...
DODO_PAYMENTS_TEST_WEBHOOK_KEY=whsec_...
DODO_PAYMENTS_TEST_PRODUCT_ID=pdt_...
DODO_PAYMENTS_TEST_DATA_ISOLATED=true
NEXT_PUBLIC_SUPABASE_URL=<staging-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<staging-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>
NEXT_PUBLIC_SITE_URL=https://<staging-host>
```
Keep `PAYMENT_PROVIDER=razorpay` in Production until a separate release is approved. This code blocks Dodo on Vercel Production and insists on a `dodo_test_` API key.

## Tests
- Featured payment: signed success webhook activates the promotion; browser return alone does not.
- Auction winner payment: successful checkout before the ProjectHub deadline activates the placement.
- Failed/cancelled/refunded payments, duplicate webhook delivery, invalid signatures.
- Dashboard/admin payment identifiers and statuses.

## Auction limitation before live use
Dodo's standard hosted Checkout Sessions can remain valid for 24 hours; ProjectHub's auction payment deadline is 15 minutes. ProjectHub refuses activation after its deadline, so a late hosted checkout could complete without granting the placement. **Do not launch live auction payments using this hosted-session path.** Before production, align checkout expiry with the auction deadline or implement late-payment reconciliation/refunds, then test end to end. Only a verified Dodo webhook is authoritative; the browser return URL is not proof of payment.
