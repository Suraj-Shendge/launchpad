-- Prevent self-service profile writes from modifying authorization controls.
-- Public/self-service profile editing is limited to user-facing fields.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM anon, authenticated;

GRANT INSERT (
  id, name, username, avatar_url, display_name, bio,
  website_url, twitter_url, linkedin_url, github_url
) ON TABLE public.profiles TO authenticated;

GRANT UPDATE (
  display_name, username, bio, avatar_url,
  website_url, twitter_url, linkedin_url, github_url
) ON TABLE public.profiles TO authenticated;
