import { AuctionNotificationEmail } from "@/emails/auction-notification";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNewsletterFrom, getResend } from "@/lib/resend";
import { getSiteUrl } from "@/lib/site-url";

type AdminClient=ReturnType<typeof createAdminClient>;

type AuctionNotification={
  id:string;user_id:string;type:string;title:string;message:string;link:string|null;
};

export async function sendAuctionNotificationEmail(admin:AdminClient,notification:AuctionNotification){
  if(notification.type!=="auction_outbid"&&notification.type!=="auction_ending_soon") return {ok:false,status:"unsupported" as const};
  try{
    const {data:userData}=await admin.auth.admin.getUserById(notification.user_id);
    const email=userData.user?.email;
    if(!email) return {ok:false,status:"missing_email" as const};
    const siteUrl=getSiteUrl();
    const relative=notification.link||"/auctions";
    const actionUrl=relative.startsWith("http")?relative:siteUrl+relative;
    const result=await getResend().emails.send({
      from:getNewsletterFrom(),
      to:email,
      subject:notification.title+" — ProjectHub",
      react:AuctionNotificationEmail({title:notification.title,message:notification.message,actionUrl}),
      tags:[{name:"auction_notification",value:notification.type},{name:"notification_id",value:notification.id}]
    });
    if(result.error) return {ok:false,status:"send_failed" as const,error:result.error.message};
    await admin.from("notifications").update({email_sent_at:new Date().toISOString()}).eq("id",notification.id).is("email_sent_at",null);
    return {ok:true,status:"sent" as const};
  }catch(error){
    return {ok:false,status:"send_failed" as const,error:error instanceof Error?error.message:"Could not send auction notification email."};
  }
}

