import { useState, useRef, useEffect } from "react";
import { saveShow } from "./lib/shows";
import { supabase } from "./lib/supabase";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const T = {
  bg: "#1A1A1A", surface: "#242424", card: "#2C2C2C", cardBorder: "#3A3A3A",
  text: "#FFFFFF", textSecondary: "#E0E0E0", textMuted: "#999",
  coral: "#FF3131", coralSoft: "#FF313118", coralMid: "#FF313144",
};
const LS = { fontFamily: "'League Spartan', sans-serif" };
const GA = { fontFamily: "'EB Garamond', Georgia, serif" };

// Platform hub structure
export const PLATFORM_CATEGORIES = [
  {
    id: "podcast",
    label: "Podcast Hosting",
    description: "Where your episode is distributed",
    platforms: ["Apple Podcasts", "Spotify", "Spotify for Creators", "Amazon Music", "iHeart Radio"],
  },
  {
    id: "social",
    label: "Social Media",
    description: "Platform-optimized posts for each selected",
    platforms: ["YouTube", "Instagram", "Facebook", "TikTok", "LinkedIn", "X (Twitter)", "Pinterest", "Threads", "Reddit"],
  },
  {
    id: "community",
    label: "Community Platform",
    description: "Companion post, feed prompts, polls, conversation starters",
    platforms: ["Patreon", "Circle", "Mighty Networks", "Kajabi", "Skool", "Facebook Group"],
    single: true, // only one can be selected
  },
  {
    id: "email",
    label: "Email & Newsletter",
    description: "Subject, preview, body, CTA, FAQ section",
    platforms: ["Newsletter"],
  },
  {
    id: "blog",
    label: "Web & Blog",
    description: "Full blog post with SEO meta and FAQ schema",
    platforms: ["Blog Article"],
  },
  {
    id: "extras",
    label: "Extras",
    description: "Additional content assets",
    platforms: ["Quote Cards", "Guest Kit"],
  },
];

export const DEFAULT_PLATFORMS = {
  podcast: ["Apple Podcasts", "Spotify"],
  social: ["YouTube", "Instagram", "Facebook"],
  community: [],
  email: ["Newsletter"],
  blog: [],
  extras: ["Quote Cards"],
};

const DEFAULT_SN_ELEMENTS = [
  { id: "hook",         label: "Hook Question",        enabled: true,  text: "" },
  { id: "description",  label: "Episode Description",  enabled: true,  text: "" },
  { id: "takeaways",    label: "Key Takeaways",        enabled: true,  text: "" },
  { id: "quote",        label: "Notable Quote",        enabled: false, text: "" },
  { id: "guest_bio",    label: "Guest Bio",            enabled: false, text: "" },
  { id: "resources",    label: "Resources & Links",    enabled: false, text: "" },
  { id: "timestamps",   label: "Timestamps",           enabled: false, text: "", hasScope: true, scope: "youtube" },
  { id: "boilerplate",  label: "Boilerplate",          enabled: true,  text: "" },
  { id: "disclaimer",   label: "Custom Disclaimer",    enabled: false, text: "", hasText: true, textLabel: "Disclaimer text", textPlaceholder: "Enter the disclaimer text to append..." },
  { id: "custom_instructions", label: "Custom Instructions", enabled: false, text: "", header: "", hasText: true, hasHeader: true, textLabel: "Instructions for AI", textPlaceholder: "e.g. Identify specialized terms and define them.", headerPlaceholder: "e.g. Definitions, Key Terms" },
];

function lbl(extra) { return { fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", color: T.text, marginBottom: "8px", display: "block", ...LS, ...(extra||{}) }; }
function fld(extra) { return { width: "100%", background: T.surface, border: "1px solid " + T.cardBorder, borderRadius: "6px", padding: "10px 14px", color: T.text, fontSize: "15px", outline: "none", boxSizing: "border-box", ...GA, ...(extra||{}) }; }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", color: T.coral, marginBottom: "14px", paddingBottom: "8px", borderBottom: "1px solid " + T.cardBorder, ...LS, fontWeight: "700" }}>{title}</div>
      {children}
    </div>
  );
}
function Fld({ label: l, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={lbl()}>{l}</label>
      {children}
    </div>
  );
}

function PlatformHub({ platforms, onChange }) {
  function isSelected(catId, p) {
    return (platforms[catId] || []).includes(p);
  }
  function toggle(catId, p, single) {
    const current = platforms[catId] || [];
    let next;
    if (single) {
      next = current.includes(p) ? [] : [p];
    } else {
      next = current.includes(p) ? current.filter(x => x !== p) : [...current, p];
    }
    onChange({ ...platforms, [catId]: next });
  }

  return (
    <div>
      {PLATFORM_CATEGORIES.map(cat => (
        <div key={cat.id} style={{ marginBottom: "24px" }}>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", color: T.coral, fontWeight: "700", ...LS }}>{cat.label}</div>
            <div style={{ fontSize: "13px", color: T.textMuted, ...GA, fontStyle: "italic", marginTop: "2px" }}>{cat.description}{cat.single ? " — select one" : ""}</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {cat.platforms.map(p => {
              const selected = isSelected(cat.id, p);
              return (
                <button key={p} onClick={() => toggle(cat.id, p, cat.single)}
                  style={{ padding: "8px 16px", background: selected ? T.coralSoft : T.card, border: "1px solid " + (selected ? T.coral : T.cardBorder), borderRadius: "6px", color: selected ? T.text : T.textSecondary, fontSize: "14px", cursor: "pointer", ...LS, fontWeight: selected ? "700" : "400", transition: "all .15s" }}>
                  {selected ? "✓ " : ""}{p}
                </button>
              );
            })}
          </div>
          {(platforms[cat.id] || []).length > 0 && (
            <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "6px", ...LS, letterSpacing: "1px" }}>
              SELECTED: {(platforms[cat.id] || []).join(", ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SNBuilder({ elements, onChange }) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  function toggle(id) { onChange(elements.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e)); }
  function onDragStart(e, idx) { setDragging(idx); e.dataTransfer.effectAllowed = "move"; }
  function onDragOver(e, idx) { e.preventDefault(); setDragOver(idx); }
  function onDrop(e, idx) {
    e.preventDefault();
    if (dragging === null || dragging === idx) { setDragging(null); setDragOver(null); return; }
    const next = [...elements];
    const [moved] = next.splice(dragging, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    setDragging(null); setDragOver(null);
  }
  return (
    <div>
      <div style={{ fontSize: "14px", color: T.textSecondary, marginBottom: "12px", ...GA }}>Toggle on/off · Drag to reorder</div>
      {elements.map((el, idx) => (
        <div key={el.id} style={{ marginBottom: "8px" }}>
          <div draggable
            onDragStart={e => onDragStart(e, idx)} onDragOver={e => onDragOver(e, idx)}
            onDrop={e => onDrop(e, idx)} onDragEnd={() => { setDragging(null); setDragOver(null); }}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: dragOver === idx ? T.coralSoft : T.card, border: "1px solid " + (dragOver === idx ? T.coral : T.cardBorder), borderRadius: el.enabled && (el.hasText || el.hasScope) ? "6px 6px 0 0" : "6px", cursor: "grab", opacity: dragging === idx ? 0.4 : 1 }}>
            <span style={{ color: T.textSecondary }}>⠿</span>
            <div onClick={() => toggle(el.id)} style={{ width: "36px", height: "20px", background: el.enabled ? T.coral : T.cardBorder, borderRadius: "10px", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .2s" }}>
              <div style={{ position: "absolute", top: "3px", left: el.enabled ? "19px" : "3px", width: "14px", height: "14px", background: "#fff", borderRadius: "50%", transition: "left .2s" }} />
            </div>
            <span style={{ fontSize: "15px", color: el.enabled ? T.text : T.textSecondary, ...LS, fontWeight: el.enabled ? "600" : "400" }}>{el.label}</span>
            <span style={{ marginLeft: "auto", fontSize: "13px", color: T.textSecondary, ...LS }}>{idx + 1}</span>
          </div>
          {el.enabled && el.hasScope && (
            <div style={{ background: T.surface, border: "1px solid " + T.cardBorder, borderTop: "none", borderRadius: "0 0 6px 6px", padding: "12px 14px" }}>
              <label style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: T.textMuted, marginBottom: "8px", display: "block", ...LS }}>Include Timestamps In</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[{v:"youtube",l:"YouTube Only"},{v:"both",l:"Show Notes + YouTube"}].map(opt => (
                  <button key={opt.v} onClick={() => onChange(elements.map((x,i) => i===idx ? {...x, scope: opt.v} : x))}
                    style={{ padding: "7px 16px", background: (el.scope||"youtube")===opt.v ? T.coralSoft : T.card, border: "1px solid " + ((el.scope||"youtube")===opt.v ? T.coral : T.cardBorder), borderRadius: "6px", color: (el.scope||"youtube")===opt.v ? T.text : T.textSecondary, fontSize: "13px", cursor: "pointer", ...LS, fontWeight: (el.scope||"youtube")===opt.v ? "700" : "400" }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          )}
          {el.enabled && el.hasText && (
            <div style={{ background: T.surface, border: "1px solid " + T.cardBorder, borderTop: "none", borderRadius: "0 0 6px 6px", padding: "12px 14px" }}>
              {el.hasHeader && (
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: T.textMuted, marginBottom: "6px", display: "block", ...LS }}>Section Header</label>
                  <input style={{ ...fld(), padding: "8px 12px", fontSize: "14px" }} placeholder={el.headerPlaceholder || "Section heading..."} value={el.header || ""} onChange={e => onChange(elements.map((x,i) => i===idx ? {...x, header: e.target.value} : x))} />
                </div>
              )}
              <label style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: T.textMuted, marginBottom: "6px", display: "block", ...LS }}>{el.textLabel || "Text"}</label>
              <textarea style={{ ...fld(), minHeight: "80px", resize: "vertical", padding: "8px 12px", fontSize: "14px", lineHeight: "1.6" }} placeholder={el.textPlaceholder || "Enter text..."} value={el.text || ""} onChange={e => onChange(elements.map((x,i) => i===idx ? {...x, text: e.target.value} : x))} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BoilerplateEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const savedRange = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, []);

  function saveSelection() { const sel = window.getSelection(); if (sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange(); }
  function restoreSelection() { if (savedRange.current) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange.current); } }
  function exec(cmd) { editorRef.current?.focus(); document.execCommand(cmd, false, null); handleChange(); }
  function handleChange() { if (editorRef.current) onChange(editorRef.current.innerHTML); }

  function handlePaste(e) {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (html) {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      tmp.querySelectorAll("*").forEach(el => {
        el.style.color = ""; el.style.backgroundColor = ""; el.style.background = "";
        el.style.fontSize = ""; el.style.fontFamily = "";
        if (el.tagName === "A") { el.style.color = "#FF3131"; el.style.textDecoration = "underline"; }
      });
      const clean = tmp.innerHTML.replace(/<span[^>]*>/gi, "<span>").replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "<br>").replace(/<div[^>]*>/gi, "").replace(/<\/div>/gi, "<br>").replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
      document.execCommand("insertHTML", false, clean);
    } else { document.execCommand("insertText", false, text); }
    handleChange();
  }

  function insertLink() {
    restoreSelection();
    if (linkUrl && linkText) document.execCommand("insertHTML", false, '<a href="' + linkUrl + '" style="color:#FF3131">' + linkText + '</a>');
    else if (linkUrl) document.execCommand("createLink", false, linkUrl);
    setShowLink(false); setLinkUrl(""); setLinkText(""); handleChange();
  }

  const btnS = { padding: "5px 10px", background: T.surface, border: "1px solid " + T.cardBorder, borderRadius: "4px", color: T.textSecondary, fontSize: "13px", cursor: "pointer", ...LS, fontWeight: "600" };

  return (
    <div style={{ border: "1px solid " + T.cardBorder, borderRadius: "6px", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: "4px", padding: "8px 10px", background: T.surface, borderBottom: "1px solid " + T.cardBorder, flexWrap: "wrap", alignItems: "center" }}>
        <button onMouseDown={e => { e.preventDefault(); exec("bold"); }} style={btnS}><strong>B</strong></button>
        <button onMouseDown={e => { e.preventDefault(); exec("italic"); }} style={btnS}><em>I</em></button>
        <div style={{ width: "1px", height: "20px", background: T.cardBorder, margin: "0 4px" }} />
        <button onMouseDown={e => { e.preventDefault(); saveSelection(); setShowLink(true); }} style={btnS}>Link</button>
        <button onMouseDown={e => { e.preventDefault(); exec("unlink"); }} style={btnS}>Unlink</button>
        <div style={{ marginLeft: "auto", fontSize: "12px", color: T.textMuted, ...LS, letterSpacing: "1px" }}>PASTE FROM WORD / GOOGLE DOCS</div>
      </div>
      {showLink && (
        <div style={{ display: "flex", gap: "8px", padding: "8px 10px", background: T.coralSoft, borderBottom: "1px solid " + T.coral + "33", flexWrap: "wrap", alignItems: "center" }}>
          <input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Link text (optional)" style={{ ...fld(), flex: 1, minWidth: "140px", padding: "6px 10px", fontSize: "13px" }} />
          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={{ ...fld(), flex: 2, minWidth: "200px", padding: "6px 10px", fontSize: "13px" }} onKeyDown={e => e.key === "Enter" && insertLink()} />
          <button onClick={insertLink} style={{ padding: "6px 16px", background: T.coral, border: "none", borderRadius: "4px", color: "#fff", fontSize: "13px", cursor: "pointer", ...LS, fontWeight: "700" }}>Insert</button>
          <button onClick={() => { setShowLink(false); setLinkUrl(""); setLinkText(""); }} style={{ padding: "6px 12px", background: "transparent", border: "1px solid " + T.cardBorder, borderRadius: "4px", color: T.textMuted, fontSize: "13px", cursor: "pointer" }}>Cancel</button>
        </div>
      )}
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        onInput={handleChange} onPaste={handlePaste} onMouseUp={saveSelection} onKeyUp={saveSelection}
        style={{ minHeight: "280px", padding: "16px 18px", color: "#FFFFFF", fontSize: "15px", lineHeight: "1.8", outline: "none", ...GA, background: "#2C2C2C", whiteSpace: "pre-wrap", wordBreak: "break-word", caretColor: "#FFFFFF" }}
        data-placeholder="Paste your boilerplate here..."
      />
      <style>{`[contenteditable]:empty:before{content:attr(data-placeholder);color:#666;pointer-events:none}[contenteditable]{color:#FFFFFF!important}[contenteditable] a{color:#FF3131!important;text-decoration:underline}`}</style>
    </div>
  );
}

export function AdminGate({ onSuccess, onClose }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  function check() { if (pin === "6425") { onSuccess(); } else { setErr(true); setPin(""); setTimeout(() => setErr(false), 1200); } }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: T.bg, border: "1px solid " + T.cardBorder, borderRadius: "16px", padding: "48px 40px", width: "340px", textAlign: "center" }}>
        <div style={{ fontSize: "36px", marginBottom: "16px" }}>🔐</div>
        <div style={{ fontSize: "20px", color: T.text, marginBottom: "6px", ...LS, letterSpacing: "2px", textTransform: "uppercase" }}>Admin Access</div>
        <div style={{ fontSize: "15px", color: T.textSecondary, marginBottom: "28px", ...GA }}>Enter your PIN to continue</div>
        <input type="password" style={{ ...fld(), fontSize: "28px", textAlign: "center", letterSpacing: "10px", borderColor: err ? T.coral : T.cardBorder }} value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && check()} placeholder="••••" maxLength={4} autoFocus />
        {err && <div style={{ color: T.coral, fontSize: "14px", marginTop: "10px", ...LS }}>Incorrect PIN</div>}
        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", background: T.surface, border: "1px solid " + T.cardBorder, borderRadius: "8px", color: T.textSecondary, fontSize: "15px", cursor: "pointer", ...LS }}>Cancel</button>
          <button onClick={check} style={{ flex: 1, padding: "14px", background: T.coral, border: "none", borderRadius: "8px", color: "#fff", fontSize: "15px", fontWeight: "700", cursor: "pointer", ...LS }}>Enter →</button>
        </div>
      </div>
    </div>
  );
}

export function AdminPanel({ shows, onClose, onSaved }) {
  const [selKey, setSelKey] = useState(null);
  const [form, setForm] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({});
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [globalSettingsSaved, setGlobalSettingsSaved] = useState(false);
  const [globalSettingsLoading, setGlobalSettingsLoading] = useState(false);

  useEffect(() => {
    async function loadGlobalSettings() {
      try {
        const { data } = await supabase.from("settings").select("value").eq("key", "global").single();
        if (data?.value) setGlobalSettings(data.value);
      } catch {}
    }
    loadGlobalSettings();
  }, []);

  async function saveGlobalSettings(newSettings) {
    setGlobalSettingsLoading(true);
    try {
      await supabase.from("settings").upsert({ key: "global", value: newSettings }, { onConflict: "key" });
      setGlobalSettings(newSettings);
      setGlobalSettingsSaved(true);
      setTimeout(() => setGlobalSettingsSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save settings:", e);
    } finally {
      setGlobalSettingsLoading(false);
    }
  }
  const [rawDna, setRawDna] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newId, setNewId] = useState("");
  const [tab, setTab] = useState("basic");

  function selectShow(k) {
    const s = shows[k];
    setSelKey(k);
    setForm({
      name: s.name || "",
      tag: s.tag || "",
      hosts: s.hosts || "",
      clr: s.clr || "#FF3131",
      platforms: s.platforms || DEFAULT_PLATFORMS,
      voice: { traits: s.voice?.traits || "", energy: s.voice?.energy || "5/10", arch: s.voice?.arch || "", arc: s.voice?.arc || "", phrases: (s.voice?.phrases || []).join("\n"), use: s.voice?.use || "", avoid: s.voice?.avoid || "" },
      aud: { who: s.aud?.who || "", pains: (s.aud?.pains || []).join("\n"), lang: s.aud?.lang || "" },
      tags: s.tags || "",
      bp: s.bp || "",
      rules: s.rules || "",
      snElements: DEFAULT_SN_ELEMENTS.map(def => {
        const saved = (s.snElements || []).find(e => e.id === def.id);
        return saved ? { ...def, enabled: saved.enabled, text: saved.text || "", header: saved.header || "", scope: saved.scope || def.scope } : def;
      }),
      descriptApiKey: s.descriptApiKey || "",
    });
    setRawDna(""); setMsg(""); setTab("basic");
  }

  function startNew() {
    setSelKey("__new__");
    setForm({
      name: "", tag: "", hosts: "", clr: "#FF3131",
      platforms: DEFAULT_PLATFORMS,
      voice: { traits: "", energy: "5/10", arch: "", arc: "", phrases: "", use: "", avoid: "" },
      aud: { who: "", pains: "", lang: "" },
      tags: "", bp: "", rules: "",
      snElements: DEFAULT_SN_ELEMENTS,
      descriptApiKey: "",
    });
    setNewId(""); setRawDna(""); setMsg(""); setAddingNew(true); setTab("basic");
  }

  async function parseWithAI() {
    if (!rawDna.trim()) return;
    setParsing(true); setMsg("");
    try {
      const prompt = "Read this Show DNA document and fill in each field. " +
        "Return ONLY these labeled fields, one per line, with the label in ALL CAPS followed by a colon and a space, then the value. No other text.\n\n" +
        "NAME: show name\nTAG: tagline\nHOSTS: host names\nCOLOR: suggest a hex color\n" +
        "PLATFORMS_PODCAST: main podcast platforms comma separated\nPLATFORMS_SOCIAL: social platforms comma separated\n" +
        "VOICE_TRAITS: tone and voice traits\nVOICE_ENERGY: energy level like 6/10\nVOICE_ARCH: host archetype\n" +
        "VOICE_ARC: emotional arc\nVOICE_PHRASES: signature phrases separated by |\n" +
        "VOICE_USE: language to use\nVOICE_AVOID: language to avoid\n" +
        "AUD_WHO: audience persona\nAUD_PAINS: pain points separated by |\nAUD_LANG: language they use\n" +
        "HASHTAGS: default hashtags\nRULES: content rules\n" +
        "BOILERPLATE: full boilerplate text including all links and disclaimers\n\n" +
        "SHOW DNA:\n" + rawDna.substring(0, 8000);

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, messages: [{ role: "user", content: prompt }] })
      });

      if (!r.ok) { const e = await r.text(); setMsg("API error " + r.status + ": " + e.substring(0, 150)); setParsing(false); return; }

      const j = await r.json();
      const text = j.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";

      function getField(label) {
        const lines = text.split("\n");
        for (const line of lines) {
          const t = line.trim();
          if (t.toUpperCase().startsWith(label + ":")) return t.slice(label.length + 1).trim();
        }
        return "";
      }
      function getMultiline(label) {
        const lines = text.split("\n");
        let found = false; const collected = [];
        for (const line of lines) {
          if (!found) { if (line.trim().toUpperCase().startsWith(label + ":")) { found = true; const rest = line.slice(line.indexOf(":") + 1).trim(); if (rest) collected.push(rest); } }
          else { if (/^[A-Z_]+:/.test(line.trim())) break; collected.push(line); }
        }
        return collected.join("\n").trim();
      }
      function splitBy(str, sep) { return str ? str.split(sep).map(s => s.trim()).filter(Boolean) : []; }

      const podcastPlatforms = splitBy(getField("PLATFORMS_PODCAST"), ",");
      const socialPlatforms = splitBy(getField("PLATFORMS_SOCIAL"), ",");

      setForm(prev => ({
        ...prev,
        name: getField("NAME") || prev?.name || "",
        tag: getField("TAG") || prev?.tag || "",
        hosts: getField("HOSTS") || prev?.hosts || "",
        clr: getField("COLOR") || prev?.clr || "#FF3131",
        platforms: {
          ...DEFAULT_PLATFORMS,
          podcast: podcastPlatforms.length ? podcastPlatforms : DEFAULT_PLATFORMS.podcast,
          social: socialPlatforms.length ? socialPlatforms : DEFAULT_PLATFORMS.social,
        },
        voice: { traits: getField("VOICE_TRAITS"), energy: getField("VOICE_ENERGY") || "5/10", arch: getField("VOICE_ARCH"), arc: getField("VOICE_ARC"), phrases: splitBy(getField("VOICE_PHRASES"), "|").join("\n"), use: getField("VOICE_USE"), avoid: getField("VOICE_AVOID") },
        aud: { who: getField("AUD_WHO"), pains: splitBy(getField("AUD_PAINS"), "|").join("\n"), lang: getField("AUD_LANG") },
        tags: getField("HASHTAGS"),
        bp: getMultiline("BOILERPLATE"),
        rules: getField("RULES"),
        snElements: prev?.snElements || DEFAULT_SN_ELEMENTS,
      }));
      setMsg("DNA parsed — review fields and save.");
    } catch (e) { setMsg("Parse error: " + e.message); }
    finally { setParsing(false); }
  }

  async function handleSave() {
    if (!form) return;
    const id = selKey === "__new__" ? newId.trim().toLowerCase().replace(/\s+/g, "-") : selKey;
    if (!id) { setMsg("Show ID required."); return; }
    if (!form.name.trim()) { setMsg("Show name required."); return; }
    setSaving(true); setMsg("");
    try {
      const dna = {
        name: form.name, tag: form.tag, hosts: form.hosts,
        clr: form.clr, light: form.clr + "20",
        platforms: form.platforms,
        voice: { traits: form.voice.traits, energy: form.voice.energy, arch: form.voice.arch, arc: form.voice.arc, phrases: form.voice.phrases.split("\n").map(s => s.trim()).filter(Boolean), use: form.voice.use, avoid: form.voice.avoid },
        aud: { who: form.aud.who, pains: form.aud.pains.split("\n").map(s => s.trim()).filter(Boolean), lang: form.aud.lang },
        tags: form.tags, bp: form.bp, rules: form.rules,
        snElements: form.snElements,
        descriptApiKey: form.descriptApiKey || "",
        tpl: { sn: "", yt: "", sm: "", gk: "", em: "", bl: "" },
      };
      await saveShow(id, dna);
      setMsg("Saved successfully!");
      if (selKey === "__new__") setSelKey(id);
      setAddingNew(false);
      onSaved();
    } catch (e) { setMsg("Save error: " + e.message); }
    finally { setSaving(false); }
  }

  const TABS = [
    { id: "basic", label: "Basic Info" },
    { id: "voice", label: "Voice DNA" },
    { id: "audience", label: "Audience" },
    { id: "platforms", label: "Platforms" },
    { id: "snnotes", label: "Show Notes Builder" },
    { id: "boilerplate", label: "Boilerplate" },

  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.95)", zIndex: 1000, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0 32px", background: T.surface, borderBottom: "1px solid " + T.cardBorder, display: "flex", justifyContent: "space-between", alignItems: "center", height: "56px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "3px", height: "24px", background: T.coral, borderRadius: "2px" }} />
          <span style={{ fontSize: "16px", letterSpacing: "2px", textTransform: "uppercase", color: T.text, ...LS, fontWeight: "700" }}>Admin Panel</span>
          <span style={{ fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", color: T.coral, ...LS }}>Show DNA Manager</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => setShowGlobalSettings(!showGlobalSettings)} style={{ padding: "8px 16px", background: showGlobalSettings ? T.coralSoft : "transparent", border: "1px solid " + (showGlobalSettings ? T.coral : T.cardBorder), borderRadius: "6px", color: showGlobalSettings ? T.coral : T.textSecondary, fontSize: "14px", cursor: "pointer", ...LS, letterSpacing: "1.5px" }}>⚙️ SETTINGS</button>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid " + T.cardBorder, borderRadius: "6px", color: T.text, fontSize: "14px", cursor: "pointer", ...LS, letterSpacing: "1.5px" }}>CLOSE X</button>
        </div>
      </div>

      {showGlobalSettings && (
        <div style={{ background: T.surface, borderBottom: "1px solid " + T.cardBorder, padding: "24px 32px", flexShrink: 0 }}>
          <div style={{ maxWidth: "600px" }}>
            <div style={{ fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", color: T.coral, marginBottom: "16px", ...LS, fontWeight: "700" }}>Global Settings — API Keys</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", color: T.text, marginBottom: "8px", display: "block", ...LS }}>Descript API Key</label>
                <input
                  type="password"
                  value={globalSettings.descriptApiKey || ""}
                  onChange={e => setGlobalSettings(s => ({ ...s, descriptApiKey: e.target.value }))}
                  placeholder="Paste your Descript API key here..."
                  style={{ width: "100%", background: T.card, border: "1px solid " + T.cardBorder, borderRadius: "6px", padding: "10px 14px", color: T.text, fontSize: "15px", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }}
                />
                <div style={{ fontSize: "13px", color: T.textMuted, marginTop: "6px", fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
                  Descript → Settings → API Tokens → Create Token. One key covers all shows in your workspace.
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button onClick={() => saveGlobalSettings(globalSettings)}
                  style={{ padding: "10px 24px", background: T.coral, border: "none", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "700", cursor: "pointer", ...LS, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                  {globalSettingsSaved ? "✓ Saved" : globalSettingsLoading ? "Saving..." : "Save Settings"}
                </button>
                <span style={{ fontSize: "13px", color: T.textMuted, fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>Saved to Supabase — shared across all team members</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ width: "220px", background: T.surface, borderRight: "1px solid " + T.cardBorder, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid " + T.cardBorder }}>
            <button onClick={startNew} style={{ width: "100%", padding: "10px", background: T.coral, border: "none", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "700", cursor: "pointer", ...LS, letterSpacing: "1.5px", textTransform: "uppercase" }}>+ Add Show</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {Object.entries(shows).map(([k, s]) => (
              <div key={k} onClick={() => selectShow(k)}
                style={{ padding: "12px 14px", borderRadius: "6px", cursor: "pointer", background: selKey === k ? (s.clr ? s.clr + "18" : T.coralSoft) : "transparent", border: "1px solid " + (selKey === k ? (s.clr || T.coral) + "44" : "transparent"), marginBottom: "4px", transition: "all .15s" }}>
                <div style={{ fontSize: "15px", color: selKey === k ? (s.clr || T.coral) : T.text, fontWeight: "700", ...LS, marginBottom: "2px" }}>{s.name}</div>
                <div style={{ fontSize: "13px", color: T.textSecondary, ...GA, fontStyle: "italic" }}>{(s.tag || "").substring(0, 35)}{(s.tag || "").length > 35 ? "..." : ""}</div>
              </div>
            ))}
          </div>
        </div>

        {!form ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: T.textMuted }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎙️</div>
              <div style={{ fontSize: "15px", ...LS, letterSpacing: "2px", textTransform: "uppercase" }}>Select a show or add a new one</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ width: "380px", borderRight: "1px solid " + T.cardBorder, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid " + T.cardBorder }}>
                <div style={{ fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", color: T.textMuted, marginBottom: "8px", ...LS }}>Paste Show DNA</div>
                <div style={{ fontSize: "14px", color: T.textSecondary, marginBottom: "12px", ...GA, lineHeight: "1.5" }}>Paste your Show DNA in any format. Claude will extract all fields automatically.</div>
              </div>
              <div style={{ flex: 1, padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden" }}>
                <textarea style={{ flex: 1, background: T.surface, border: "1px solid " + T.cardBorder, borderRadius: "6px", padding: "14px", color: T.text, fontSize: "14px", outline: "none", resize: "none", ...GA, lineHeight: "1.6" }} placeholder="Paste show DNA here..." value={rawDna} onChange={e => setRawDna(e.target.value)} spellCheck={false} />
                <button onClick={parseWithAI} disabled={parsing || !rawDna.trim()}
                  style={{ padding: "13px", background: rawDna.trim() ? T.coral : T.cardBorder, border: "none", borderRadius: "6px", color: rawDna.trim() ? "#fff" : T.textMuted, fontSize: "14px", fontWeight: "700", cursor: rawDna.trim() ? "pointer" : "not-allowed", ...LS, letterSpacing: "2px", textTransform: "uppercase" }}>
                  {parsing ? "Parsing..." : "Parse with AI →"}
                </button>
                {msg && <div style={{ fontSize: "13px", color: msg.startsWith("Saved") || msg.startsWith("DNA") ? "#52B788" : "#F09090", ...LS }}>{msg}</div>}
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {addingNew && selKey === "__new__" && (
                <div style={{ padding: "12px 24px", background: T.coralSoft, borderBottom: "1px solid " + T.coral + "33" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label style={{ ...lbl(), margin: 0, whiteSpace: "nowrap" }}>Show ID:</label>
                    <input style={{ ...fld(), padding: "8px 12px", fontSize: "14px", flex: 1 }} placeholder="e.g. my-podcast" value={newId} onChange={e => setNewId(e.target.value)} />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", borderBottom: "1px solid " + T.cardBorder, flexShrink: 0, overflowX: "auto" }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ padding: "12px 18px", background: tab === t.id ? T.bg : "transparent", borderBottom: tab === t.id ? "2px solid " + T.coral : "2px solid transparent", border: "none", color: tab === t.id ? T.coral : T.text, fontSize: "13px", cursor: "pointer", ...LS, letterSpacing: "1.5px", textTransform: "uppercase", whiteSpace: "nowrap", fontWeight: tab === t.id ? "700" : "500" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

                {tab === "basic" && (
                  <Section title="Basic Information">
                    <Fld label="Show Name"><input style={fld()} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="The Podcast Name" /></Fld>
                    <Fld label="Tagline / Motto"><input style={fld()} value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} placeholder="Your show's one-liner" /></Fld>
                    <Fld label="Host(s)"><input style={fld()} value={form.hosts} onChange={e => setForm(p => ({ ...p, hosts: e.target.value }))} placeholder="Jane Smith, John Doe" /></Fld>
                    <Fld label="Brand Color">
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <input type="color" value={form.clr} onChange={e => setForm(p => ({ ...p, clr: e.target.value }))} style={{ width: "48px", height: "36px", border: "none", borderRadius: "6px", cursor: "pointer" }} />
                        <input style={{ ...fld(), flex: 1 }} value={form.clr} onChange={e => setForm(p => ({ ...p, clr: e.target.value }))} placeholder="#FF3131" />
                        <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: form.clr, flexShrink: 0 }} />
                      </div>
                    </Fld>
                    <Fld label="Default Hashtags"><textarea style={{ ...fld(), minHeight: "70px", resize: "vertical" }} value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="#ShowName #Topic1 #Topic2" /></Fld>
                  </Section>
                )}

                {tab === "voice" && (
                  <Section title="Voice DNA">
                    <Fld label="Voice Traits"><textarea style={{ ...fld(), minHeight: "70px", resize: "vertical" }} value={form.voice.traits} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, traits: e.target.value } }))} placeholder="Warm. Curious. Grounded. Direct." /></Fld>
                    <Fld label="Energy Level"><input style={fld()} value={form.voice.energy} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, energy: e.target.value } }))} placeholder="e.g. 6/10" /></Fld>
                    <Fld label="Host Archetype"><input style={fld()} value={form.voice.arch} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, arch: e.target.value } }))} placeholder="e.g. Guide + Mirror" /></Fld>
                    <Fld label="Emotional Arc"><textarea style={{ ...fld(), minHeight: "70px", resize: "vertical" }} value={form.voice.arc} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, arc: e.target.value } }))} placeholder="Curious → Seen → Understood → Inspired" /></Fld>
                    <Fld label="Signature Phrases (one per line)"><textarea style={{ ...fld(), minHeight: "90px", resize: "vertical" }} value={form.voice.phrases} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, phrases: e.target.value } }))} placeholder="Your show's tagline phrases" /></Fld>
                    <Fld label="Language to USE"><textarea style={{ ...fld(), minHeight: "80px", resize: "vertical" }} value={form.voice.use} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, use: e.target.value } }))} placeholder="Words and concepts that fit the show" /></Fld>
                    <Fld label="Language to AVOID"><textarea style={{ ...fld(), minHeight: "80px", resize: "vertical" }} value={form.voice.avoid} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, avoid: e.target.value } }))} placeholder="Words and concepts to never use" /></Fld>
                    <Fld label="Content Rules"><textarea style={{ ...fld(), minHeight: "80px", resize: "vertical" }} value={form.rules} onChange={e => setForm(p => ({ ...p, rules: e.target.value }))} placeholder="Any specific rules for content generation" /></Fld>
                  </Section>
                )}

                {tab === "audience" && (
                  <Section title="Audience DNA">
                    <Fld label="Listener Persona"><textarea style={{ ...fld(), minHeight: "90px", resize: "vertical" }} value={form.aud.who} onChange={e => setForm(p => ({ ...p, aud: { ...p.aud, who: e.target.value } }))} placeholder="Who is your ideal listener?" /></Fld>
                    <Fld label="Pain Points (one per line)"><textarea style={{ ...fld(), minHeight: "100px", resize: "vertical" }} value={form.aud.pains} onChange={e => setForm(p => ({ ...p, aud: { ...p.aud, pains: e.target.value } }))} placeholder="I've tried everything and nothing works." /></Fld>
                    <Fld label="Language They Use"><textarea style={{ ...fld(), minHeight: "80px", resize: "vertical" }} value={form.aud.lang} onChange={e => setForm(p => ({ ...p, aud: { ...p.aud, lang: e.target.value } }))} placeholder="how to stop / why can't I" /></Fld>
                  </Section>
                )}

                {tab === "platforms" && (
                  <Section title="Platform Hub">
                    <div style={{ fontSize: "14px", color: T.textSecondary, marginBottom: "20px", ...GA, lineHeight: "1.6" }}>
                      Select every platform this show publishes to. Content will be generated and optimized for each selected platform.
                    </div>
                    <PlatformHub platforms={form.platforms || DEFAULT_PLATFORMS} onChange={pl => setForm(p => ({ ...p, platforms: pl }))} />
                  </Section>
                )}

                {tab === "snnotes" && (
                  <Section title="Show Notes Builder">
                    <div style={{ fontSize: "14px", color: T.textSecondary, marginBottom: "16px", ...GA, lineHeight: "1.6" }}>Toggle which elements to include and drag to set their order.</div>
                    <SNBuilder elements={form.snElements} onChange={el => setForm(p => ({ ...p, snElements: el }))} />
                  </Section>
                )}

                {tab === "boilerplate" && (
                  <Section title="Boilerplate">
                    <div style={{ fontSize: "14px", color: T.textSecondary, marginBottom: "16px", ...GA, lineHeight: "1.6" }}>Automatically appended to Show Notes and YouTube descriptions.</div>
                    <BoilerplateEditor value={form.bp} onChange={v => setForm(p => ({ ...p, bp: v }))} />
                  </Section>
                )}


              </div>

              <div style={{ padding: "16px 24px", background: T.surface, borderTop: "1px solid " + T.cardBorder, display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: "12px 32px", background: T.coral, border: "none", borderRadius: "6px", color: "#fff", fontSize: "15px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", ...LS, letterSpacing: "2px", textTransform: "uppercase", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving..." : "Save Show →"}
                </button>
                {msg && <div style={{ fontSize: "14px", color: msg.startsWith("Saved") || msg.startsWith("DNA") ? "#52B788" : "#F09090", ...LS }}>{msg}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
