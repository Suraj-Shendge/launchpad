-- Harden read-only SECURITY DEFINER RPCs by making them obey caller RLS.
alter function public.get_comment_like_count(uuid) security invoker;
alter function public.get_explore_featured_project_ids(integer) security invoker;
alter function public.get_follow_count(text, uuid) security invoker;
alter function public.get_project_rankings(integer, text) security invoker;
alter function public.get_project_review_summary(uuid) security invoker;
alter function public.get_project_review_summary_batch(uuid[]) security invoker;
alter function public.get_project_stats(uuid) security invoker;
alter function public.get_review_vote_counts(uuid) security invoker;

-- These personalized reads already have explicit authenticated-only execution.
alter function public.get_project_comments_with_likes(uuid, uuid, text, text, integer, integer) security invoker;
alter function public.get_project_reviews(uuid, uuid, text, integer, integer) security invoker;
alter function public.get_user_review_vote(uuid) security invoker;
alter function public.has_liked_comment(uuid) security invoker;
alter function public.is_following(text, uuid) security invoker;
