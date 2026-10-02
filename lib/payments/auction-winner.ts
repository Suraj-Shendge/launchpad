import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay } from "@/lib/payments/razorpay";

type AdminClient=ReturnType<typeof createAdminClient>;

type SettledAuction={
  auction_id:string;
  winner_id:string|null;
  winning_bid:number|null;
  winning_project_id:string|null;
};

export async function createAuctionWinnerPayment(admin:AdminClient,row:SettledAuction){
  if(!row.winner_id||!row.winning_bid||!row.winning_project_id){
    return {ok:true,status:"no_winner" as const};
  }

  const idempotencyKey="auction:"+row.auction_id;
  const {data:existing}=await admin.from("payments")
    .select("id,status,razorpay_order_id")
    .eq("idempotency_key",idempotencyKey)
    .maybeSingle();

  if(existing?.status==="paid"||existing?.status==="pending"){
    return {ok:true,status:"already_exists" as const,paymentId:existing.id};
  }

  const deadline=new Date(Date.now()+15*60*1000).toISOString();
  let paymentId=existing?.id??"";

  if(existing){
    const {error}=await admin.from("payments").update({
      user_id:row.winner_id,
      project_id:row.winning_project_id,
      auction_id:row.auction_id,
      amount:Number(row.winning_bid),
      currency:"INR",
      plan:"homepage",
      status:"pending",
      payment_deadline_at:deadline,
      auction_payment_round:1,
      metadata:{
        purpose:"auction_winner_payment",
        idempotency_key:idempotencyKey,
        claimant_id:row.winner_id
      },
      updated_at:new Date().toISOString()
    }).eq("id",existing.id);

    if(error)return {ok:false,status:"payment_update_failed" as const,error:error.message};
  } else {
    const {data:paymentIntent,error}=await admin.from("payments").insert({
      user_id:row.winner_id,
      project_id:row.winning_project_id,
      auction_id:row.auction_id,
      idempotency_key:idempotencyKey,
      amount:Number(row.winning_bid),
      currency:"INR",
      plan:"homepage",
      status:"pending",
      payment_deadline_at:deadline,
      auction_payment_round:1,
      metadata:{
        purpose:"auction_winner_payment",
        idempotency_key:idempotencyKey,
        claimant_id:row.winner_id
      }
    }).select("id").single();

    if(error||!paymentIntent){
      if(error?.code==="23505")return {ok:true,status:"already_exists" as const};
      return {ok:false,status:"payment_insert_failed" as const,error:error?.message||"Could not create payment intent."};
    }
    paymentId=paymentIntent.id;
  }

  let order;
  try {
    order=await getRazorpay().orders.create({
      amount:Math.round(Number(row.winning_bid)*100),
      currency:"INR",
      receipt:"ph_auction_"+row.auction_id,
      notes:{auction_id:row.auction_id,user_id:row.winner_id}
    });
  } catch(error) {
    await admin.from("payments").update({
      status:"failed",
      updated_at:new Date().toISOString()
    }).eq("id",paymentId).eq("status","pending");
    return {ok:false,status:"order_failed" as const,error:error instanceof Error?error.message:"Razorpay order creation failed."};
  }

  const {error:paymentUpdateError}=await admin.from("payments").update({
    razorpay_order_id:order.id,
    updated_at:new Date().toISOString()
  }).eq("id",paymentId).eq("status","pending");

  if(paymentUpdateError)return {ok:false,status:"payment_update_failed" as const,error:paymentUpdateError.message};

  const {data:project}=await admin.from("projects").select("slug").eq("id",row.winning_project_id).maybeSingle();
  if(project?.slug){
    const {data:existingNotice}=await admin.from("notifications").select("id")
      .eq("user_id",row.winner_id).eq("type","auction_payment_due")
      .eq("reference_type","auction").eq("reference_id",row.auction_id).maybeSingle();
    if(!existingNotice){
      await admin.from("notifications").insert({
        user_id:row.winner_id,
        type:"auction_payment_due",
        title:"You won an auction",
        message:"Complete your homepage placement payment within 15 minutes to keep the placement.",
        link:"/projects/"+project.slug,
        reference_type:"auction",
        reference_id:row.auction_id
      });
    }
  }

  return {ok:true,status:"created" as const,paymentId};
}
