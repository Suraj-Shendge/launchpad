export type ProjectStatus = "draft" | "pending_review" | "published" | "rejected" | "archived";
export type PromotionStatus = "pending" | "scheduled" | "active" | "expired" | "cancelled";
export type AuctionStatus = "scheduled" | "active" | "ended" | "cancelled" | "settled";
export type PaymentStatus = "created" | "pending" | "paid" | "failed" | "refunded" | "cancelled";

export type Category = { id:string; name:string; slug:string; description:string|null; };
export type ProjectRow = {
  id:string; creator_id:string; slug:string; name:string; tagline:string; description:string;
  logo_url:string|null; preview_images:string[]; website_url:string; social_links:Record<string,string>;
  status:ProjectStatus; created_at:string; updated_at:string; published_at:string|null;
  category_id:string; category_name:string; category_slug:string; creator_name:string|null;
  tags:string[]; featured:boolean; promoted:boolean; upvote_count:number;
};

export type Project = Omit<ProjectRow,"category_id"|"category_name"|"category_slug"> & { category:Category|null; viewer_upvoted?:boolean };
export type Auction = {
  id:string; project_id:string|null; placement:string; starting_price:number;
  current_bid:number|null; current_bid_project_id:string|null; winning_project_id:string|null; homepage_slot:number|null;
  bid_increment:number; starts_at:string; ends_at:string; status:AuctionStatus; winner_id:string|null;
};