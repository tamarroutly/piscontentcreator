import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

const T = {
  bg: "#1A1A1A", surface: "#212121", card: "#2A2A2A", cardBorder: "#3A3A3A",
  text: "#FFFFFF", textSecondary: "#CECECE", textMuted: "#8E8EA0",
  coral: "#D97757", coralSoft: "#D9775718", coralMid: "#D9775740",
};

const TIMEZONES = [
  ["America/New_York",     "Eastern Time (ET)"],
  ["America/Chicago",      "Central Time (CT)"],
  ["America/Denver",       "Mountain Time (MT)"],
  ["America/Los_Angeles",  "Pacific Time (PT)"],
  ["America/Vancouver",    "Vancouver (PT)"],
  ["America/Toronto",      "Toronto (ET)"],
  ["Europe/London",        "London (GMT/BST)"],
  ["Europe/Paris",         "Paris (CET)"],
  ["Asia/Manila",          "Manila (PHT)"],
  ["Asia/Tokyo",           "Tokyo (JST)"],
  ["Australia/Sydney",     "Sydney (AEST)"],
  ["Pacific/Auckland",     "Auckland (NZST)"],
];

const inp = {
  width: "100%", background: "#2A2A2A", border: "1px solid #3A3A3A",
  borderRadius: "8px", padding: "13px 16px", color: "#FFFFFF",
  fontSize: "15px", outline: "none", boxSizing: "border-box",
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  marginBottom: "12px",
};

const btn = (primary) => ({
  width: "100%", padding: "14px", border: "none", borderRadius: "8px",
  fontSize: "15px", fontWeight: "700", cursor: "pointer",
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  background: primary ? T.coral : T.card,
  color: primary ? "#fff" : T.textMuted,
  marginTop: primary ? "8px" : "0",
});

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function handleForgotPassword() {
    if (!email.trim()) { setError("Enter your email address first, then click Forgot Password."); return; }
    setLoading(true); setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin + "/#type=recovery",
      });
      if (error) throw error;
      setResetSent(true);
    } catch(e) {
      setError(e.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError) throw authError;
      onLogin(data.user);
    } catch (e) {
      setError(e.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "3px", height: "32px", background: T.coral, borderRadius: "2px", margin: "0 auto 20px" }} />
          <div style={{ fontSize: "28px", fontWeight: "800", color: T.text, letterSpacing: "-0.5px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Podcast Impact Studio</div>
          <div style={{ fontSize: "15px", color: T.textMuted, marginTop: "6px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Content Creator</div>
        </div>
        <div style={{ background: T.card, border: "1px solid " + T.cardBorder, borderRadius: "12px", padding: "32px" }}>
          <div style={{ fontSize: "20px", fontWeight: "700", color: T.text, marginBottom: "24px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Sign in</div>
          <input
            type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={inp} autoFocus
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={inp}
          />
          {error && <div style={{ color: "#F09090", fontSize: "14px", marginBottom: "10px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>{error}</div>}
          {resetSent ? (
            <div style={{ padding: "14px", background: "#52B78820", border: "1px solid #52B78844", borderRadius: "8px", textAlign: "center", color: "#52B788", fontSize: "14px", marginTop: "8px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
              ✓ Password reset email sent — check your inbox.
            </div>
          ) : (
            <button onClick={handleLogin} disabled={loading} style={btn(true)}>
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          )}
          <button onClick={handleForgotPassword} disabled={loading} style={{ ...btn(false), marginTop: "8px", fontSize: "13px", opacity: 0.7 }}>
            Forgot password?
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: T.textMuted, fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
          New here?{" "}
          <button onClick={onSignup} style={{ background: "none", border: "none", color: T.coral, cursor: "pointer", fontSize: "13px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", padding: 0 }}>
            Create an account →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SIGNUP SCREEN ─────────────────────────────────────────────────────────────
function SignupScreen({ onSwitch, onAuthenticated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Vancouver");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !orgName.trim() || !password) {
      setError("All fields are required."); return;
    }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signupError) throw signupError;
      if (!data.user) throw new Error("Signup failed — please try again.");

      const r = await fetch("/api/create-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.user.id,
          orgName: orgName.trim(),
          userName: name.trim(),
          timezone,
        }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || "Failed to create workspace.");

      onAuthenticated(data.user);
    } catch (e) {
      setError(e.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  const lbl = { fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: T.textMuted, display: "block", marginBottom: "6px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "3px", height: "32px", background: T.coral, borderRadius: "2px", margin: "0 auto 20px" }} />
          <div style={{ fontSize: "28px", fontWeight: "800", color: T.text, letterSpacing: "-0.5px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Create your account</div>
          <div style={{ fontSize: "15px", color: T.textMuted, marginTop: "6px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Set up your workspace in seconds.</div>
        </div>
        <div style={{ background: T.card, border: "1px solid " + T.cardBorder, borderRadius: "12px", padding: "32px" }}>
          <label style={lbl}>Your Name</label>
          <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={inp} autoFocus />

          <label style={lbl}>Email Address</label>
          <input type="email" placeholder="you@yourcompany.com" value={email} onChange={e => setEmail(e.target.value)} style={inp} />

          <label style={lbl}>Workspace Name</label>
          <input type="text" placeholder="Your podcast production company" value={orgName} onChange={e => setOrgName(e.target.value)} style={inp} />

          <label style={lbl}>Your Timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
            {TIMEZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <label style={lbl}>Password</label>
          <input type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={inp} />
          <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignup()} style={inp} />

          {error && <div style={{ color: "#F09090", fontSize: "14px", marginBottom: "10px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>{error}</div>}
          <button onClick={handleSignup} disabled={loading} style={btn(true)}>
            {loading ? "Creating workspace..." : "Create Account →"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: T.textMuted, fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
          Already have an account?{" "}
          <button onClick={onSwitch} style={{ background: "none", border: "none", color: T.coral, cursor: "pointer", fontSize: "13px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", padding: 0 }}>
            Sign in →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ACCOUNT SETUP SCREEN (for invited users) ──────────────────────────────────
function AccountSetupScreen({ onComplete }) {
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Vancouver");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSetup() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!timezone) { setError("Please select your timezone."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    setError("");
    try {
      // Update password
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw pwError;
      // Update profile — include org_id from invite metadata
      const { data: { user } } = await supabase.auth.getUser();
      const orgId = user.user_metadata?.org_id || null;
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        name: name.trim(),
        timezone,
        role: user.user_metadata?.role || "editor",
        org_id: orgId,
      });
      if (profileError) throw profileError;
      onComplete();
    } catch (e) {
      setError(e.message || "Setup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-detect timezone label
  const tzLabel = TIMEZONES.find(([v]) => v === timezone)?.[1] || timezone;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "3px", height: "32px", background: T.coral, borderRadius: "2px", margin: "0 auto 20px" }} />
          <div style={{ fontSize: "28px", fontWeight: "800", color: T.text, letterSpacing: "-0.5px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Welcome!</div>
          <div style={{ fontSize: "15px", color: T.textMuted, marginTop: "6px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Set up your account to get started.</div>
        </div>
        <div style={{ background: T.card, border: "1px solid " + T.cardBorder, borderRadius: "12px", padding: "32px" }}>
          <div style={{ fontSize: "20px", fontWeight: "700", color: T.text, marginBottom: "6px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Account Setup</div>
          <div style={{ fontSize: "14px", color: T.textMuted, marginBottom: "24px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>This only takes a minute.</div>

          <label style={{ fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: T.textMuted, display: "block", marginBottom: "6px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Your Name</label>
          <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={inp} autoFocus />

          <label style={{ fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: T.textMuted, display: "block", marginBottom: "6px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Your Timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
            {TIMEZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "-8px", marginBottom: "14px", fontStyle: "italic", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
            Detected: {tzLabel} — publish schedules will display in your local time.
          </div>

          <label style={{ fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: T.textMuted, display: "block", marginBottom: "6px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Create Password</label>
          <input type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={inp} />
          <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSetup()} style={inp} />

          {error && <div style={{ color: "#F09090", fontSize: "14px", marginBottom: "10px", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>{error}</div>}
          <button onClick={handleSetup} disabled={loading} style={btn(true)}>
            {loading ? "Setting up..." : "Complete Setup →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN AUTH WRAPPER ─────────────────────────────────────────────────────────
export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState("loading"); // loading | login | signup | setup

  useEffect(() => {
    // Check if this is an invite/recovery link
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const type = params.get("type");

    if (type === "invite" || type === "recovery" || type === "signup") {
      // Supabase puts the token in the URL — it auto-handles the session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // Check if profile is complete
          supabase.from("profiles").select("name, timezone").eq("id", session.user.id).single()
            .then(({ data }) => {
              if (!data?.name || !data?.timezone) {
                setMode("setup");
              } else {
                onAuthenticated(session.user);
              }
            });
        } else {
          setMode("login");
        }
      });
    } else {
      // Normal flow — check existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          onAuthenticated(session.user);
        } else {
          setMode("login");
        }
      });
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        if (mode === "setup") return; // Don't redirect during setup
        onAuthenticated(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (mode === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "2px solid #3A3A3A", borderTopColor: T.coral, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (mode === "setup") {
    return <AccountSetupScreen onComplete={async () => {
      const { data: { user } } = await supabase.auth.getUser();
      onAuthenticated(user);
    }} />;
  }

  if (mode === "signup") {
    return <SignupScreen onSwitch={() => setMode("login")} onAuthenticated={onAuthenticated} />;
  }

  return <LoginScreen onLogin={onAuthenticated} onSignup={() => setMode("signup")} />;
}
