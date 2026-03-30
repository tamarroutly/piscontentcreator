import { useState, useRef, useEffect } from "react";
import { saveShow } from "./lib/shows";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const T = {
  bg: "#1A1A1A", surface: "#242424", card: "#2C2C2C", cardBorder: "#3A3A3A",
  text: "#FFFFFF", textSecondary: "#C4C4C4", textMuted: "#666",
  coral: "#FF3131", coralSoft: "#FF313118", coralMid: "#FF313144",
};

const LS = { fontFamily: "'League Spartan', sans-serif" };
const GA = { fontFamily: "'EB Garamond', Georgia, serif" };

const DEFAULT_SN_ELEMENTS = [
  { id: "hook",       label: "Hook Question",    enabled: true  },
  { id: "description",label: "Episode Description", enabled: true },
  { id: "takeaways",  label: "Key Takeaways",    enabled: true  },
  { id: "quote",      label: "Notable Quote",    enabled: false },
  { id: "guest_bio",  label: "Guest Bio",        enabled: false },
  { id: "resources",  label: "Resources & Links",enabled: false },
  { id: "timestamps", label: "Timestamps",       enabled: false },
  { id: "disclaimer", label: "Custom Disclaimer",enabled: false },
];

const DEFAULT_SECTIONS = [
  { id: "shownotes",  label: "Show Notes",           enabled: true  },
  { id: "youtube",    label: "YouTube Description",  enabled: true  },
  { id: "social",     label: "Social Media",         enabled: true  },
  { id: "email",      label: "Email Newsletter",     enabled: true  },
  { id: "blog",       label: "Blog Article",         enabled: false },
  { id: "quotes",     label: "Quote Cards",          enabled: true  },
  { id: "guestkit",   label: "Guest Kit",            enabled: false },
  { id: "community",  label: "Community Content",    enabled: false },
];

const EMPTY_SHOW = {
  name: "", tag: "", hosts: "", clr: "#FF3131", light: "#FF313120",
  platforms: { p: [], s: [] },
  voice: { traits: "", energy: "5/10", arch: "", arc: "", phrases: [], use: "", avoid: "" },
  aud: { who: "", pains: [], lang: "" },
  tags: "", bp: "", rules: "",
  tpl: { sn: "", yt: "", sm: "", gk: "", em: "", bl: "" },
  snElements: DEFAULT_SN_ELEMENTS,
  sections: DEFAULT_SECTIONS,
  community: { platform: "", enabled: false },
};

function lbl(extra={}) {
  return { fontSize: "15px", letterSpacing: "2px", textTransform: "uppercase", color: T.text, marginBottom: "8px", display: "block", ...LS, ...extra };
}
function field(extra={}) {
  return { width: "100%", background: T.surface, border: `1px solid ${T.cardBorder}`, borderRadius: "6px", padding: "10px 14px", color: T.text, fontSize: "16px", outline: "none", boxSizing: "border-box", ...GA, ...extra };
}
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ fontSize: "15px", letterSpacing: "2px", textTransform: "uppercase", color: T.coral, marginBottom: "14px", paddingBottom: "8px", borderBottom: `1px solid ${T.cardBorder}`, ...LS, fontWeight: "700" }}>{title}</div>
      {children}
    </div>
  );
}
function Field({ label: l, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={lbl()}>{l}</label>
      {children}
    </div>
  );
}

// Drag-to-reorder Show Notes builder
function SNBuilder({ elements, onChange }) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  function toggle(id) {
    onChange(elements.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e));
  }
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
      <div style={{ fontSize: "16px", color: T.textSecondary, marginBottom: "12px", ...GA }}>Toggle on/off · Drag to reorder</div>
      {elements.map((el, idx) => (
        <div key={el.id} draggable onDragStart={e => onDragStart(e, idx)} onDragOver={e => onDragOver(e, idx)} onDrop={e => onDrop(e, idx)} onDragEnd={() => { setDragging(null); setDragOver(null); }}
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: dragOver === idx ? `${T.coral}15` : T.card, border: `1px solid ${dragOver === idx ? T.coral : T.cardBorder}`, borderRadius: "6px", marginBottom: "6px", cursor: "grab", transition: "all .15s", opacity: dragging === idx ? 0.4 : 1 }}>
          <span style={{ color: T.textMuted, fontSize: "15px", cursor: "grab" }}>⠿</span>
          <div onClick={() => toggle(el.id)} style={{ width: "36px", height: "20px", background: el.enabled ? T.coral : T.cardBorder, borderRadius: "10px", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .2s" }}>
            <div style={{ position: "absolute", top: "3px", left: el.enabled ? "19px" : "3px", width: "14px", height: "14px", background: "#fff", borderRadius: "50%", transition: "left .2s" }} />
          </div>
          <span style={{ fontSize: "15px", color: el.enabled ? T.text : T.textMuted, ...LS, fontWeight: el.enabled ? "600" : "400" }}>{el.label}</span>
          <span style={{ marginLeft: "auto", fontSize: "14px", color: T.textSecondary, ...LS, letterSpacing: "1px" }}>{idx + 1}</span>
        </div>
      ))}
    </div>
  );
}

// Sections checklist
function SectionsChecklist({ sections, onChange }) {
  function toggle(id) {
    onChange(sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
      {sections.map(s => (
        <div key={s.id} onClick={() => toggle(s.id)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: s.enabled ? `${T.coral}12` : T.card, border: `1px solid ${s.enabled ? T.coral : T.cardBorder}`, borderRadius: "6px", cursor: "pointer", transition: "all .15s" }}>
          <div style={{ width: "16px", height: "16px", border: `2px solid ${s.enabled ? T.coral : T.cardBorder}`, borderRadius: "3px", background: s.enabled ? T.coral : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
            {s.enabled && <span style={{ color: "#fff", fontSize: "14px", fontWeight: "700" }}>✓</span>}
          </div>
          <span style={{ fontSize: "16px", color: s.enabled ? T.text : T.textMuted, ...LS, fontWeight: s.enabled ? "600" : "400" }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// Platform chips editor
function PlatformEditor({ platforms, onChange }) {
  const ALL = ["Apple Podcasts", "Spotify", "YouTube", "Instagram", "Facebook", "TikTok", "LinkedIn", "X", "Pinterest"];
  function toggleP(p) {
    const isP = platforms.p.includes(p);
    const isS = platforms.s.includes(p);
    if (isP) { onChange({ p: platforms.p.filter(x => x !== p), s: platforms.s }); }
    else if (isS) { onChange({ p: platforms.p, s: platforms.s.filter(x => x !== p) }); }
    else { onChange({ p: platforms.p, s: [...platforms.s, p] }); }
  }
  function makePrimary(p) {
    onChange({ p: [...platforms.p.filter(x => x !== p), p], s: platforms.s.filter(x => x !== p) });
  }
  return (
    <div>
      <div style={{ fontSize: "16px", color: T.textMuted, marginBottom: "10px", ...GA }}>Click to add · Click again to make primary (gold) · Click primary to remove</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {ALL.map(p => {
          const isPrimary = platforms.p.includes(p);
          const isSecondary = platforms.s.includes(p);
          return (
            <div key={p} style={{ display: "flex", gap: "0" }}>
              <button onClick={() => toggleP(p)} style={{ padding: "6px 12px", background: isPrimary ? "#D4A843" : isSecondary ? `${T.coral}20` : T.card, border: `1px solid ${isPrimary ? "#D4A843" : isSecondary ? T.coral : T.cardBorder}`, borderRadius: isSecondary ? "6px 0 0 6px" : "6px", fontSize: "15px", color: isPrimary ? "#1A1A1A" : isSecondary ? T.coral : T.textMuted, ...LS, fontWeight: isPrimary ? "700" : "400", cursor: "pointer", transition: "all .15s" }}>
                {isPrimary ? "★ " : ""}{p}
              </button>
              {isSecondary && <button onClick={() => makePrimary(p)} title="Make primary" style={{ padding: "6px 8px", background: T.card, border: `1px solid ${T.coral}`, borderLeft: "none", borderRadius: "0 6px 6px 0", fontSize: "14px", color: T.textSecondary, cursor: "pointer" }}>★</button>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "10px", fontSize: "14px", color: T.textSecondary, ...LS, letterSpacing: "1px" }}>
        PRIMARY: {platforms.p.join(", ") || "none"} · SECONDARY: {platforms.s.join(", ") || "none"}
      </div>
    </div>
  );
}

// ─── RICH TEXT BOILERPLATE EDITOR ────────────────────────────────────────────
function BoilerplateEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const savedRange = useRef(null);

  // Initialize editor content from value prop
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, []);

  function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    if (savedRange.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }

  function exec(cmd, value = null) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    handleChange();
  }

  function handleChange() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  function handlePaste(e) {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (html) {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      // Strip all inline color, background, font-size, font-family styles
      // but keep bold, italic, underline structure
      tmp.querySelectorAll("*").forEach(el => {
        el.style.color = "";
        el.style.backgroundColor = "";
        el.style.background = "";
        el.style.fontSize = "";
        el.style.fontFamily = "";
        el.style.fontWeight = el.style.fontWeight === "bold" || el.style.fontWeight >= 600 ? "bold" : "";
        // Keep href on links
        if (el.tagName === "A") {
          el.style.color = "#FF3131";
          el.style.textDecoration = "underline";
        }
      });
      // Clean up unwanted wrapper tags, keep formatting tags
      const clean = tmp.innerHTML
        .replace(/<span[^>]*>/gi, "<span>")
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/p>/gi, "<br>")
        .replace(/<div[^>]*>/gi, "")
        .replace(/<\/div>/gi, "<br>")
        .replace(/(<br\s*\/?>){3,}/gi, "<br><br>");
      document.execCommand("insertHTML", false, clean);
    } else {
      document.execCommand("insertText", false, text);
    }
    handleChange();
  }

  function insertLink() {
    restoreSelection();
    if (linkUrl && linkText) {
      const linkHtml = `<a href="${linkUrl}" style="color:#FF3131">${linkText}</a>`;
      document.execCommand("insertHTML", false, linkHtml);
    } else if (linkUrl) {
      document.execCommand("createLink", false, linkUrl);
      // Style the link
      const sel = window.getSelection();
      if (sel.anchorNode?.parentElement?.tagName === "A") {
        sel.anchorNode.parentElement.style.color = "#FF3131";
      }
    }
    setShowLinkInput(false);
    setLinkUrl(""); setLinkText("");
    handleChange();
  }

  const btnStyle = (active) => ({
    padding: "5px 10px", background: active ? T.coralSoft : T.surface,
    border: `1px solid ${active ? T.coral : T.cardBorder}`, borderRadius: "4px",
    color: active ? T.coral : T.textSecondary, fontSize: "15px", cursor: "pointer",
    fontFamily: "'League Spartan', sans-serif", fontWeight: "600", lineHeight: "1",
  });

  return (
    <div style={{ border: `1px solid ${T.cardBorder}`, borderRadius: "6px", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "4px", padding: "8px 10px", background: T.surface, borderBottom: `1px solid ${T.cardBorder}`, flexWrap: "wrap", alignItems: "center" }}>
        <button onMouseDown={e => { e.preventDefault(); exec("bold"); }} style={btnStyle(false)} title="Bold"><strong>B</strong></button>
        <button onMouseDown={e => { e.preventDefault(); exec("italic"); }} style={btnStyle(false)} title="Italic"><em>I</em></button>
        <div style={{ width: "1px", height: "20px", background: T.cardBorder, margin: "0 4px" }} />
        <button onMouseDown={e => { e.preventDefault(); saveSelection(); setShowLinkInput(true); }} style={btnStyle(showLinkInput)} title="Insert Link">🔗 Link</button>
        <button onMouseDown={e => { e.preventDefault(); exec("unlink"); }} style={btnStyle(false)} title="Remove Link">✕ Link</button>
        <div style={{ width: "1px", height: "20px", background: T.cardBorder, margin: "0 4px" }} />
        <button onMouseDown={e => { e.preventDefault(); exec("insertUnorderedList"); }} style={btnStyle(false)} title="Bullet list">• List</button>
        <div style={{ marginLeft: "auto", fontSize: "14px", color: T.textMuted, fontFamily: "'League Spartan', sans-serif", letterSpacing: "1px" }}>PASTE DIRECTLY FROM WORD/GOOGLE DOCS</div>
      </div>

      {/* Link input */}
      {showLinkInput && (
        <div style={{ display: "flex", gap: "8px", padding: "8px 10px", background: `${T.coral}10`, borderBottom: `1px solid ${T.cardBorder}`, alignItems: "center", flexWrap: "wrap" }}>
          <input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Link text (optional — uses selection)" style={{ ...field(), flex: 1, minWidth: "140px", padding: "6px 10px", fontSize: "15px" }} />
          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={{ ...field(), flex: 2, minWidth: "200px", padding: "6px 10px", fontSize: "15px" }} onKeyDown={e => e.key === "Enter" && insertLink()} />
          <button onClick={insertLink} style={{ padding: "6px 16px", background: T.coral, border: "none", borderRadius: "4px", color: "#fff", fontSize: "15px", cursor: "pointer", fontFamily: "'League Spartan', sans-serif", fontWeight: "700" }}>Insert</button>
          <button onClick={() => { setShowLinkInput(false); setLinkUrl(""); setLinkText(""); }} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${T.cardBorder}`, borderRadius: "4px", color: T.textMuted, fontSize: "15px", cursor: "pointer" }}>Cancel</button>
        </div>
      )}

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleChange}
        onPaste={handlePaste}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        style={{
          minHeight: "300px", padding: "16px 18px", color: "#FFFFFF",
          fontSize: "16px", lineHeight: "1.9", outline: "none",
          fontFamily: "'EB Garamond', Georgia, serif", background: "#2C2C2C",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
          caretColor: "#FFFFFF",
        }}
        data-placeholder="Paste your boilerplate here — links, bold text, and formatting will be preserved..."
      />
      <style>{`[contenteditable]:empty:before{content:attr(data-placeholder);color:#666;pointer-events:none}[contenteditable]{color:#FFFFFF!important}[contenteditable] a{color:#FF3131!important;text-decoration:underline}[contenteditable] strong,[contenteditable] b{font-weight:bold;color:#FFFFFF}`}</style>
    </div>
  );
}


export function AdminGate({ onSuccess, onClose }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  function check() { if (pin === "6425") { onSuccess(); } else { setErr(true); setPin(""); setTimeout(() => setErr(false), 1200); } }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: T.bg, border: `1px solid ${T.cardBorder}`, borderRadius: "16px", padding: "48px 40px", width: "340px", textAlign: "center" }}>
        <div style={{ fontSize: "36px", marginBottom: "16px" }}>🔐</div>
        <div style={{ fontSize: "20px", color: T.text, marginBottom: "6px", ...LS, letterSpacing: "2px", textTransform: "uppercase" }}>Admin Access</div>
        <div style={{ fontSize: "16px", color: T.textMuted, marginBottom: "28px", ...GA }}>Enter your PIN to continue</div>
        <input type="password" style={{ ...field(), fontSize: "28px", textAlign: "center", letterSpacing: "10px", borderColor: err ? T.coral : T.cardBorder }} value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && check()} placeholder="••••" maxLength={4} autoFocus />
        {err && <div style={{ color: T.coral, fontSize: "15px", marginTop: "10px", ...LS }}>Incorrect PIN</div>}
        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", background: T.surface, border: `1px solid ${T.cardBorder}`, borderRadius: "8px", color: T.textSecondary, fontSize: "16px", cursor: "pointer", ...LS }}>Cancel</button>
          <button onClick={check} style={{ flex: 1, padding: "14px", background: T.coral, border: "none", borderRadius: "8px", color: "#fff", fontSize: "16px", fontWeight: "700", cursor: "pointer", ...LS }}>Enter →</button>
        </div>
      </div>
    </div>
  );
}

export function AdminPanel({ shows, onClose, onSaved }) {
  const [selKey, setSelKey] = useState(null);
  const [form, setForm] = useState(null);
  const [rawDna, setRawDna] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newId, setNewId] = useState("");
  const [tab, setTab] = useState("basic"); // basic | voice | audience | platforms | content | snnotes | boilerplate

  function selectShow(k) {
    const s = shows[k];
    setSelKey(k);
    setForm({
      name: s.name || "",
      tag: s.tag || "",
      hosts: s.hosts || "",
      clr: s.clr || "#FF3131",
      platforms: s.platforms || { p: [], s: [] },
      voice: { traits: s.voice?.traits || "", energy: s.voice?.energy || "5/10", arch: s.voice?.arch || "", arc: s.voice?.arc || "", phrases: (s.voice?.phrases || []).join("\n"), use: s.voice?.use || "", avoid: s.voice?.avoid || "" },
      aud: { who: s.aud?.who || "", pains: (s.aud?.pains || []).join("\n"), lang: s.aud?.lang || "" },
      tags: s.tags || "",
      bp: s.bp || "",
      rules: s.rules || "",
      snElements: s.snElements || DEFAULT_SN_ELEMENTS,
      sections: s.sections || DEFAULT_SECTIONS,
      community: s.community || { platform: "", enabled: false },
    });
    setRawDna("");
    setMsg("");
    setTab("basic");
  }

  function startNew() {
    setSelKey("__new__");
    setForm({ ...EMPTY_SHOW, name: "", voice: { ...EMPTY_SHOW.voice, phrases: "" }, aud: { ...EMPTY_SHOW.aud, pains: "" } });
    setNewId("");
    setAddingNew(true);
    setRawDna("");
    setMsg("");
    setTab("basic");
  }

  async function parseWithAI() {
    if (!rawDna.trim()) return;
    setParsing(true); setMsg("");
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: `Extract the following fields from this Show DNA document and return ONLY valid JSON, no markdown, no explanation:

{
  "name": "show name",
  "tag": "tagline/motto",
  "hosts": "host name(s)",
  "clr": "#hexcolor (pick one that matches the show vibe)",
  "platforms_primary": ["list of primary platforms"],
  "platforms_secondary": ["list of secondary platforms"],
  "voice_traits": "tone/voice traits",
  "voice_energy": "energy level e.g. 5/10",
  "voice_arch": "host archetype",
  "voice_arc": "episode emotional arc",
  "voice_phrases": "signature phrases, one per line",
  "voice_use": "language/topics to use",
  "voice_avoid": "language/topics to avoid",
  "aud_who": "audience persona description",
  "aud_pains": "pain points, one per line",
  "aud_lang": "language/search terms audience uses",
  "tags": "#hashtag1 #hashtag2 etc",
  "bp": "full boilerplate text to append to show notes",
  "rules": "any specific content rules"
}

If a field isn't found, use an empty string. Here is the Show DNA:

${rawDna.substring(0, 8000)}`
          }]
        })
      });
      const j = await r.json();
      const text = j.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      let clean = text.replace(/```json|```/g, "").trim();
      // If JSON is truncated, try to close it
      if (!clean.endsWith("}")) {
        // Find the last complete key-value pair and close the object
        const lastComma = clean.lastIndexOf(",");
        const lastBrace = clean.lastIndexOf("}");
        if (lastComma > lastBrace) {
          clean = clean.substring(0, lastComma) + "}";
        } else {
          clean = clean + "}";
        }
      }
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch(jsonErr) {
        // Try a more aggressive fix - find last complete string value
        const match = clean.match(/^([\s\S]*"[^"]+"\s*:\s*"[^"]*")/);
        if (match) {
          parsed = JSON.parse(match[1] + "}");
        } else {
          throw jsonErr;
        }
      }
      setForm(prev => ({
        ...prev,
        name: parsed.name || prev?.name || "",
        tag: parsed.tag || prev?.tag || "",
        hosts: parsed.hosts || prev?.hosts || "",
        clr: parsed.clr || prev?.clr || "#FF3131",
        platforms: { p: parsed.platforms_primary || [], s: parsed.platforms_secondary || [] },
        voice: { traits: parsed.voice_traits || "", energy: parsed.voice_energy || "5/10", arch: parsed.voice_arch || "", arc: parsed.voice_arc || "", phrases: parsed.voice_phrases || "", use: parsed.voice_use || "", avoid: parsed.voice_avoid || "" },
        aud: { who: parsed.aud_who || "", pains: parsed.aud_pains || "", lang: parsed.aud_lang || "" },
        tags: parsed.tags || "",
        bp: parsed.bp || "",
        rules: parsed.rules || "",
        snElements: prev?.snElements || DEFAULT_SN_ELEMENTS,
        sections: prev?.sections || DEFAULT_SECTIONS,
      }));
      setMsg("✓ DNA parsed — review the fields and save.");
    } catch (e) {
      setMsg(`❌ Parse error: ${e.message}`);
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (!form) return;
    const id = selKey === "__new__" ? newId.trim().toLowerCase().replace(/\s+/g, "-") : selKey;
    if (!id) { setMsg("❌ Show ID required."); return; }
    if (!form.name.trim()) { setMsg("❌ Show name required."); return; }
    setSaving(true); setMsg("");
    try {
      const dna = {
        name: form.name,
        tag: form.tag,
        hosts: form.hosts,
        clr: form.clr,
        light: form.clr + "20",
        platforms: form.platforms,
        voice: {
          traits: form.voice.traits,
          energy: form.voice.energy,
          arch: form.voice.arch,
          arc: form.voice.arc,
          phrases: form.voice.phrases.split("\n").map(s => s.trim()).filter(Boolean),
          use: form.voice.use,
          avoid: form.voice.avoid,
        },
        aud: {
          who: form.aud.who,
          pains: form.aud.pains.split("\n").map(s => s.trim()).filter(Boolean),
          lang: form.aud.lang,
        },
        tags: form.tags,
        bp: form.bp,
        rules: form.rules,
        snElements: form.snElements,
        sections: form.sections,
        community: form.community || { platform: "", enabled: false },
        tpl: { sn: "", yt: "", sm: "", gk: "", em: "", bl: "" },
      };
      await saveShow(id, dna);
      setMsg("✓ Saved successfully!");
      if (selKey === "__new__") setSelKey(id);
      setAddingNew(false);
      onSaved();
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { id: "basic", label: "Basic Info" },
    { id: "voice", label: "Voice DNA" },
    { id: "audience", label: "Audience" },
    { id: "platforms", label: "Platforms" },
    { id: "content", label: "Content Sections" },
    { id: "snnotes", label: "Show Notes Builder" },
    { id: "boilerplate", label: "Boilerplate" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.95)", zIndex: 1000, display: "flex", flexDirection: "column" }}>
      {/* Admin Header */}
      <div style={{ padding: "0 32px", background: T.surface, borderBottom: `1px solid ${T.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", height: "56px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "3px", height: "24px", background: T.coral, borderRadius: "2px" }} />
          <span style={{ fontSize: "16px", letterSpacing: "2px", textTransform: "uppercase", color: T.text, ...LS, fontWeight: "700" }}>Admin Panel</span>
          <span style={{ fontSize: "15px", letterSpacing: "2px", textTransform: "uppercase", color: T.coral, ...LS }}>Show DNA Manager</span>
        </div>
        <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${T.cardBorder}`, borderRadius: "6px", color: T.textSecondary, fontSize: "16px", cursor: "pointer", ...LS, letterSpacing: "1.5px" }}>CLOSE ✕</button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Show list sidebar */}
        <div style={{ width: "220px", background: T.surface, borderRight: `1px solid ${T.cardBorder}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "16px", borderBottom: `1px solid ${T.cardBorder}` }}>
            <button onClick={startNew} style={{ width: "100%", padding: "10px", background: T.coral, border: "none", borderRadius: "6px", color: "#fff", fontSize: "16px", fontWeight: "700", cursor: "pointer", ...LS, letterSpacing: "1.5px", textTransform: "uppercase" }}>+ Add Show</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {Object.entries(shows).map(([k, s]) => (
              <div key={k} onClick={() => selectShow(k)} style={{ padding: "12px 14px", borderRadius: "6px", cursor: "pointer", background: selKey === k ? `${s.clr || T.coral}18` : "transparent", border: selKey === k ? `1px solid ${s.clr || T.coral}44` : "1px solid transparent", marginBottom: "4px", transition: "all .15s" }}>
                <div style={{ fontSize: "16px", color: selKey === k ? (s.clr || T.coral) : T.text, fontWeight: "700", ...LS, marginBottom: "2px" }}>{s.name}</div>
                <div style={{ fontSize: "15px", color: T.textSecondary, ...GA, fontStyle: "italic" }}>{s.tag?.substring(0, 35)}{s.tag?.length > 35 ? "..." : ""}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main editor */}
        {!form ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎙️</div>
              <div style={{ fontSize: "15px", ...LS, letterSpacing: "2px", textTransform: "uppercase" }}>Select a show or add a new one</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* LEFT — paste DNA */}
            <div style={{ width: "380px", borderRight: `1px solid ${T.cardBorder}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize: "15px", letterSpacing: "2px", textTransform: "uppercase", color: T.textMuted, marginBottom: "8px", ...LS }}>Paste Show DNA</div>
                <div style={{ fontSize: "16px", color: T.textSecondary, marginBottom: "12px", ...GA, lineHeight: "1.5" }}>Paste your Show DNA document in any format — Word doc, plain text, structured notes. Claude will parse it automatically.</div>
              </div>
              <div style={{ flex: 1, padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden" }}>
                <textarea
                  style={{ flex: 1, background: T.surface, border: `1px solid ${T.cardBorder}`, borderRadius: "6px", padding: "14px", color: T.text, fontSize: "15px", outline: "none", resize: "none", ...GA, lineHeight: "1.6" }}
                  placeholder="Paste show DNA here — name, tagline, voice, audience, boilerplate, etc. Any format works."
                  value={rawDna}
                  onChange={e => setRawDna(e.target.value)}
                  spellCheck={false}
                />
                <button onClick={parseWithAI} disabled={parsing || !rawDna.trim()} style={{ padding: "13px", background: rawDna.trim() ? T.coral : T.cardBorder, border: "none", borderRadius: "6px", color: rawDna.trim() ? "#fff" : T.textMuted, fontSize: "16px", fontWeight: "700", cursor: rawDna.trim() ? "pointer" : "not-allowed", ...LS, letterSpacing: "2px", textTransform: "uppercase", transition: "all .2s" }}>
                  {parsing ? "Parsing with AI..." : "✦ Parse with AI →"}
                </button>
                {msg && <div style={{ fontSize: "16px", color: msg.startsWith("✓") ? "#52B788" : "#F09090", ...LS, letterSpacing: "1px" }}>{msg}</div>}
              </div>
            </div>

            {/* RIGHT — form tabs */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* New show ID input */}
              {addingNew && selKey === "__new__" && (
                <div style={{ padding: "12px 24px", background: `${T.coral}12`, borderBottom: `1px solid ${T.coral}33` }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label style={{ ...lbl(), margin: 0, whiteSpace: "nowrap" }}>Show ID:</label>
                    <input style={{ ...field(), padding: "8px 12px", fontSize: "15px", flex: 1 }} placeholder="e.g. my-podcast" value={newId} onChange={e => setNewId(e.target.value)} />
                    <div style={{ fontSize: "15px", color: T.textSecondary, ...GA, whiteSpace: "nowrap" }}>Used as database key</div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: "flex", gap: "0", borderBottom: `1px solid ${T.cardBorder}`, flexShrink: 0, overflowX: "auto" }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 18px", background: tab === t.id ? T.bg : "transparent", borderBottom: tab === t.id ? `2px solid ${T.coral}` : "2px solid transparent", border: "none", color: tab === t.id ? T.coral : T.text, fontSize: "14px", cursor: "pointer", ...LS, letterSpacing: "1.5px", textTransform: "uppercase", whiteSpace: "nowrap", fontWeight: tab === t.id ? "700" : "400", transition: "all .15s" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

                {tab === "basic" && (
                  <Section title="Basic Information">
                    <Field label="Show Name"><input style={field()} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="The Podcast Name" /></Field>
                    <Field label="Tagline / Motto"><input style={field()} value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} placeholder="Your show's one-liner" /></Field>
                    <Field label="Host(s)"><input style={field()} value={form.hosts} onChange={e => setForm(p => ({ ...p, hosts: e.target.value }))} placeholder="Jane Smith, John Doe" /></Field>
                    <Field label="Brand Color">
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <input type="color" value={form.clr} onChange={e => setForm(p => ({ ...p, clr: e.target.value }))} style={{ width: "48px", height: "36px", border: "none", borderRadius: "6px", cursor: "pointer", background: "none" }} />
                        <input style={{ ...field(), flex: 1 }} value={form.clr} onChange={e => setForm(p => ({ ...p, clr: e.target.value }))} placeholder="#FF3131" />
                        <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: form.clr, flexShrink: 0 }} />
                      </div>
                    </Field>
                    <Field label="Default Hashtags">
                      <textarea style={{ ...field(), minHeight: "70px", resize: "vertical" }} value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="#ShowName #Topic1 #Topic2" />
                    </Field>
                    <Field label="Community Platform">
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                        <div onClick={() => setForm(p => ({ ...p, community: { ...p.community, enabled: !p.community?.enabled } }))} style={{ width: "40px", height: "22px", background: form.community?.enabled ? T.coral : T.cardBorder, borderRadius: "11px", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .2s" }}>
                          <div style={{ position: "absolute", top: "3px", left: form.community?.enabled ? "21px" : "3px", width: "16px", height: "16px", background: "#fff", borderRadius: "50%", transition: "left .2s" }} />
                        </div>
                        <span style={{ fontSize: "15px", color: form.community?.enabled ? T.text : T.textSecondary, ...LS }}>Enable Community Content</span>
                      </div>
                      {form.community?.enabled && (
                        <div>
                          <div style={{ fontSize: "15px", color: T.textMuted, marginBottom: "8px", ...GA }}>Which platform does this show use for their community?</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                            {["Patreon", "Circle", "Mighty Networks", "Kajabi", "Skool", "Facebook Group", "Other"].map(p => (
                              <button key={p} onClick={() => setForm(prev => ({ ...prev, community: { ...prev.community, platform: p } }))} style={{ padding: "7px 16px", background: form.community?.platform === p ? `${T.coral}18` : T.card, border: `1px solid ${form.community?.platform === p ? T.coral : T.cardBorder}`, borderRadius: "6px", color: form.community?.platform === p ? T.text : T.textSecondary, fontSize: "15px", cursor: "pointer", ...LS, fontWeight: form.community?.platform === p ? "700" : "400" }}>{p}</button>
                            ))}
                          </div>
                          {form.community?.platform === "Other" && (
                            <input style={field()} placeholder="Enter platform name..." value={form.community?.customPlatform || ""} onChange={e => setForm(p => ({ ...p, community: { ...p.community, customPlatform: e.target.value } }))} />
                          )}
                        </div>
                      )}
                    </Field>
                  </Section>
                )}

                {tab === "voice" && (
                  <Section title="Voice DNA">
                    <Field label="Voice Traits"><textarea style={{ ...field(), minHeight: "70px", resize: "vertical" }} value={form.voice.traits} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, traits: e.target.value } }))} placeholder="Warm. Curious. Grounded. Direct." /></Field>
                    <Field label="Energy Level"><input style={field()} value={form.voice.energy} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, energy: e.target.value } }))} placeholder="e.g. 6/10" /></Field>
                    <Field label="Host Archetype"><input style={field()} value={form.voice.arch} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, arch: e.target.value } }))} placeholder="e.g. Guide + Mirror" /></Field>
                    <Field label="Episode Emotional Arc"><textarea style={{ ...field(), minHeight: "70px", resize: "vertical" }} value={form.voice.arc} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, arc: e.target.value } }))} placeholder="e.g. Curious → Seen → Understood → Inspired" /></Field>
                    <Field label="Signature Phrases (one per line)"><textarea style={{ ...field(), minHeight: "90px", resize: "vertical" }} value={form.voice.phrases} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, phrases: e.target.value } }))} placeholder={`"Your show's tagline"\n"Another signature phrase"`} /></Field>
                    <Field label="Language & Topics to USE"><textarea style={{ ...field(), minHeight: "80px", resize: "vertical" }} value={form.voice.use} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, use: e.target.value } }))} placeholder="Words, phrases, concepts that fit the show" /></Field>
                    <Field label="Language & Topics to AVOID"><textarea style={{ ...field(), minHeight: "80px", resize: "vertical" }} value={form.voice.avoid} onChange={e => setForm(p => ({ ...p, voice: { ...p.voice, avoid: e.target.value } }))} placeholder="Words, phrases, concepts to never use" /></Field>
                    <Field label="Content Rules"><textarea style={{ ...field(), minHeight: "80px", resize: "vertical" }} value={form.rules} onChange={e => setForm(p => ({ ...p, rules: e.target.value }))} placeholder="Any specific rules for content generation" /></Field>
                  </Section>
                )}

                {tab === "audience" && (
                  <Section title="Audience DNA">
                    <Field label="Listener Persona"><textarea style={{ ...field(), minHeight: "90px", resize: "vertical" }} value={form.aud.who} onChange={e => setForm(p => ({ ...p, aud: { ...p.aud, who: e.target.value } }))} placeholder="Name, age, job, situation. Who is your ideal listener?" /></Field>
                    <Field label="Pain Points (one per line)"><textarea style={{ ...field(), minHeight: "100px", resize: "vertical" }} value={form.aud.pains} onChange={e => setForm(p => ({ ...p, aud: { ...p.aud, pains: e.target.value } }))} placeholder={"I've tried everything and nothing works.\nI feel like it's my fault.\nNo one understands."} /></Field>
                    <Field label="Language They Use (search terms, phrases)"><textarea style={{ ...field(), minHeight: "80px", resize: "vertical" }} value={form.aud.lang} onChange={e => setForm(p => ({ ...p, aud: { ...p.aud, lang: e.target.value } }))} placeholder="how to stop / why can't I / I keep doing this" /></Field>
                  </Section>
                )}

                {tab === "platforms" && (
                  <Section title="Platforms">
                    <Field label="Platform Setup">
                      <PlatformEditor platforms={form.platforms} onChange={pl => setForm(p => ({ ...p, platforms: pl }))} />
                    </Field>
                  </Section>
                )}

                {tab === "content" && (
                  <Section title="Content Sections to Generate">
                    <div style={{ fontSize: "16px", color: T.textSecondary, marginBottom: "16px", ...GA, lineHeight: "1.6" }}>
                      Select which sections to generate for this show. These will be the default every time you run this show.
                    </div>
                    <SectionsChecklist sections={form.sections} onChange={s => setForm(p => ({ ...p, sections: s }))} />
                  </Section>
                )}

                {tab === "snnotes" && (
                  <Section title="Show Notes Builder">
                    <div style={{ fontSize: "16px", color: T.textSecondary, marginBottom: "16px", ...GA, lineHeight: "1.6" }}>
                      Toggle which elements to include in Show Notes, and drag to set their order. This structure is used every time content is generated for this show.
                    </div>
                    <SNBuilder elements={form.snElements} onChange={el => setForm(p => ({ ...p, snElements: el }))} />
                  </Section>
                )}

                {tab === "boilerplate" && (
                  <Section title="Boilerplate">
                    <div style={{ fontSize: "16px", color: T.textSecondary, marginBottom: "16px", ...GA, lineHeight: "1.6" }}>
                      This text is automatically appended to the end of Show Notes and YouTube descriptions every time — no label, no heading. Paste with formatting — bold, links, and line breaks are preserved.
                    </div>
                    <BoilerplateEditor value={form.bp} onChange={v => setForm(p => ({ ...p, bp: v }))} />
                  </Section>
                )}
              </div>

              {/* Save bar */}
              <div style={{ padding: "16px 24px", background: T.surface, borderTop: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
                <button onClick={handleSave} disabled={saving} style={{ padding: "12px 32px", background: T.coral, border: "none", borderRadius: "6px", color: "#fff", fontSize: "16px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", ...LS, letterSpacing: "2px", textTransform: "uppercase", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving..." : "Save Show →"}
                </button>
                {msg && <div style={{ fontSize: "16px", color: msg.startsWith("✓") ? "#52B788" : "#F09090", ...LS }}>{msg}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
