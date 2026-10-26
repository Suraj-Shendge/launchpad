CREATE OR REPLACE FUNCTION public.get_public_auction_bid_history(p_auction_id uuid)
RETURNS TABLE(bid_id uuid, project_name text, amount numeric, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT b.id,
         coalesce(p.name, 'Project')::text AS project_name,
         b.amount,
         b.created_at
  FROM public.auction_bids b
  JOIN public.auctions a ON a.id = b.auction_id
  LEFT JOIN public.projects p ON p.id = b.project_id
  WHERE b.auction_id = p_auction_id
    AND a.status = 'active'
    AND a.starts_at <= now()
    AND a.ends_at > now()
  ORDER BY b.created_at DESC
  LIMIT 100;
$function$;

CREATE OR REPLACE FUNCTION public.public_auction_bid_count(p_auction_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT count(*)::integer
  FROM public.auction_bids b
  JOIN public.auctions a ON a.id = b.auction_id
  WHERE b.auction_id = p_auction_id
    AND a.status IN ('scheduled', 'active');
$function$;

CREATE OR REPLACE FUNCTION public.public_auction_bidder_count(p_auction_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT count(DISTINCT b.bidder_id)::integer
  FROM public.auction_bids b
  JOIN public.auctions a ON a.id = b.auction_id
  WHERE b.auction_id = p_auction_id
    AND a.status IN ('scheduled', 'active');
$function$;
