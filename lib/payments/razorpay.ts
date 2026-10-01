import Razorpay from "razorpay";
import crypto from "node:crypto";

export function getRazorpay() {
  const key_id=process.env.RAZORPAY_KEY_ID;
  const key_secret=process.env.RAZORPAY_KEY_SECRET;
  if(!key_id || !key_secret) throw new Error("Razorpay server credentials are not configured.");
  return new Razorpay({key_id,key_secret});
}

export function verifyPaymentSignature(orderId:string,paymentId:string,signature:string) {
  const secret=process.env.RAZORPAY_KEY_SECRET;
  if(!secret) throw new Error("Razorpay server credentials are not configured.");
  const expected=crypto.createHmac("sha256",secret).update(orderId+"|"+paymentId).digest("hex");
  const expectedBuffer=Buffer.from(expected);
  const signatureBuffer=Buffer.from(signature);
  return expectedBuffer.length===signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer,signatureBuffer);
}

export function verifyWebhookSignature(body:string,signature:string) {
  const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
  if(!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured.");
  const expected=crypto.createHmac("sha256",secret).update(body).digest("hex");
  const expectedBuffer=Buffer.from(expected);
  const signatureBuffer=Buffer.from(signature);
  return expectedBuffer.length===signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer,signatureBuffer);
}
