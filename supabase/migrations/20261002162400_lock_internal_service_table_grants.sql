-- Internal ProjectHub tables are server-side only.
-- Keep RLS enabled as defense in depth and remove Data API access.

revoke all on table
  public.admin_actions, public.newsletter_settings, public.newsletter_signup_rate_limits,
  public.newsletter_subscribers, public.payment_events, public.site_visitors
from public, anon, authenticated;

grant select, insert, update, delete, truncate, references, trigger
on table
  public.admin_actions, public.newsletter_settings, public.newsletter_signup_rate_limits,
  public.newsletter_subscribers, public.payment_events, public.site_visitors
to service_role;

-- Personalized reads and user/admin mutations are not anonymous APIs.
revoke execute on function public.get_today_site_visits() from public, anon, authenticated;
revoke execute on function public.get_user_review_vote(uuid) from anon;
revoke execute on function public.has_liked_comment(uuid) from anon;
revoke execute on function public.is_following(text, uuid) from anon;
revoke execute on function public.get_project_comments_with_likes(uuid, uuid, text, text, integer, integer) from anon;
revoke execute on function public.get_project_reviews(uuid, uuid, text, integer, integer) from anon;
revoke execute on function public.toggle_comment_like(uuid) from anon;
revoke execute on function public.toggle_review_vote(uuid, text) from anon;
revoke execute on function public.update_my_profile(text, text, text, text, text, text, text, text) from anon;

-- Trigger-only functions should not be callable through the Data API.
revoke all on function public.prevent_sent_newsletter_edits() from public, anon, authenticated;
revoke all on function public.set_newsletter_updated_at() from public, anon, authenticated;
revoke all on function public.set_project_verification_updated_at() from public, anon, authenticated;
