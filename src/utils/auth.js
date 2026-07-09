export const TOKEN_EXPIRY_BUFFER_SECONDS = 60;

export async function getAuthHeaders() {
  const { supabase } = await import("../supabaseClient.js");
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const expiresAt = data?.session?.expires_at;

  if (token) {
    const secondsRemaining = expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : null;
    if (secondsRemaining === null || secondsRemaining > TOKEN_EXPIRY_BUFFER_SECONDS) {
      return { Authorization: `Bearer ${token}` };
    }
    const { data: refreshed } = await supabase.auth.refreshSession();
    const refreshedToken = refreshed?.session?.access_token;
    return refreshedToken ? { Authorization: `Bearer ${refreshedToken}` } : { Authorization: `Bearer ${token}` };
  }

  const { data: refreshed } = await supabase.auth.refreshSession();
  const refreshedToken = refreshed?.session?.access_token;
  return refreshedToken ? { Authorization: `Bearer ${refreshedToken}` } : {};
}
