import { supabase } from "../supabaseClient.js";

export async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) return { Authorization: `Bearer ${token}` };

  // Session not yet hydrated from storage — force a refresh round-trip
  const { data: refreshed } = await supabase.auth.refreshSession();
  const refreshedToken = refreshed?.session?.access_token;
  return refreshedToken ? { Authorization: `Bearer ${refreshedToken}` } : {};
}
