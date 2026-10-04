-- pg_net is an internal server-side capability. Remove inherited
-- PUBLIC/Data API execution after the extension install hook runs.
revoke execute on function net.http_get(text, jsonb, jsonb, integer) from public, anon, authenticated, service_role;
revoke execute on function net.http_post(text, jsonb, jsonb, jsonb, integer) from public, anon, authenticated, service_role;
revoke execute on function net.http_delete(text, jsonb, jsonb, integer, jsonb) from public, anon, authenticated, service_role;
revoke execute on function net.http_collect_response(bigint, boolean) from public, anon, authenticated, service_role;
revoke execute on function net.worker_restart() from public, anon, authenticated, service_role;
revoke execute on function net.wait_until_running() from public, anon, authenticated, service_role;
revoke execute on function net.wake() from public, anon, authenticated, service_role;
revoke execute on function net.check_worker_is_up() from public, anon, authenticated, service_role;

grant execute on function net.http_get(text, jsonb, jsonb, integer) to postgres, supabase_functions_admin;
grant execute on function net.http_post(text, jsonb, jsonb, jsonb, integer) to postgres, supabase_functions_admin;
grant execute on function net.http_delete(text, jsonb, jsonb, integer, jsonb) to postgres, supabase_functions_admin;
grant execute on function net.http_collect_response(bigint, boolean) to postgres, supabase_functions_admin;
grant execute on function net.worker_restart() to postgres, supabase_functions_admin;
grant execute on function net.wait_until_running() to postgres, supabase_functions_admin;
grant execute on function net.wake() to postgres, supabase_functions_admin;
grant execute on function net.check_worker_is_up() to postgres, supabase_functions_admin;
