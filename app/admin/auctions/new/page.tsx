import { requireAdmin } from "@/lib/auth";
import { AdminAuctionForm } from "@/components/projecthub/admin-auction-form";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function NewAuction(){
 await requireAdmin("auctions.manage"); const admin=createAdminClient();
 const [{data:projects},{data:positions},{data:start},{data:increment}]=await Promise.all([
  admin.from("projects").select("id,name").eq("status","published").order("name"),
  admin.from("promotion_positions").select("id,name").in("slug",["homepage-hero","homepage-featured"]).order("name"),
  admin.from("settings").select("value").eq("key","auction_starting_price").single(),
  admin.from("settings").select("value").eq("key","auction_min_bid_increment").single(),
 ]);
 return <div className="admin-page"><p className="eyebrow">Admin</p><h1>Create auction.</h1><p className="admin-lead">Create a premium placement with explicit authoritative start/end times.</p><AdminAuctionForm projects={projects??[]} positions={positions??[]} startingPrice={Number(start?.value??1499)} increment={Number(increment?.value??100)}/></div>;
}