-- Restrict promotion writes to trusted server-side flows (service_role).
-- The application creates/activates promotions from verified payment handlers.
REVOKE ALL PRIVILEGES ON TABLE public.promotions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.promotions TO anon, authenticated;

-- Public auction views are intentionally readable, but should not expose
-- irrelevant INSERT/UPDATE/DELETE/maintenance privileges.
REVOKE ALL PRIVILEGES ON TABLE public.homepage_auction_public, public.homepage_auction_winners
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.homepage_auction_public, public.homepage_auction_winners
  TO anon, authenticated;

-- Enforce that ordinary project owners cannot publish, self-verify, feature,
-- promote, delete, or moderate their own projects by writing directly to PostgREST.
-- Admin operations and trusted server-side service_role requests remain supported.
CREATE OR REPLACE FUNCTION private.protect_project_security_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := auth.role();
BEGIN
  IF v_role = 'service_role' OR private.is_admin() THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to modify project records'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_id IS DISTINCT FROM v_uid OR NEW.user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Project ownership must match the signed-in user'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status NOT IN ('draft', 'pending_review') THEN
      RAISE EXCEPTION 'New projects must be submitted as drafts or pending review'
        USING ERRCODE = '42501';
    END IF;

    NEW.is_featured := false;
    NEW.is_verified := false;
    NEW.promotion_plan := NULL;
    NEW.promotion_start := NULL;
    NEW.promotion_end := NULL;
    NEW.published_at := NULL;
    NEW.deleted_at := NULL;
    NEW.deleted_by := NULL;
    NEW.rejection_reason := NULL;
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
    NEW.organic_homepage_won_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.promotion_plan IS DISTINCT FROM OLD.promotion_plan
     OR NEW.promotion_start IS DISTINCT FROM OLD.promotion_start
     OR NEW.promotion_end IS DISTINCT FROM OLD.promotion_end
     OR NEW.published_at IS DISTINCT FROM OLD.published_at
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
     OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
     OR NEW.organic_homepage_won_at IS DISTINCT FROM OLD.organic_homepage_won_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Protected project fields can only be changed by moderation or trusted server operations'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'archived' THEN
    RAISE EXCEPTION 'Project status changes must go through moderation'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.protect_project_security_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS project_protect_security_fields ON public.projects;
CREATE TRIGGER project_protect_security_fields
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION private.protect_project_security_fields();
