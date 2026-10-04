-- Reduce SECURITY DEFINER search-path attack surface for intentionally
-- public/authenticated RPCs. Their behavior and execution grants remain unchanged.
alter function public.get_creator_rank(uuid) set search_path = '';
alter function public.get_public_auction_bid_history(uuid) set search_path = '';
alter function public.public_auction_bid_count(uuid) set search_path = '';
alter function public.public_auction_bidder_count(uuid) set search_path = '';
alter function public.increment_community_thread_view(uuid) set search_path = '';
alter function public.add_community_post(uuid,text,uuid) set search_path = '';
alter function public.place_bid(uuid,numeric,uuid) set search_path = '';
alter function public.toggle_community_thread_vote(uuid) set search_path = '';
alter function public.toggle_follow(text,uuid) set search_path = '';
alter function public.toggle_project_vote(uuid) set search_path = '';
