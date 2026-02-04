import { supabase } from "../supabaseClient.js";

let project = null;
let listeners = [];
let creating = false;

function notify() {
  listeners.forEach(fn => fn(project));
}

export function getProject() {
  return project;
}

/* ---------- INIT / LOAD ---------- */

export async function ensureProject() {
  if (project || creating) return;

  creating = true;

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    creating = false;
    console.warn("Auth not ready yet — skipping project creation");
    return;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: "Untitled Video",
      apply_intro_outro: false
    })
    .select()
    .single();

  creating = false;

  if (error) {
    console.error("Create project failed:", error);
    return;
  }

  project = data;
  notify();
}

export async function updateProject(patch) {
  if (!project) return;

  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", project.id);

  if (error) {
    console.error(error);
    return;
  }

  project = { ...project, ...patch };
  notify();
}

export function subscribeProject(fn) {
  listeners.push(fn);
}
