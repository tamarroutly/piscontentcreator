import { useState, useRef, useEffect } from "react";
import { loadShows, saveShow } from "./lib/shows";
import { supabase } from "./lib/supabase";
import { AdminPanel, AdminGate } from "./AdminPanel";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const T = {
  bg: "#1A1A1A", surface: "#242424", card: "#2C2C2C", cardBorder: "#3A3A3A",
  text: "#FFFFFF", textSecondary: "#E0E0E0", textMuted: "#999",
  coral: "#FF3131", coralSoft: "#FF313118", coralMid: "#FF313144", red: "#FF3131",
};

const MODES = [
  { id: "full", icon: "📦", label: "Full Content Package", desc: "Show notes, YouTube, social, newsletter, blog, quote cards" },
  { id: "clips", icon: "✂️", label: "Clips & Shorts", desc: "YouTube Shorts, Instagram Reels, Facebook Reels, TikTok scripts" },
  { id: "editor", icon: "🎬", label: "Editor Brief", desc: "Intro hook + social clip timestamps for your editor" },
];

function strip(t){if(!t)return "";const B=String.fromCharCode(96);const r1=new RegExp(B+"{3}[\\s\\S]*?"+B+"{3}","g");const r2=new RegExp(B+"([^"+B+"]+)"+B,"g");return t.replace(/^#{1,6}\s+/gm,"").replace(/\*\*\*(.*?)\*\*\*/g,"$1").replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1").replace(/__(.*?)__/g,"$1").replace(r1,"").replace(r2,"$1").replace(/^\s*[-*+]\s+/gm,"- ").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/^>\s+/gm,"").replace(/^---+$/gm,"").replace(/\n{3,}/g,"\n\n").trim();}
function parse(raw){const ps=[{id:"titles",r:[/SEO TITLE/i]},{id:"shownotes",r:[/SHOW NOTES/i]},{id:"spotify-creators",r:[/SPOTIFY FOR CREATORS/i]},{id:"editor-hooks",r:[/INTRO HOOK REC/i]},{id:"editor-clips",r:[/SOCIAL (MEDIA )?CLIP REC/i,/SOCIAL CLIP REC/i]},{id:"editor-notes",r:[/EDITOR NOTES/i]},{id:"youtube",r:[/YOUTUBE DESC/i]},{id:"social",r:[/SOCIAL MEDIA(?! CLIP)/i]},{id:"quotes",r:[/QUOTE CARDS/i,/PULL QUOTES/i]},{id:"guestkit",r:[/GUEST SHARE/i]},{id:"email",r:[/EMAIL NEWS/i,/^(?!.*(PATREON|CIRCLE|MIGHTY|KAJABI|SKOOL|FACEBOOK GROUP)).*NEWSLETTER/i]},{id:"blog",r:[/BLOG ART/i,/BLOG POST/i]},{id:"community-companion",r:[/COMPANION POST/i]},{id:"community-prompts",r:[/COMMUNITY FEED PROMPTS/i,/DISCUSSION PROMPTS/i]},{id:"community-polls",r:[/POLL IDEAS/i,/(?:PATREON|CIRCLE|MIGHTY|KAJABI|SKOOL|FACEBOOK) POLL/i]},{id:"community-starters",r:[/CONVERSATION STARTERS/i]},{id:"clips",r:[/^\d+\.\s*CLIPS/i,/^\d+\.\s*SHORTS/i,/^\d+\.\s*REELS/i]}];const c=strip(raw),lines=c.split("\n"),secs=[];let ti=null,id="intro",buf=[];for(const l of lines){let h=false;for(const p of ps){if(p.r.some(r=>r.test(l))){if(buf.length)secs.push({id,title:ti||"Overview",content:buf.join("\n").trim()});ti=l.replace(/^\d+\.\s*/,"").trim();id=p.id;buf=[];h=true;break;}}if(!h)buf.push(l);}if(buf.length)secs.push({id,title:ti||"Content",content:buf.join("\n").trim()});return secs.filter(s=>s.content.length>0);}

const SM={titles:{l:"SEO Titles",i:"🎯"},shownotes:{l:"Show Notes",i:"📝"},"spotify-creators":{l:"Spotify for Creators",i:"🎵"},youtube:{l:"YouTube",i:"▶️"},"editor-hooks":{l:"Intro Hook Recommendations",i:"🎬"},"editor-clips":{l:"Social Clip Recommendations",i:"✂️"},"editor-notes":{l:"Editor Notes",i:"📋"},social:{l:"Social Media",i:"📱"},quotes:{l:"Quotes",i:"💬"},guestkit:{l:"Guest Kit",i:"🎁"},email:{l:"Newsletter",i:"📧"},blog:{l:"Blog",i:"📰"},"patreon-companion":{l:"Patreon Companion Post",i:"📝"},"patreon-discussion":{l:"Patreon Discussion Prompts",i:"💬"},"patreon-poll":{l:"Patreon Poll",i:"📊"},"patreon-newsletter":{l:"Patreon Newsletter",i:"📧"},"community-companion":{l:"Community Companion Post",i:"📝"},"community-prompts":{l:"Community Feed Prompts",i:"💬"},"community-polls":{l:"Community Polls",i:"📊"},"community-starters":{l:"Conversation Starters",i:"✨"},clips:{l:"Clips & Shorts",i:"✂️"},intro:{l:"Overview",i:"📋"}};
const ED=[{id:"titles",l:"SEO Titles"},{id:"shownotes",l:"Show Notes"},{id:"youtube",l:"YouTube"},{id:"social",l:"Social Media"},{id:"guestkit",l:"Guest Kit",g:true},{id:"email",l:"Newsletter"},{id:"blog",l:"Blog"},{id:"quotes",l:"Quotes"},{id:"patreon-companion",l:"Patreon Companion Post",pm:true},{id:"patreon-discussion",l:"Patreon Discussion Prompts",pm:true},{id:"patreon-poll",l:"Patreon Poll",pm:true},{id:"patreon-newsletter",l:"Patreon Newsletter",pm:true},{id:"clips",l:"Clips & Shorts",cm:true}];

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<h[1-6][^>]*>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSNTemplate(snElements) {
  if (!snElements) return "";
  const enabled = snElements.filter(e => e.enabled);
  return enabled.map(e => {
    switch(e.id) {
      case "hook":        return "[HOOK QUESTION: Recognition-based. Under 15 words. Starts immediately — no preamble.]";
      case "description": return "\n[EPISODE DESCRIPTION: 2-3 sentences, third person. Open with insight or emotional truth.]";
      case "takeaways":   return "\nKEY TAKEAWAYS\n- [Takeaway 1]\n- [Takeaway 2]\n- [Takeaway 3]";
      case "quote":       return "\nNOTABLE QUOTE\n\"[Exact quote from transcript]\" — [Speaker]";
      case "guest_bio":   return "\nGUEST BIO\n[2-3 sentences about the guest, third person. Guest episodes only — omit for solo.]";
      case "resources":   return "\nLINKS & RESOURCES\n[Episode-specific resources mentioned in this episode only — books, tools, studies. Omit entirely if none mentioned.]";
      case "timestamps":  return (e.scope === "both") ? "\nTIMESTAMPS\n00:00 — Introduction\n[MM:SS] — [Topic]" : "";
      case "boilerplate": return "\n[BOILERPLATE — copy exactly as configured]";
      case "disclaimer":  return e.text ? "\nDISCLAIMER\n" + e.text : "";
      case "custom_instructions": {
        const header = e.header || "CUSTOM SECTION";
        const instructions = e.text || "Generate a custom section based on the transcript.";
        return "\n" + header.toUpperCase() + "\n[" + instructions + "]";
      }
      default: return "";
    }
  }).join("\n");
}

function getTimestampsScope(snElements) {
  if (!snElements) return "youtube";
  const ts = snElements.find(e => e.id === "timestamps");
  return ts?.enabled ? (ts.scope || "youtube") : "none";
}

function hasBoilerplate(snElements) {
  if (!snElements) return true; // default on
  const bp = snElements.find(e => e.id === "boilerplate");
  return bp ? bp.enabled : true;
}

function buildSections(show, g, snTemplate) {
  const p = show.platforms || {};
  const podcast  = p.podcast  || [];
  const social   = p.social   || [];
  const community= p.community|| [];
  const email    = p.email    || [];
  const blog     = p.blog     || [];
  const extras   = p.extras   || [];

  let out = ""; let n = 1;

  // SHOW NOTES — always generated
  out += `${n++}. SHOW NOTES\n${snTemplate || ""}\n\n[BOILERPLATE]\n---\n`;

  // SPOTIFY FOR CREATORS — after show notes, before YouTube
  if (podcast.includes("Spotify for Creators")) {
    out += `${n++}. SPOTIFY FOR CREATORS
Generate interactive engagement content for the Spotify for Creators episode upload. Format exactly as follows:

QUESTIONS FOR LISTENERS (write 3 questions)
Question 1: [A thought-provoking open-ended question directly tied to this episode's main topic — something listeners will want to answer]
Question 2: [A personal reflection question — "Have you ever..." or "What's your experience with..."]
Question 3: [A forward-looking or action question — "What will you try..." or "What's one thing you're taking away..."]

POLL 1
[Poll question tied to a key episode insight]
Option A: [answer]
Option B: [answer]
Option C: [answer]
Option D: [answer]

POLL 2
[Poll question about listener experience or belief related to episode topic]
Option A: [answer]
Option B: [answer]
Option C: [answer]
Option D: [answer]

POLL 3
[Poll question about what listeners want to hear more of or what they'll do next]
Option A: [answer]
Option B: [answer]
Option C: [answer]
Option D: [answer]
---
`;
  }

  // YOUTUBE — if in social platforms, gets full YouTube treatment
  if (social.includes("YouTube")) {
    out += `${n++}. YOUTUBE DESCRIPTION\n[HOOK — 1 sentence]\n\n[SUMMARY: 2-3 sentences optimized for YouTube search]\n\nTIMESTAMPS\n00:00 — Introduction\n[MM:SS] — [Topic]\n[MM:SS] — [Topic]\n[MM:SS] — [Topic]\n[MM:SS] — [Topic]\n[Add all major topics with timestamps from the transcript]\n\n[BOILERPLATE]\n\nHASHTAGS\n[8-12 hashtags with # symbol]\n\nKEYWORDS\n[8-12 comma-separated SEO keywords]\n---\n`;
  }

  // SOCIAL MEDIA posts — one per selected platform (except YouTube handled above)
  const socialPosts = social.filter(s => s !== "YouTube");
  if (socialPosts.length > 0) {
    out += `${n++}. SOCIAL MEDIA\n`;
    out += `Generate a paste-ready post for EACH platform listed below. Each post must be formatted EXACTLY as it would appear when posted — with line breaks, spacing, emojis, and hashtags in the right places. Write it so someone can copy and paste it directly with zero editing needed.\n\n`;
    out += `Use this format for each:\n[PLATFORM NAME] POST:\n[post — formatted exactly as it would appear on that platform]\n\n`;
    out += `PLATFORM-SPECIFIC FORMAT RULES:\n`;
    if (socialPosts.includes("Instagram")) out += `INSTAGRAM: Start with a hook line (no hashtags yet). Leave a blank line. Write 3-5 short paragraphs — punchy, personal, conversational. End with a question or CTA. Leave TWO blank lines. Then ALL hashtags together on one line (20-25 tags). Use emojis naturally throughout — not forced, but where they add energy or emphasis.\n`;
    if (socialPosts.includes("Facebook")) out += `FACEBOOK: Start with a hook or bold opening statement. 2-3 paragraphs, warm and conversational like you're talking to a friend. Can be longer than Instagram. End with a question to spark comments. No hashtags needed, but 2-3 relevant ones are fine. Emojis optional but sparingly.\n`;
    if (socialPosts.includes("TikTok")) out += `TIKTOK: First line is the HOOK — must stop the scroll. Then 2-3 very short punchy lines. End with a CTA ("Link in bio" or "New episode out now"). 3-5 hashtags max. Use emojis to add energy. Total post under 150 chars ideally.\n`;
    if (socialPosts.includes("LinkedIn")) out += `LINKEDIN: Open with a bold insight or contrarian statement — no fluff. Short punchy sentences. Use line breaks after every 1-2 sentences for readability. 3-5 paragraphs. End with a thought-provoking question or call to action. 3-5 relevant hashtags at the end. Professional but human — no corporate-speak.\n`;
    if (socialPosts.includes("X (Twitter)")) out += `X (TWITTER): Under 280 characters. One punchy statement or a quote from the episode. Optionally end with "🎧 Episode [number] out now" or similar. Max 2 hashtags. No fluff.\n`;
    if (socialPosts.includes("Pinterest")) out += `PINTEREST: Write as a pin description. Benefit-driven opening. 2-3 sentences. Include keywords naturally. End with what they'll learn or get from listening. No hashtags.\n`;
    if (socialPosts.includes("Threads")) out += `THREADS: Conversational and casual — like texting a friend. 2-4 short paragraphs with line breaks. Can ask a question or share a hot take. No hashtags. Emojis are fine but don't overdo it.\n`;
    if (socialPosts.includes("Reddit")) out += `REDDIT: Write like a real person posting in a relevant subreddit — no marketing language, no hashtags, no emojis. Lead with genuine value or an interesting insight. Can be longer. End with an open question to spark discussion.\n`;
    if (socialPosts.includes("Apple Podcasts")) out += `APPLE PODCASTS: 2-3 sentences max. Plain and descriptive. What will the listener learn or feel? No hashtags, no emojis.\n`;
    if (socialPosts.includes("Spotify")) out += `SPOTIFY: 2-3 casual sentences. Conversational. What makes this episode worth their time? No hashtags.\n`;
    out += `---\n`;
  }

  // COMMUNITY content
  if (community.length > 0) {
    const name = community[0];
    out += `${n++}. ${name.toUpperCase()} COMPANION POST
Write a 300-500 word behind-the-scenes companion post for ${name} members. Exclusive insider content going deeper than the episode. Warm, personal, direct address. End with an engagement question.
---
`;
    out += `${n++}. ${name.toUpperCase()} COMMUNITY FEED PROMPTS
Write 3 community feed prompts based on specific moments from this episode. Each prompt:
- Bold title (e.g. "The Trust Question")
- Genuine question the community will want to answer
- Emoji answer options where appropriate (e.g. 🅰️ 🅱️ 🅲️ 🅳️)
- 1-2 sentences tying to the episode
Format: Prompt [#] — [Title] / [Question] / [Options] / [Episode tie-in]
---
`;
    out += `${n++}. ${name.toUpperCase()} POLL IDEAS
Write 3 polls based on episode topics. Each poll:
- Direct question with colored circle emoji options: 🔴 🟡 🟢 ⚪
- 1-sentence episode tie-in
Format: Poll [#] — [Topic] / [Question] / 🔴 [A] / 🟡 [B] / 🟢 [C] / ⚪ [D] / [tie-in]
---
`;
    out += `${n++}. CONVERSATION STARTERS
Write 4 short punchy posts for Stories, X, or short-form. Hook-first, 1-3 sentences, include episode quotes where powerful, end with CTA. Number them Starter 1-4.
---
`;
  }

  // EMAIL NEWSLETTER
  if (email.includes("Newsletter")) {
    out += `${n++}. EMAIL NEWSLETTER\n[SUBJECT LINE]\n[PREVIEW TEXT]\n\n[Body: hook, 3-4 key insights from episode, CTA to listen]\n\nFREQUENTLY ASKED QUESTIONS\n[3-5 FAQs based on the episode topic with concise answers]\n---\n`;
  }

  // BLOG
  if (blog.includes("Blog Article")) {
    out += `${n++}. BLOG ARTICLE\n[800-1500 words. SEO-optimized headline. Hook → sections with subheadings → CTA. Include meta description at end.]\n\nFAQ SCHEMA\n[5 FAQs for structured data markup]\n---\n`;
  }

  // QUOTE CARDS
  if (extras.includes("Quote Cards")) {
    out += `${n++}. QUOTE CARDS\n[5 quotes under 25 words each, numbered. Pull exact quotes from transcript where possible.]\n---\n`;
  }

  // GUEST KIT
  if (g && extras.includes("Guest Kit")) {
    out += `${n++}. GUEST SHARE KIT\n[Thank you note from host, episode blurb for guest to share, 2-3 suggested social captions pre-written for guest]\n---\n`;
  }

  return out;
}


function sys(show, k, g, ep, mode, extras=[], clipCount=5) {
  const d = show; if (!d) return "";
  const ap = [...(d.platforms?.p||[]),...(d.platforms?.s||[])];
  const bp = stripHtml(d.bp||"");
  const urls = (bp.match(/https?:\/\/[^\s,)]+|www\.[^\s,)]+/g)||[]);
  const voice = d.voice||{}; const aud = d.aud||{}; const tpl = d.tpl||{};
  const base = `You are the content strategist for ${d.name}.\n\nOUTPUT FORMAT:\n- PLAIN TEXT only. Zero markdown. No asterisks. No bold. No italic.\n- ALL section headers and sub-headers must be in ALL CAPS — every single one, no exceptions\n- This includes: KEY TAKEAWAYS, NOTABLE QUOTE, GUEST BIO, LINKS & RESOURCES, TIMESTAMPS, HASHTAGS, KEYWORDS, SUBJECT LINE, PREVIEW TEXT, and any other label\n- Separate major sections with ---\n- Bullets use - (hyphen space)\n\nCRITICAL RULES:\n1. SEO TITLES: Write the title ONLY. Do NOT add the podcast name, a dash, episode number, or any other text after the title.\n2. SHOW NOTES: The very first thing after the SHOW NOTES header must be the hook question. No podcast name, no episode info, no intro text.\n3. BULLETS: KEY TAKEAWAYS must be 3-7 bullet points, each on its own line starting with - (hyphen space). Never write takeaways as a paragraph.\n4. HEADERS: Never use Title Case for any header or label. ALL CAPS only. "Links & Resources" must be written as "LINKS & RESOURCES".\n\nShow: ${d.name} | "${d.tag}" | Host(s): ${d.hosts}\n${g?"GUEST episode — include Guest Share Kit.":"SOLO episode — skip Guest Share Kit."}${ep?` | Episode ${ep}`:""}\n\nVOICE: ${voice.traits||""} | Energy: ${voice.energy||""} | ${voice.arch||""}\nArc: ${voice.arc||""}\nPhrases: ${(voice.phrases||[]).join(" | ")}\nUSE: ${voice.use||""}\nAVOID: ${voice.avoid||""}\n\nAUDIENCE: ${aud.who||""}\nPain: ${(aud.pains||[]).join(" | ")}\nLanguage: ${aud.lang||""}\n\nPLATFORMS: ${[...ap,...extras].join(", ")} | HASHTAGS: ${d.tags||""}\n${extras.length>0?`ADDITIONAL PLATFORMS THIS EPISODE: ${extras.join(", ")} -- generate a dedicated social post for each additional platform listed.`:""}\n\n${hasBoilerplate(d.snElements) ? `BOILERPLATE (copy exactly, no header, no label before it):\\n${bp}\\n\\nURLs — include exactly:\\n${urls.map(u=>`  • ${u}`).join("\\n")}` : "No boilerplate."}\\n\\nTIMESTAMPS RULE: Always include timestamps in the YouTube description — generate them from the transcript. ${getTimestampsScope(d.snElements) === "both" ? "Also include timestamps in show notes." : "Do NOT include timestamps in show notes unless the show notes template specifically includes them."}\\n\\nRULES:\n${d.rules||""}\n\n`;
  if(mode==="clips"){return base;}
  if(mode==="editor"){
    return base + `
You are analyzing this episode transcript to create an EDITOR BRIEF for a professional podcast editor.

SHOW DNA CONTEXT:
Target audience: ${d.aud?.who||""}
Audience pain points: ${(d.aud?.pains||[]).join(", ")}
Show voice: ${d.voice?.traits||""}
What resonates with this audience: ${d.voice?.use||""}

Your job is to find the single best intro hook and the best social clips based on what will land with THIS specific audience.

Generate the following:

---

INTRO HOOK RECOMMENDATIONS

Find the 3 best moments from the transcript to use as a podcast intro hook (spliced in before theme music). These should be 30-90 seconds when spoken. Rank them 1-3 with #1 being your top recommendation.

For each hook, provide:

HOOK #[N] — [RECOMMENDED / ALTERNATE 1 / ALTERNATE 2]
TIMESTAMP: [approximate time in transcript — e.g. "~14:30" or "around the 22-minute mark"]
DURATION: [estimated clip length e.g. "~45 seconds"]
QUOTE: [the exact words from the transcript where this moment starts and ends — copy verbatim]
WHY THIS WORKS: [2-3 sentences — specifically why this moment will hook THIS show's audience based on their pain points and what they care about]
AUDIENCE TRIGGER: [the specific emotional hook — e.g. "Relief — listener feels finally understood", "Curiosity — raises a question they've always had", "Validation — confirms what they suspected"]

---

SOCIAL CLIP RECOMMENDATIONS

Find exactly ${clipCount} moments that would make high-performing social media clips (60-90 seconds ideal, up to 3 minutes max). Focus on moments that are self-contained, emotionally resonant, and don't require context from the rest of the episode.

For each clip:

CLIP #[N]
TIMESTAMP: [approximate start and end time]
DURATION: [estimated length]
BEST PLATFORM: [Instagram Reels / TikTok / YouTube Shorts / LinkedIn — pick the ONE best fit and explain why]
QUOTE: [exact words where clip starts and ends]
WHY IT PERFORMS: [why this specific moment will stop the scroll — what's the hook, the tension, the payoff]
SUGGESTED CAPTION HOOK: [one punchy first line for the social caption]

---

EDITOR NOTES
[Any additional notes for the editor — transitions, moments to watch for, audio quality flags if apparent from transcript, suggested music mood, etc.]
`;
  }
  const snTpl = buildSNTemplate(d.snElements);
  const sections = buildSections(d, g, snTpl);
  return base+`Generate the COMPLETE content package in plain text. Use ONLY the sections listed below.

1. SEO TITLE OPTIONS
[5 numbered titles. Titles ONLY — no podcast name. Mark RECOMMENDED.]
---
${sections}`;
}

function revSys(show){const d=show;if(!d)return "";return `Content strategist for ${d.name}. PLAIN TEXT only. ALL CAPS headers. - bullets.\nVoice: ${d.voice?.traits||""} | Phrases: ${(d.voice?.phrases||[]).join(" | ")}\nUSE: ${d.voice?.use||""} | AVOID: ${d.voice?.avoid||""}\nBoilerplate: ${d.bp||""}\nOnly revise the requested section.`;}

function linkifyLine(line){return line.replace(/(https?:\/\/[^\s,)"]+|www\.[^\s,)"]+|[a-zA-Z0-9][a-zA-Z0-9\-]*\.(?:com|org|net|io|co)(?:\/[^\s,)"]*)?)/g,url=>{const href=url.startsWith("http")?url:"https://"+url;return`<a href="${href}" style="color:#FF3131">${url}</a>`;});}

const TOP_SECTIONS=/^(\d+\.\s*)?(SEO TITLE|SHOW NOTES|SPOTIFY FOR CREATORS|INTRO HOOK|SOCIAL CLIP|EDITOR NOTES|YOUTUBE DESC|SOCIAL MEDIA|QUOTE CARDS|GUEST SHARE|EMAIL NEWS|NEWSLETTER|BLOG (ARTICLE|POST)|PATREON (COMPANION|DISCUSSION|POLL|EXCLUSIVE|POSTS|NEWSLETTER)|CLIPS|SHORTS|REELS)/i;
const SUB_HEADERS=/^(KEY TAKEAWAYS|NOTABLE QUOTE|TIMESTAMPS|HASHTAGS|KEYWORDS|INSTAGRAM|FACEBOOK|TIKTOK|LINKEDIN|X \(TWITTER\)|QUOTE CARDS|THANK YOU|EPISODE BLURB|SUGGESTED SOCIAL|SUBJECT LINE|PREVIEW TEXT|SOBER SHOT|ELLEVATED ACHIEVERS TAKEAWAY|IN THIS EPISODE|LINKS & RESOURCES|NOTABLE RESOURCES|CONNECT WITH|ABOUT|MUSIC CREDITS|DISCLAIMER)/i;

function dlDoc(content,filename){
  const h=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.6;color:#111;margin:1.25in}
h1{font-size:16pt;font-weight:bold;color:#111;margin-top:0;margin-bottom:4pt;font-family:"Times New Roman",serif}
.meta{font-size:10pt;color:#888;margin-bottom:20pt;font-family:"Times New Roman",serif}
.sec{font-size:14pt;font-weight:bold;color:#111;margin-top:20pt;margin-bottom:6pt;text-transform:uppercase;font-family:"Times New Roman",serif}
.sub{font-size:12pt;font-weight:bold;color:#111;margin-top:12pt;margin-bottom:4pt;font-family:"Times New Roman",serif}
p{margin:3pt 0;font-size:12pt}
a{color:#111}
li{margin:3pt 0;font-size:12pt}
</style></head>
<body>
<h1>${filename}</h1>
<div class="meta">Podcast Impact Studio · Content Creator</div>
${content.split("\n").map(l=>{
  const t=l.trim();
  if(!t)return"<p>&nbsp;</p>";
  if(t==="---")return"";
  if(TOP_SECTIONS.test(t))return`<div class="sec">${t}</div>`;
  if(SUB_HEADERS.test(t)&&t.split(/\s+/).length<=6)return`<div class="sub">${t}</div>`;
  if(/^[-•]\s/.test(t))return`<li>${linkifyLine(t.replace(/^[-•]\s/,""))}</li>`;
  return`<p>${linkifyLine(l)}</p>`;
}).join("\n")}
</body></html>`;
  const b=new Blob([h],{type:"application/msword"});
  const u=URL.createObjectURL(b);
  const a=document.createElement("a");
  a.href=u;a.download=`${filename}.doc`;
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(u);
}

function textToHtml(text){
  // Convert plain text with URLs to HTML with clickable links and bold headers
  const lines = text.split("\n");
  const htmlLines = lines.map(line => {
    const t = line.trim();
    if (!t) return "<br>";
    // Section headers (ALL CAPS lines) -> bold red
    if (/^(\d+\.\s*)?(SEO TITLE|SHOW NOTES|SPOTIFY FOR CREATORS|YOUTUBE DESC|SOCIAL MEDIA|QUOTE CARDS|GUEST SHARE|EMAIL NEWS|NEWSLETTER|BLOG|PATREON|CLIPS|TIMESTAMPS|HASHTAGS|KEYWORDS)/i.test(t)) {
      return `<p><strong style="color:#CC0000;text-transform:uppercase;">${t}</strong></p>`;
    }
    // Sub headers (KEY TAKEAWAYS, NOTABLE QUOTE etc) -> bold
    if (/^(KEY TAKEAWAYS|NOTABLE QUOTE|GUEST BIO|CONNECT WITH|SUBJECT LINE|TIMESTAMPS|HASHTAGS|KEYWORDS)/i.test(t)) {
      return `<p><strong>${t}</strong></p>`;
    }
    // Separator
    if (t === "---") return "<hr>";
    // Linkify URLs
    const linked = line.replace(/(https?:\/\/[^\s,)"]+|www\.[^\s,)"]+)/g, url => {
      const href = url.startsWith("http") ? url : "https://" + url;
      return `<a href="${href}">${url}</a>`;
    });
    // Bullets
    if (/^[-•]\s/.test(t)) return `<p>• ${linked.replace(/^[-•]\s/,"")}</p>`;
    return `<p>${linked}</p>`;
  });
  return htmlLines.join("\n");
}

function copyText(text){
  const html = textToHtml(text);
  if(navigator.clipboard && window.ClipboardItem){
    const blob = new Blob([html], {type:"text/html"});
    const plainBlob = new Blob([text], {type:"text/plain"});
    navigator.clipboard.write([new ClipboardItem({"text/html":blob,"text/plain":plainBlob})]).catch(()=>fallbackCopy(text));
    return;
  }
  fallbackCopy(text);
}
function fallbackCopy(text){
  const el=document.createElement("div");
  el.contentEditable="true";
  el.style.cssText="position:fixed;left:-9999px;top:-9999px;opacity:0;white-space:pre";
  el.innerText=text;
  document.body.appendChild(el);
  const sel=window.getSelection();sel.removeAllRanges();
  const range=document.createRange();range.selectNodeContents(el);sel.addRange(range);
  try{document.execCommand("copy");}catch(e){}
  sel.removeAllRanges();document.body.removeChild(el);
}

function Cp({text}){const[ok,setOk]=useState(false);return <button onClick={()=>{copyText(text);setOk(true);setTimeout(()=>setOk(false),1800);}} style={{padding:"5px 14px",background:ok?T.coralSoft:"transparent",border:`1px solid ${ok?T.coralMid:T.cardBorder}`,borderRadius:"6px",color:ok?T.coral:T.textMuted,fontSize:"12px",cursor:"pointer",fontFamily:"'League Spartan',sans-serif",transition:"all .25s",whiteSpace:"nowrap",letterSpacing:"1px"}}>{ok?"✓ COPIED":"COPY"}</button>;}

function isTopSection(line){const t=line.trim();return /^(\d+\.\s*)?(SEO TITLE|SHOW NOTES|SPOTIFY FOR CREATORS|INTRO HOOK|SOCIAL CLIP|EDITOR NOTES|YOUTUBE DESC|SOCIAL MEDIA|QUOTE CARDS|GUEST SHARE|EMAIL NEWS|NEWSLETTER|BLOG (ARTICLE|POST)|PATREON|CLIPS|SHORTS|REELS)/i.test(t);}
function isSubHeader(line){const t=line.trim();if(!t||t.length<3)return false;if(/^[-\u2022*\d"(@]/.test(t))return false;if(isTopSection(line))return false;if(t.split(/\s+/).length>8)return false;const allCaps=/^[A-Z][A-Z\s&()\u00ae\u2122\/\-:\.]+$/.test(t)&&t.length>3;const titleCase=/^[A-Z][a-zA-Z]*(\s(&|[A-Z][a-zA-Z]*))*:?$/.test(t)&&t.length>3&&t.split(/\s+/).length<=6;return allCaps||titleCase;}

function renderContent(text){
  const urlRegex=/(https?:\/\/[^\s,)"]+|www\.[^\s,)"]+|[a-zA-Z0-9][a-zA-Z0-9\-]*\.(?:com|org|net|io|co)(?:\/[^\s,)"]*)?)/g;
  const linkify=(line)=>line.split(urlRegex).map((part,i)=>{if(urlRegex.test(part)){urlRegex.lastIndex=0;const href=part.startsWith("http")?part:`https://${part}`;return <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{color:T.coral,textDecoration:"underline",wordBreak:"break-all"}}>{part}</a>;}return <span key={i}>{part}</span>;});
  return text.split("\n").map((line,li)=>{
    const t=line.trim();
    const isTop=isTopSection(line);
    const isSub=!isTop&&isSubHeader(line);
    const isBullet=/^[-\u2022]\s/.test(t);
    const isEmpty=!t;
    if(isEmpty)return <div key={li} style={{height:"6px"}}/>;
    if(isTop)return <div key={li} style={{fontWeight:"700",fontSize:"14px",letterSpacing:"2px",textTransform:"uppercase",color:T.coral,marginTop:"18px",marginBottom:"4px",fontFamily:"'League Spartan',sans-serif"}}>{linkify(line)}</div>;
    if(isSub)return <div key={li} style={{fontWeight:"700",fontSize:"13px",color:T.text,marginTop:"14px",marginBottom:"4px",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>{linkify(line)}</div>;
    if(isBullet){const content=t.replace(/^[-\u2022]\s/,"");return <div key={li} style={{display:"flex",gap:"10px",fontSize:"16px",color:T.textSecondary,fontFamily:"'EB Garamond',Georgia,serif",lineHeight:"2.0",marginBottom:"5px"}}><span style={{color:T.textMuted,flexShrink:0,marginTop:"2px"}}>•</span><span>{linkify(content)}</span></div>;}
    return <div key={li} style={{fontSize:"16px",color:T.textSecondary,fontFamily:"'EB Garamond',Georgia,serif",lineHeight:"2.0",marginBottom:"5px"}}>{linkify(line)}</div>;
  });
}

function Sec({s,clr}){const m=SM[s.id]||SM.intro;
  return <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:"10px",marginBottom:"10px",overflow:"hidden"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 20px",borderBottom:`1px solid ${T.cardBorder}`,background:T.surface}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
        <span style={{fontSize:"14px"}}>{m.i}</span>
        <span style={{fontSize:"14px",letterSpacing:"2px",textTransform:"uppercase",color:clr||T.coral,fontWeight:"700",fontFamily:"'League Spartan',sans-serif"}}>{m.l}</span>
      </div>
      <Cp text={s.content}/>
    </div>
    <div style={{padding:"20px 24px"}}>{renderContent(s.content)}</div>
  </div>;
}


// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const[shows,setShows]=useState({});
  const[loadingShows,setLoadingShows]=useState(true);
  const[step,setStep]=useState("select");
  const[show,setShow]=useState(null);
  const[mode,setMode]=useState(null);
  const[guest,setGuest]=useState(null);
  const[ep,setEp]=useState("");
  const[tx,setTx]=useState("");
  const[raw,setRaw]=useState("");
  const[secs,setSecs]=useState([]);
  const[err,setErr]=useState("");
  const[busy,setBusy]=useState(false);
  const[editing,setEditing]=useState(false);
  const[eSec,setESec]=useState(null);
  const[eTxt,setETxt]=useState("");
  const[rev,setRev]=useState(false);
  const[cpAll,setCpAll]=useState(false);
  const[dlOk,setDlOk]=useState(false);
  const[dragging,setDragging]=useState(false);
  const[extraPlatforms,setExtraPlatforms]=useState([]);
  const[clipCount,setClipCount]=useState(3);
  const[editorClipCount,setEditorClipCount]=useState(5);
  const[descriptProjectId,setDescriptProjectId]=useState("");
  const[descriptApiKey,setDescriptApiKey]=useState("");

  useEffect(()=>{
    async function loadGlobalSettings(){
      try{
        const {data}=await supabase.from("settings").select("value").eq("key","global").single();
        if(data?.value?.descriptApiKey) setDescriptApiKey(data.value.descriptApiKey);
      }catch{}
    }
    loadGlobalSettings();
  },[]);
  const[descriptStatus,setDescriptStatus]=useState("");
  const[descriptSending,setDescriptSending]=useState(false);
  const[clipTexts,setClipTexts]=useState(Array(10).fill(""));
  const[clipResults,setClipResults]=useState([]);
  const[clipPlatforms,setClipPlatforms]=useState(["YouTube"]);
  const[showAdmin,setShowAdmin]=useState(false);
  const[showAdminGate,setShowAdminGate]=useState(false);
  const fileRef=useRef(null);

  const d=show?shows[show]:null;
  const clr=d?.clr||T.coral;
  const ci={select:0,mode:1,configure:2,"clips-setup":3,input:3,generating:3,result:3}[step]||0;

  useEffect(()=>{loadShows().then(s=>{setShows(s);setLoadingShows(false);});},[]);
  async function refreshShows(){const s=await loadShows();setShows(s);}
  async function readFile(file){const name=file.name.toLowerCase();if(name.endsWith(".txt")||name.endsWith(".md")){const text=await file.text();setTx(text);setErr("");}else{setErr("Unsupported file type. Use .txt");}}
  function handleDrop(e){e.preventDefault();setDragging(false);const f=e.dataTransfer?.files?.[0];if(f)readFile(f);}
  function handleFileInput(e){const f=e.target?.files?.[0];if(f)readFile(f);}

  async function genClips(){
    if(clipTexts.slice(0,clipCount).every(t=>!t.trim())){setErr("Paste at least one clip transcript.");return;}
    setErr("");setClipResults([]);setBusy(true);setStep("generating");
    const results=[];const platList=clipPlatforms.join(", ");
    for(let i=0;i<clipCount;i++){
      const clipTx=clipTexts[i].trim();
      if(!clipTx){results.push({index:i+1,skipped:true,content:{}});continue;}
      try{
        const clipSys=`You are creating social media clip content for ${d.name}.

CRITICAL OUTPUT RULES:
- PLAIN TEXT only. No markdown, no asterisks, no bold.
- Hashtags: put the # symbol directly before EACH word. Example: #CancerRisk #Firefighters #ToxicSmoke
- Title: write ONLY the title text — no "SEO Title:" or "Title:" label before it
- Description: write ONLY the description text — no "Description:" label before it
- Never write label words like "Title:", "Description:", "Hashtags:", "Caption:"
- Section headers in ALL CAPS only

Show Voice: ${d.voice?.traits||""}
Tone: ${d.tag}
Platforms: ${platList}

Generate content for EACH platform below using EXACTLY this format — no extra labels:
${clipPlatforms.includes("YouTube")?`YOUTUBE CLIP ${i+1}
[title only — punchy, keyword-rich, under 60 chars, no show name]
[description only — 2-3 sentences optimized for YouTube search]
[hashtags only — 8-12 tags each starting with #, space separated]
KEYWORDS
[8-12 comma-separated keywords]`:""}
${clipPlatforms.includes("Instagram")?`INSTAGRAM REEL ${i+1}
[caption — hook in first line, 100-150 words, end with CTA]
[hashtags — 15-20 tags each starting with #, space separated]`:""}
${clipPlatforms.includes("Facebook")?`FACEBOOK REEL ${i+1}
[post — hook line, 80-120 words, CTA at end]`:""}
${clipPlatforms.includes("TikTok")?`TIKTOK ${i+1}
[caption — hook first, under 150 chars, include hashtags with # symbol]`:""}
${clipPlatforms.includes("Spotify")?`SPOTIFY CLIP ${i+1}
[title only]
[description — 1-2 sentences]`:""}

Write ONLY the sections above. No labels, no commentary, no extra text.`;
        // Add delay between clips to avoid rate limiting
        if(i>0) await new Promise(res=>setTimeout(res,2000));
        let r, clipAttempt=0;
        while(clipAttempt<3){
          r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,system:clipSys,messages:[{role:"user",content:`CLIP ${i+1} TRANSCRIPT:\n${clipTx.substring(0,8000)}`}]})});
          if((r.status===529||r.status===503)&&clipAttempt<2){clipAttempt++;await new Promise(res=>setTimeout(res,4000*clipAttempt));continue;}
          break;
        }
        if(!r.ok){const et=await r.text();throw new Error(`API error (${r.status}): ${et.substring(0,100)}`);}
        const j=await r.json();const t=j.content?.filter(b=>b.type==="text").map(b=>b.text).join("\n")||"";
        results.push({index:i+1,skipped:false,content:t});
      }catch(e){results.push({index:i+1,skipped:false,content:`Error: ${e.message}`});}
    }
    setClipResults(results);setBusy(false);setStep("result");
  }

  async function gen(){
    if(!tx.trim()){setErr("Paste the transcript.");return;}
    setErr("");setBusy(true);setRaw("");setSecs([]);setStep("generating");
    try{
      let r,attempt=0;
      while(attempt<3){
        r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:mode==="editor"?4000:8000,system:sys(d,show,guest,ep,mode,extraPlatforms,editorClipCount),messages:[{role:"user",content:mode==="editor"?`Analyze this transcript carefully and generate the Editor Brief as instructed.\n\nTRANSCRIPT:\n${tx.substring(0,90000)}`:`Generate the COMPLETE content package in plain text.\n\nTRANSCRIPT:\n${tx.substring(0,90000)}`}]})});
        if((r.status===529||r.status===503)&&attempt<2){attempt++;await new Promise(res=>setTimeout(res,4000*attempt));continue;}
        if(r.status===529||r.status===503){setErr("⏳ Anthropic is overloaded right now. Wait 30 seconds and try again.");setStep("input");setBusy(false);return;}
        break;
      }
      if(!r.ok){const et=await r.text();setErr(`API error (${r.status}): ${et.substring(0,200)}`);setStep("input");return;}
      const j=await r.json();
      if(j.error){setErr(j.error.message);setStep("input");}
      else{const t=j.content?.filter(i=>i.type==="text").map(i=>i.text).join("\n")||"";if(!t.trim()){setErr("No content generated. Please try again.");setStep("input");return;}setRaw(strip(t));const parsed=parse(t);setSecs(parsed.length?parsed:[{id:"full",title:"Content Package",content:strip(t)}]);setStep("result");}
    }catch(e){setErr(e.message||"Network error.");setStep("input");}
    finally{setBusy(false);}
  }

  async function doRev(){
    if(!eSec||!eTxt.trim())return;setRev(true);setErr("");
    const label=ED.find(s=>s.id===eSec)?.l||eSec;
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,system:revSys(d),messages:[{role:"user",content:`Current:\n\n${raw}\n\n---\n\nRevise "${label}":\n${eTxt}\n\nPlain text only. Only the revised section.`}]})});
      const j=await r.json();
      if(j.error)setErr(j.error.message);
      else{const v=strip(j.content.filter(i=>i.type==="text").map(i=>i.text).join("\n"));setRaw(p=>p+`\n\n${"═".repeat(40)}\nREVISION — ${label.toUpperCase()}\n${"═".repeat(40)}\n\n${v}`);setSecs(p=>[...p,{id:eSec+"-rev",title:`Revision — ${label}`,content:v}]);}
    }catch(e){setErr(e.message);}
    finally{setRev(false);setEditing(false);setESec(null);setETxt("");}
  }

  function reset(){setStep("select");setShow(null);setMode(null);setGuest(null);setEp("");setTx("");setRaw("");setSecs([]);setErr("");setEditing(false);setESec(null);setETxt("");setExtraPlatforms([]);setClipCount(3);setClipTexts(Array(10).fill(""));setClipResults([]);setClipPlatforms(["YouTube"]);}

  const lbl={fontSize:"15px",letterSpacing:"2px",textTransform:"uppercase",color:T.textMuted,marginBottom:"10px",display:"block",fontFamily:"'League Spartan',sans-serif"};
  const field={width:"100%",background:T.surface,border:`1px solid ${T.cardBorder}`,borderRadius:"8px",padding:"14px 18px",color:T.text,fontSize:"15px",fontFamily:"'EB Garamond',Georgia,serif",outline:"none",boxSizing:"border-box"};
  const primary=c=>({width:"100%",padding:"16px",background:c||T.coral,border:"none",borderRadius:"8px",color:"#fff",fontSize:"16px",fontWeight:"700",cursor:"pointer",letterSpacing:"2px",fontFamily:"'League Spartan',sans-serif",textTransform:"uppercase",marginTop:"20px"});
  const ghost={padding:"9px 18px",background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:"6px",color:T.textMuted,fontSize:"14px",cursor:"pointer",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1.5px",textTransform:"uppercase"};

  async function sendToDescript(clipSections) {
    let apiKey = descriptApiKey.trim();
    if (!descriptProjectId.trim()) {
      setDescriptStatus("Please enter your Descript Project ID.");
      return;
    }
    setDescriptSending(true);
    setDescriptStatus("Sending clip instructions to Descript...");
    try {
      // Build agent prompt from clip timestamps
      const clipLines = clipSections.split("\n").filter(l =>
        l.includes("TIMESTAMP:") || l.includes("CLIP #") || l.includes("DURATION:")
      ).join("\n");
      const agentPrompt = `Create highlights from these timestamps. For each clip, add a marker or comment at the start timestamp so the editor can find them easily:\n\n${clipLines}\n\nLabel each one as CLIP 1, CLIP 2, etc.`;

      // Call our Vercel proxy instead of Descript directly (avoids CORS)
      const r = await fetch("/api/descript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        projectId: descriptProjectId.trim().split("/").pop().split("?")[0],
        prompt: agentPrompt
      })
      });
      const j = await r.json();
      if (!r.ok) {
        setDescriptStatus("Descript error: " + (j.error || "Unknown error"));
      } else {
        setDescriptStatus("Sent! Job ID: " + (j.job_id || "submitted") + " — check Descript for the highlighted clips.");
      }
    } catch(e) {
      setDescriptStatus("Error: " + e.message);
    } finally {
      setDescriptSending(false);
    }
  }

  return(
    <div style={{minHeight:"100vh",width:"100%",background:T.bg,color:T.text,display:"flex",flexDirection:"column"}}>
      <style>{`*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}textarea::placeholder,input::placeholder{color:${T.textMuted}}button:hover{opacity:.85}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${T.cardBorder};border-radius:2px}a{transition:opacity .2s}a:hover{opacity:.7}`}</style>

      {showAdminGate&&<AdminGate onSuccess={()=>{setShowAdminGate(false);setShowAdmin(true);}} onClose={()=>setShowAdminGate(false)}/>}
      {showAdmin&&<AdminPanel shows={shows} onClose={()=>setShowAdmin(false)} onSaved={refreshShows}/>}

      {/* HEADER */}
      <div style={{padding:"0 40px",background:T.surface,borderBottom:`1px solid ${T.cardBorder}`,display:"flex",justifyContent:"space-between",alignItems:"stretch",height:"64px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <div style={{width:"3px",height:"28px",background:T.coral,borderRadius:"2px"}}/>
          <div style={{display:"flex",alignItems:"baseline",gap:"12px"}}>
            <span style={{fontSize:"24px",letterSpacing:"4px",textTransform:"uppercase",color:T.text,fontFamily:"'League Spartan',sans-serif",fontWeight:"800"}}>Podcast Impact Studio</span>
            <span style={{fontSize:"15px",letterSpacing:"4px",textTransform:"uppercase",color:T.coral,fontFamily:"'League Spartan',sans-serif",fontWeight:"600"}}>Content Creator</span>
          </div>
        </div>
        <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
          {step!=="select"&&<button onClick={reset} style={ghost}>← Start Over</button>}
          <button onClick={()=>setShowAdminGate(true)} style={{...ghost,border:"none",opacity:.4,fontSize:"16px",padding:"8px 12px"}}>⚙️</button>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div style={{height:"2px",background:T.cardBorder,flexShrink:0}}>
        <div style={{height:"100%",background:T.coral,width:`${[25,50,75,100][ci]}%`,transition:"width .4s ease"}}/>
      </div>

      {/* CONTENT */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,overflowY:"auto",padding:"40px 48px"}}>
          <div style={{maxWidth:"900px",margin:"0 auto",width:"100%"}}>

            {/* SELECT SHOW */}
            {step==="select"&&<div style={{animation:"fadeUp .4s ease"}}>
              <div style={{marginBottom:"40px"}}>
                <h1 style={{fontSize:"48px",fontWeight:"700",color:T.text,margin:"0 0 8px",letterSpacing:"-0.5px",fontFamily:"'League Spartan',sans-serif"}}>Select a show</h1>
                <p style={{fontSize:"17px",color:T.textMuted,margin:0,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>CHOOSE THE PODCAST YOU'RE CREATING CONTENT FOR</p>
              </div>
              {loadingShows?(
                <div style={{textAlign:"center",padding:"60px",color:T.textMuted,fontFamily:"'League Spartan',sans-serif",letterSpacing:"2px",fontSize:"12px"}}>LOADING SHOWS...</div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  {Object.entries(shows).map(([k,s])=>(
                    <div key={k} onClick={()=>setShow(k)} style={{background:show===k?`${s.clr||T.coral}12`:T.card,border:show===k?`1px solid ${s.clr||T.coral}`:` 1px solid ${T.cardBorder}`,borderRadius:"10px",padding:"20px 24px",cursor:"pointer",transition:"all .15s",position:"relative"}}>
                      {show===k&&<div style={{position:"absolute",top:"16px",right:"16px",width:"8px",height:"8px",borderRadius:"50%",background:s.clr||T.coral}}/>}
                      <div style={{fontSize:"24px",color:s.clr||T.coral,fontWeight:"700",marginBottom:"4px",letterSpacing:"-0.3px",fontFamily:"'League Spartan',sans-serif"}}>{s.name}</div>
                      <div style={{fontSize:"17px",color:T.textSecondary,fontStyle:"italic",marginBottom:"12px",lineHeight:"1.4"}}>{s.tag}</div>
                      <div style={{fontSize:"15px",color:T.textSecondary,fontFamily:"'League Spartan',sans-serif",letterSpacing:"0.5px"}}>
                        {[...(s.platforms?.p||[]),...(s.platforms?.s||[])].join(" · ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {show&&<button onClick={()=>{setStep("mode");}} style={primary(T.red)}>Continue →</button>}
            </div>}

            {/* MODE */}
            {step==="mode"&&d&&<div style={{animation:"fadeUp .4s ease"}}>
              <div style={{marginBottom:"40px"}}>
                <h1 style={{fontSize:"48px",fontWeight:"700",color:T.text,margin:"0 0 8px",letterSpacing:"-0.5px",fontFamily:"'League Spartan',sans-serif"}}>What are you creating?</h1>
                <p style={{fontSize:"17px",color:T.textMuted,margin:0,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>{d.name.toUpperCase()}</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                {MODES.map(m=>(
                  <div key={m.id} onClick={()=>setMode(m.id)} style={{background:mode===m.id?`${T.coral}10`:T.card,border:mode===m.id?`1px solid ${T.coral}`:`1px solid ${T.cardBorder}`,borderRadius:"10px",padding:"20px 24px",cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",gap:"20px"}}>
                    <span style={{fontSize:"24px",flexShrink:0}}>{m.icon}</span>
                    <div>
                      <div style={{fontSize:"20px",color:mode===m.id?T.text:T.textSecondary,fontWeight:"600",marginBottom:"3px"}}>{m.label}</div>
                      <div style={{fontSize:"16px",color:T.textMuted}}>{m.desc}</div>
                    </div>
                    {mode===m.id&&<div style={{marginLeft:"auto",width:"8px",height:"8px",borderRadius:"50%",background:T.coral,flexShrink:0}}/>}
                  </div>
                ))}
              </div>
              {mode&&<button onClick={()=>setStep(mode==="editor"?"input":"configure")} style={primary(T.red)}>Continue →</button>}
            </div>}

            {/* CONFIGURE */}
            {step==="configure"&&d&&<div style={{animation:"fadeUp .4s ease"}}>
              <div style={{marginBottom:"40px"}}>
                <h1 style={{fontSize:"48px",fontWeight:"700",color:T.text,margin:"0 0 8px",letterSpacing:"-0.5px",fontFamily:"'League Spartan',sans-serif"}}>{d.name}</h1>
                <p style={{fontSize:"17px",color:T.textMuted,margin:0,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>CONFIGURE THIS EPISODE</p>
              </div>
              {mode!=="clips"&&<div style={{marginBottom:"20px"}}>
                <label style={lbl}>Episode Number</label>
                <input style={field} placeholder="e.g. 42 (optional)" value={ep} onChange={e=>setEp(e.target.value)}/>
              </div>}
              {mode!=="clips"&&<div style={{marginBottom:"20px"}}>
                <label style={lbl}>Episode Type</label>
                <div style={{display:"flex",gap:"10px"}}>
                  {[true,false].map(v=>(
                    <button key={String(v)} onClick={()=>setGuest(v)} style={{flex:1,padding:"14px",background:guest===v?`${d.clr}18`:T.card,border:guest===v?`1px solid ${d.clr}`:`1px solid ${T.cardBorder}`,borderRadius:"8px",color:guest===v?T.text:T.textSecondary,fontSize:"14px",cursor:"pointer",fontFamily:"'League Spartan',sans-serif",fontWeight:guest===v?"700":"400",letterSpacing:"1px",transition:"all .15s"}}>
                      {v?"GUEST EPISODE":"SOLO / HOST ONLY"}
                    </button>
                  ))}
                </div>
              </div>}
              {mode==="clips"?(
                <div style={{marginBottom:"20px"}}>
                  <label style={lbl}>Platforms for Clips</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
                    {["YouTube","Instagram","Facebook","TikTok","Spotify"].map(p=>{const on=clipPlatforms.includes(p);return(
                      <button key={p} onClick={()=>setClipPlatforms(prev=>on&&prev.length>1?prev.filter(x=>x!==p):on?prev:[...prev,p])} style={{padding:"8px 18px",background:on?`${d.clr}18`:T.card,border:on?`1px solid ${d.clr}`:`1px solid ${T.cardBorder}`,borderRadius:"6px",fontSize:"13px",color:on?d.clr:T.textMuted,fontFamily:"'League Spartan',sans-serif",cursor:"pointer",fontWeight:on?"700":"400",transition:"all .15s",letterSpacing:"1px"}}>
                        {on?"✓ ":""}{p.toUpperCase()}
                      </button>
                    );})}
                  </div>
                </div>
              ):(
                <div style={{marginBottom:"20px"}}>
                  <label style={lbl}>Platforms</label>
                  <div style={{fontSize:"14px",color:T.textSecondary,fontFamily:"'EB Garamond',serif",fontStyle:"italic",marginBottom:"8px"}}>Configured in Admin — generating content for all selected platforms</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
                    {[...(d.platforms?.social||[]),...(d.platforms?.podcast||[]),...(d.platforms?.community||[]),...(d.platforms?.email||[]),...(d.platforms?.blog||[]),...(d.platforms?.extras||[])].map(p=>(
                      <span key={p} style={{padding:"6px 14px",background:`${d.clr}18`,border:`1px solid ${d.clr}44`,borderRadius:"6px",fontSize:"12px",color:d.clr,fontFamily:"'League Spartan',sans-serif",fontWeight:"600",letterSpacing:"1px"}}>✓ {p.toUpperCase()}</span>
                    ))}
                  </div>
                </div>
              )}
              {(mode==="clips"||guest!==null)&&<button onClick={()=>setStep(mode==="clips"?"clips-setup":"input")} style={primary(T.red)}>Continue →</button>}
            </div>}

            {/* CLIPS SETUP */}
            {step==="clips-setup"&&d&&<div style={{animation:"fadeUp .4s ease"}}>
              <div style={{marginBottom:"40px"}}>
                <h1 style={{fontSize:"48px",fontWeight:"700",color:T.text,margin:"0 0 8px",letterSpacing:"-0.5px",fontFamily:"'League Spartan',sans-serif"}}>How many clips?</h1>
                <p style={{fontSize:"17px",color:T.textMuted,margin:0,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>{d.name.toUpperCase()} · {clipPlatforms.join(", ").toUpperCase()}</p>
              </div>
              <label style={lbl}>Number of Clips</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"32px"}}>
                {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                  <button key={n} onClick={()=>setClipCount(n)} style={{width:"58px",height:"58px",background:clipCount===n?`${d.clr}18`:T.card,border:clipCount===n?`1px solid ${d.clr}`:`1px solid ${T.cardBorder}`,borderRadius:"8px",color:clipCount===n?d.clr:T.textMuted,fontSize:"18px",fontWeight:clipCount===n?"700":"400",cursor:"pointer",transition:"all .15s"}}>{n}</button>
                ))}
              </div>
              <button onClick={()=>setStep("input")} style={primary(T.red)}>Set Up {clipCount} Clip{clipCount>1?"s":""} →</button>
            </div>}

            {/* INPUT */}
            {step==="input"&&d&&<div style={{animation:"fadeUp .4s ease"}}>
              {mode==="clips"?(
                <>
                  <div style={{marginBottom:"32px"}}>
                    <h1 style={{fontSize:"48px",fontWeight:"700",color:T.text,margin:"0 0 8px",letterSpacing:"-0.5px",fontFamily:"'League Spartan',sans-serif"}}>Paste your clips</h1>
                    <p style={{fontSize:"17px",color:T.textMuted,margin:0,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>{d.name.toUpperCase()} · {clipPlatforms.join(", ").toUpperCase()}</p>
                  </div>
                  {err&&<div style={{background:"#D94F4F18",border:"1px solid #D94F4F44",borderRadius:"8px",padding:"12px 16px",color:"#F09090",fontSize:"14px",marginBottom:"16px",fontFamily:"'League Spartan',sans-serif"}}>{err}</div>}
                  {Array.from({length:clipCount},(_,i)=>(
                    <div key={i} style={{marginBottom:"16px"}}>
                      <label style={{...lbl,color:d.clr}}>Clip {i+1}</label>
                      <textarea style={{...field,minHeight:"120px",lineHeight:"1.6",resize:"vertical",borderColor:clipTexts[i].trim()?`${d.clr}55`:T.cardBorder}} placeholder={`Paste transcript for Clip ${i+1}...`} value={clipTexts[i]} onChange={e=>{const next=[...clipTexts];next[i]=e.target.value;setClipTexts(next);}}/>
                      {clipTexts[i].trim()&&<div style={{fontSize:"11px",color:T.textMuted,marginTop:"4px",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>{clipTexts[i].trim().split(/\s+/).length} WORDS</div>}
                    </div>
                  ))}
                  <button onClick={genClips} disabled={clipTexts.slice(0,clipCount).every(t=>!t.trim())} style={{...primary(T.red),opacity:clipTexts.slice(0,clipCount).some(t=>t.trim())?1:.35}}>Generate {clipCount} Clip{clipCount>1?"s":""} →</button>
                </>
              ):(
                <>
                  <div style={{marginBottom:"32px"}}>
                    <h1 style={{fontSize:"48px",fontWeight:"700",color:T.text,margin:"0 0 8px",letterSpacing:"-0.5px",fontFamily:"'League Spartan',sans-serif"}}>{mode==="editor"?"Paste the raw transcript":"Add the transcript"}</h1>
                    <p style={{fontSize:"17px",color:T.textMuted,margin:0,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>{mode==="editor"?d.name.toUpperCase()+" · EDITOR BRIEF":`${d.name.toUpperCase()} · ${(MODES.find(m=>m.id===mode)?.label||"").toUpperCase()}${mode!=="clips"?` · ${guest?"GUEST":"SOLO"}`:""}${ep?` · EP ${ep}`:""}`}</p>
                  </div>
                  {err&&<div style={{background:"#D94F4F18",border:"1px solid #D94F4F44",borderRadius:"8px",padding:"12px 16px",color:"#F09090",fontSize:"14px",marginBottom:"16px",fontFamily:"'League Spartan',sans-serif"}}>{err}</div>}
                  {mode==="editor"&&<div style={{marginBottom:"24px"}}>
                    <label style={lbl}>How many clip suggestions?</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
                      {[3,4,5,6,7,8,9,10].map(n=>(
                        <button key={n} onClick={()=>setEditorClipCount(n)}
                          style={{padding:"10px 20px",background:editorClipCount===n?T.coral:T.card,border:"1px solid "+(editorClipCount===n?T.coral:T.cardBorder),borderRadius:"6px",color:editorClipCount===n?"#fff":T.textSecondary,fontSize:"15px",fontWeight:editorClipCount===n?"700":"400",cursor:"pointer",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px",transition:"all .15s"}}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>}
                  <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop} style={{border:`1px dashed ${dragging?T.coral:T.cardBorder}`,borderRadius:"8px",padding:"32px",textAlign:"center",marginBottom:"16px",background:dragging?T.coralSoft:T.card,transition:"all .2s",cursor:"pointer"}} onClick={()=>fileRef.current?.click()}>
                    <input ref={fileRef} type="file" accept=".txt,.md" style={{display:"none"}} onChange={handleFileInput}/>
                    <div style={{fontSize:"24px",marginBottom:"8px"}}>{dragging?"📥":"📄"}</div>
                    <div style={{fontSize:"14px",color:T.textSecondary,marginBottom:"4px"}}>Drag & drop a transcript file</div>
                    <div style={{fontSize:"12px",color:T.textMuted,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>OR CLICK TO BROWSE · .TXT FILES</div>
                  </div>
                  <div style={{textAlign:"center",fontSize:"12px",color:T.textMuted,marginBottom:"16px",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>— OR PASTE BELOW —</div>
                  <textarea style={{...field,minHeight:"220px",lineHeight:"1.7",resize:"vertical"}} placeholder={mode==="editor"?"Paste the raw transcript here — include timestamps if available (e.g. from Descript or Rev). The more accurate the timestamps, the better the clip suggestions...":"Paste the full episode transcript here..."} value={tx} onChange={e=>setTx(e.target.value)}/>
                  {tx.length>0&&<div style={{fontSize:"15px",color:T.textMuted,marginTop:"6px",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>{Math.round(tx.split(/\s+/).length).toLocaleString()} WORDS</div>}
                  <button onClick={gen} disabled={!tx.trim()} style={{...primary(T.red),opacity:tx.trim()?1:.35}}>Generate {MODES.find(m=>m.id===mode)?.label} →</button>
                </>
              )}
            </div>}

            {/* GENERATING */}
            {step==="generating"&&<div style={{textAlign:"center",padding:"100px 20px",animation:"fadeUp .4s ease"}}>
              <div style={{width:"40px",height:"40px",border:`2px solid ${T.cardBorder}`,borderTopColor:T.coral,borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 28px"}}/>
              <h2 style={{fontSize:"34px",fontWeight:"400",color:T.text,marginBottom:"8px",letterSpacing:"-0.5px"}}>Building your content package</h2>
              <p style={{fontSize:"18px",color:T.textMuted,margin:"0 0 8px",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>{d?.name.toUpperCase()} SHOW DNA</p>
              <p style={{fontSize:"13px",color:T.coral,animation:"pulse 2s ease-in-out infinite",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>THIS TAKES ABOUT 30 SECONDS</p>
            </div>}

            {/* RESULT */}
            {step==="result"&&<div style={{animation:"fadeUp .4s ease"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"28px",flexWrap:"wrap",gap:"12px"}}>
                <div>
                  <h2 style={{fontSize:"36px",fontWeight:"700",color:T.text,margin:"0 0 4px",letterSpacing:"-0.5px",fontFamily:"'League Spartan',sans-serif"}}>{mode==="clips"?"Clips Ready":"Content Package Ready"}</h2>
                  <p style={{fontSize:"16px",color:T.textMuted,margin:0,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>{d?.name.toUpperCase()}{ep?` · EP ${ep}`:""}{mode==="clips"?` · ${clipResults.filter(r=>!r.skipped).length} CLIPS`:` · ${secs.length} SECTIONS`}</p>
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  {mode!=="clips"&&<button onClick={()=>{copyText(raw);setCpAll(true);setTimeout(()=>setCpAll(false),2000);}} style={{...ghost,background:cpAll?T.coralSoft:"transparent",borderColor:cpAll?T.coralMid:T.cardBorder,color:cpAll?T.coral:T.textMuted}}>{cpAll?"✓ COPIED":"COPY ALL"}</button>}
                  {mode!=="clips"&&<button onClick={()=>{dlDoc(raw,`${d?.name}${ep?` — Ep ${ep}`:""} Content Package`);setDlOk(true);setTimeout(()=>setDlOk(false),2500);}} style={{...ghost,background:dlOk?T.coralSoft:"transparent",borderColor:dlOk?T.coralMid:T.cardBorder,color:dlOk?T.coral:T.textMuted}}>{dlOk?"✓ DOWNLOADED":"📄 WORD DOC"}</button>}
                  <button onClick={()=>{setStep(mode==="clips"?"clips-setup":"input");setRaw("");setSecs([]);setClipResults([]);}} style={ghost}>{mode==="clips"?"NEW CLIPS":"NEW EPISODE"}</button>
                </div>
              </div>
              {err&&<div style={{background:"#D94F4F18",border:"1px solid #D94F4F44",borderRadius:"8px",padding:"12px 16px",color:"#F09090",fontSize:"14px",marginBottom:"12px",fontFamily:"'League Spartan',sans-serif"}}>{err}</div>}
              {mode==="clips"?(
                <div>
                  {clipResults.map((clip,i)=>clip.skipped?null:(
                    <div key={i} style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:"10px",marginBottom:"10px",overflow:"hidden"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",borderBottom:`1px solid ${T.cardBorder}`,background:T.surface}}>
                        <span style={{fontSize:"11px",fontFamily:"'League Spartan',sans-serif",letterSpacing:"2px",color:d.clr,fontWeight:"700"}}>✂️ CLIP {clip.index}</span>
                        <button onClick={()=>copyText(clip.content)} style={ghost}>COPY</button>
                      </div>
                      <div style={{padding:"20px 24px"}}>{renderContent(clip.content)}</div>
                    </div>
                  ))}
                </div>
              ):(
                <>
                  <div>{secs.map((s,i)=><Sec key={s.id+i} s={s} clr={clr}/>)}</div>
                  <div style={{display:"flex",gap:"10px",marginTop:"16px",flexWrap:"wrap"}}>
                    <button onClick={()=>setEditing(!editing)} style={{flex:1,padding:"13px",background:editing?T.coralSoft:T.card,border:`1px solid ${editing?T.coralMid:T.cardBorder}`,borderRadius:"8px",color:editing?T.coral:T.textSecondary,fontSize:"14px",cursor:"pointer",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1.5px",textTransform:"uppercase",transition:"all .2s"}}>{editing?"CLOSE EDITOR":"✏️  REVISE A SECTION"}</button>
                    {mode!=="editor"&&<button onClick={()=>{dlDoc(raw,`${d?.name}${ep?` — Ep ${ep}`:""} Content Package`);setDlOk(true);setTimeout(()=>setDlOk(false),2500);}} style={{flex:1,padding:"13px",background:dlOk?T.coralSoft:T.card,border:`1px solid ${dlOk?T.coralMid:T.cardBorder}`,borderRadius:"8px",color:dlOk?T.coral:T.textSecondary,fontSize:"14px",cursor:"pointer",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1.5px",textTransform:"uppercase",transition:"all .2s"}}>{dlOk?"✓ DOWNLOADED":"📄  DOWNLOAD WORD DOC"}</button>}
                  </div>
                  {mode==="editor"&&<div style={{background:T.card,border:"1px solid "+T.cardBorder,borderRadius:"10px",padding:"18px 20px",marginTop:"14px"}}>
                    <div style={{fontSize:"13px",color:T.coral,letterSpacing:"2px",fontFamily:"'League Spartan',sans-serif",marginBottom:"12px",fontWeight:"700"}}>🎬 SEND CLIPS TO DESCRIPT</div>
                    <div style={{fontSize:"13px",color:T.textSecondary,fontFamily:"'EB Garamond',Georgia,serif",fontStyle:"italic",marginBottom:"12px"}}>Paste your Descript Project ID (last part of the project URL) to highlight clips in Descript.</div>
                    <div style={{display:"flex",gap:"8px",marginBottom:"8px",flexWrap:"wrap"}}>
                      <input value={descriptProjectId} onChange={e=>setDescriptProjectId(e.target.value)} placeholder="Project ID (from Descript URL)"
                        style={{flex:1,minWidth:"160px",background:T.surface,border:"1px solid "+T.cardBorder,borderRadius:"6px",padding:"10px 12px",color:T.text,fontSize:"13px",outline:"none",fontFamily:"monospace"}}/>
                      <button onClick={()=>{const clipSec=secs.find(s=>s.id==="editor-clips");sendToDescript(clipSec?.content||raw);}}
                        disabled={descriptSending||!descriptProjectId.trim()}
                        style={{padding:"10px 20px",background:descriptSending||!descriptProjectId.trim()?"#555":T.coral,border:"none",borderRadius:"6px",color:"#fff",fontSize:"13px",fontWeight:"700",cursor:descriptSending||!descriptProjectId.trim()?"not-allowed":"pointer",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px",whiteSpace:"nowrap"}}>
                        {descriptSending?"Sending...":"Send to Descript →"}
                      </button>
                    </div>
                    {descriptStatus&&<div style={{fontSize:"13px",color:descriptStatus.startsWith("Sent")||descriptStatus.startsWith("Job")?"#52B788":"#F09090",fontFamily:"monospace",marginTop:"6px"}}>{descriptStatus}</div>}
                    <div style={{fontSize:"11px",color:T.textMuted,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px",marginTop:"8px"}}>API KEY: Settings → API Tokens in Descript · PROJECT ID: Last part of your Descript project URL</div>
                  </div>}
                  {editing&&<div style={{background:T.surface,border:`1px solid ${T.cardBorder}`,borderRadius:"10px",padding:"24px",marginTop:"10px",animation:"fadeUp .3s ease"}}>
                    <label style={lbl}>Section to Revise</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"16px"}}>
                      {ED.filter(s=>(!s.g||guest)&&(!s.pm||false)&&(!s.cm||mode==="clips")).map(s=>(
                        <button key={s.id} onClick={()=>setESec(s.id)} style={{padding:"6px 14px",background:eSec===s.id?`${clr}18`:T.card,border:eSec===s.id?`1px solid ${clr}55`:`1px solid ${T.cardBorder}`,borderRadius:"6px",color:eSec===s.id?T.text:T.textMuted,fontSize:"12px",cursor:"pointer",fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px",transition:"all .15s"}}>{s.l}</button>
                      ))}
                    </div>
                    {eSec&&<>
                      <label style={lbl}>Instructions</label>
                      <textarea style={{...field,minHeight:"80px",resize:"vertical",marginBottom:"10px",fontSize:"14px"}} placeholder='e.g. "Make the hook punchier" or "Tighten the LinkedIn post"' value={eTxt} onChange={e=>setETxt(e.target.value)}/>
                      <button onClick={doRev} disabled={!eTxt.trim()||rev} style={{...primary(clr),marginTop:"0",opacity:eTxt.trim()&&!rev?1:.35}}>{rev?"REVISING...":"SUBMIT REVISION →"}</button>
                    </>}
                  </div>}
                </>
              )}
            </div>}

          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{padding:"14px 40px",background:T.surface,borderTop:`1px solid ${T.cardBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <span style={{fontSize:"15px",color:T.textSecondary,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1.5px"}}>© {new Date().getFullYear()} PODCAST IMPACT STUDIO</span>
        <span style={{fontSize:"15px",color:T.textSecondary,fontFamily:"'League Spartan',sans-serif",letterSpacing:"1px"}}>CONTENT CREATOR</span>
      </div>
    </div>
  );
}