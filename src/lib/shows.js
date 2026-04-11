import { supabase } from './supabase';

// Built-in default shows — always available as fallback
export const DEFAULT_SHOWS = {
  "unique-ability": {
    name: "The Unique Ability® Podcast",
    tag: "Helping entrepreneurs identify and live their Unique Ability.",
    hosts: "Shannon Waller",
    clr: "#C0392B", light: "#C0392B20",
    platforms: { p: ["Apple Podcasts", "Spotify"], s: ["LinkedIn"] },
    isDefault: true
  },
  "fat-science": {
    name: "Fat Science",
    tag: "The science of why we get fat — no diets, no agendas.",
    hosts: "Dr. Emily Cooper, Andrea Taylor, Mark Wright",
    clr: "#2471A3", light: "#2471A320",
    platforms: { p: ["YouTube"], s: ["Instagram", "Facebook", "TikTok", "LinkedIn"] },
    isDefault: true
  },
  "sober-curator": {
    name: "The Sober Curator Podcast",
    tag: "Sober curious and sober life content.",
    hosts: "Alysse Bryson",
    clr: "#8E44AD", light: "#8E44AD20",
    platforms: { p: ["Apple Podcasts"], s: ["Spotify", "YouTube", "Instagram", "Facebook", "X"] },
    isDefault: true
  },
  "eternally-amy": {
    name: "Eternally Amy",
    tag: "Grief, love, and life after loss.",
    hosts: "Amy Liz Harrison",
    clr: "#D4A017", light: "#D4A01720",
    platforms: { p: ["Apple Podcasts"], s: ["Spotify", "Instagram", "Facebook", "LinkedIn"] },
    isDefault: true
  },
  "mindshift": {
    name: "The Mindshift Podcast",
    tag: "Anyone. Any habit. Anywhere.",
    hosts: "Dan Holcomb and Rhetta Rowland",
    clr: "#52B788", light: "#52B78820",
    platforms: { p: ["Apple Podcasts", "Spotify"], s: ["YouTube", "Facebook", "Instagram"] },
    isDefault: true
  },
  "leaving-crazytown": {
    name: "Leaving CrazyTown",
    tag: "Escaping the chaos of entrepreneurship.",
    hosts: "Finn & Dr. Sarah Michaud",
    clr: "#E67E22", light: "#E67E2220",
    platforms: { p: ["YouTube"], s: ["Apple Podcasts", "Spotify"] },
    isDefault: true
  },
  "ellevated-achievers": {
    name: "Ellevated Achievers™",
    tag: "Women leading with purpose.",
    hosts: "Host TBD",
    clr: "#E91E8C", light: "#E91E8C20",
    platforms: { p: ["YouTube"], s: ["Instagram", "LinkedIn", "Facebook", "Apple Podcasts", "Spotify"] },
    isDefault: true
  }
};

// Load all shows for the current user's org (RLS handles scoping automatically)
export async function loadShows() {
  try {
    const { data, error } = await supabase.from('shows').select('*');
    if (error) throw error;

    const merged = {};
    for (const row of data) {
      merged[row.id] = { ...row.dna, id: row.id, fromDB: true };
    }
    return merged;
  } catch (e) {
    console.warn('Supabase unavailable:', e.message);
    return {};
  }
}

// Save or update a show's DNA in Supabase
export async function saveShow(id, dna, orgId) {
  const { error } = await supabase.from('shows').upsert({
    id,
    name: dna.name,
    dna,
    org_id: orgId,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
  if (error) throw error;
}

// Delete a custom show from Supabase (can't delete defaults)
export async function deleteShow(id) {
  const { error } = await supabase.from('shows').delete().eq('id', id);
  if (error) throw error;
}
