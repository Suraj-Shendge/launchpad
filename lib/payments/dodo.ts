import { Webhook } from "standardwebhooks";
type CheckoutArgs={productId:string;amount:number;customer:{email:string;name?:string|null};metadata:Record<string,string>;returnUrl:string};
export function isDodoSelected(){return process.env.PAYMENT_PROVIDER?.trim().toLowerCase()==="dodo";}
/** Test-only rollout. Vercel Production is blocked and separate staging data is required. */
export function isDodoTestSetupReady(){return process.env.DODO_PAYMENTS_TEST_DATA_ISOLATED==="true"&&process.env.VERCEL_ENV!=="production"&&Boolean(process.env.DODO_PAYMENTS_TEST_API_KEY?.startsWith("dodo_test_"))&&Boolean(process.env.DODO_PAYMENTS_TEST_WEBHOOK_KEY)&&Boolean(process.env.DODO_PAYMENTS_TEST_PRODUCT_ID);}
export async function createDodoTestCheckout(args:CheckoutArgs){
 const apiKey=process.env.DODO_PAYMENTS_TEST_API_KEY;
 if(!isDodoTestSetupReady()||!apiKey?.startsWith("dodo_test_"))throw new Error("Dodo test mode is not ready.");
 if(!args.customer.email)throw new Error("Customer email required.");
 if(!Number.isFinite(args.amount)||args.amount<=0)throw new Error("Invalid server-calculated amount.");
 const response=await fetch("https://test.dodopayments.com/checkouts",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({product_cart:[{product_id:args.productId,quantity:1,amount:Math.round(args.amount*100)}],customer:{email:args.customer.email,...(args.customer.name?{name:args.customer.name}:{})},metadata:args.metadata,return_url:args.returnUrl}),cache:"no-store"});
 const data=await response.json().catch(()=>({})) as {session_id?:string;checkout_url?:string|null};
 if(!response.ok||!data.session_id||!data.checkout_url){console.error("Dodo test checkout creation failed",{status:response.status});throw new Error("Dodo test checkout could not be created. Check the test key and Pay What You Want product.");}
 return {sessionId:data.session_id,checkoutUrl:data.checkout_url};
}
export async function verifyDodoTestWebhook(rawBody:string,headers:{"webhook-id":string;"webhook-signature":string;"webhook-timestamp":string}){
 const secret=process.env.DODO_PAYMENTS_TEST_WEBHOOK_KEY;if(!isDodoTestSetupReady()||!secret)throw new Error("Dodo test webhook is not configured.");await new Webhook(secret).verify(rawBody,headers);
}
