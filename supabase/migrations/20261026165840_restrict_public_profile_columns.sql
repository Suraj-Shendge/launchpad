-- Public profile reads need display fields and public verification badges only.
-- Admin pages and trusted server handlers use service_role and retain their access.
REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  name,
  username,
  avatar_url,
  created_at,
  display_name,
  bio,
  website_url,
  twitter_url,
  linkedin_url,
  github_url,
  is_blocked,
  verification_tier,
  github_connected
) ON TABLE public.profiles TO anon, authenticated;
