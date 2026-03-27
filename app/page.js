"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ==================== THEMES ====================
const THEMES = {
  rosegold: { name: "Rose Gold", emoji: "\u{1F338}", vars: { "--bg": "#FFF8F6", "--bg-card": "#FFFFFF", "--bg-hover": "#FFF0EC", "--text": "#2D2D2D", "--text-secondary": "#6B6B6B", "--text-muted": "#9B9B9B", "--accent": "#E8735A", "--accent-light": "#FDEAE5", "--accent-dark": "#D4563E", "--border": "#F0E8E5", "--shadow": "rgba(232, 115, 90, 0.08)", "--gradient-start": "#E8735A", "--gradient-end": "#F4A261" }},
  lavender: { name: "Lavender", emoji: "\u{1F49C}", vars: { "--bg": "#F8F5FF", "--bg-card": "#FFFFFF", "--bg-hover": "#F0EAFF", "--text": "#2D2D2D", "--text-secondary": "#6B6B6B", "--text-muted": "#9B9B9B", "--accent": "#9B7FD4", "--accent-light": "#EDE5FF", "--accent-dark": "#7B5FB4", "--border": "#E8E0F5", "--shadow": "rgba(155, 127, 212, 0.08)", "--gradient-start": "#9B7FD4", "--gradient-end": "#C4A8E8" }},
  sage: { name: "Sage", emoji: "\u{1F33F}", vars: { "--bg": "#F5F8F5", "--bg-card": "#FFFFFF", "--bg-hover": "#EAF2EA", "--text": "#2D2D2D", "--text-secondary": "#6B6B6B", "--text-muted": "#9B9B9B", "--accent": "#7BA376", "--accent-light": "#E0F0E0", "--accent-dark": "#5B8F5B", "--border": "#DDE8DD", "--shadow": "rgba(107, 163, 107, 0.08)", "--gradient-start": "#7BA376", "--gradient-end": "#A8D4A0" }},
  ocean: { name: "Ocean", emoji: "\u{1F30A}", vars: { "--bg": "#F5F8FC", "--bg-card": "#FFFFFF", "--bg-hover": "#E8F0FA", "--text": "#2D2D2D", "--text-secondary": "#6B6B6B", "--text-muted": "#9B9B9B", "--accent": "#5B8FD4", "--accent-light": "#E0ECFA", "--accent-dark": "#3B6FB4", "--border": "#DDE5F0", "--shadow": "rgba(91, 143, 212, 0.08)", "--gradient-start": "#5B8FD4", "--gradient-end": "#7BB8E8" }},
  latte: { name: "Latte", emoji: "\u2615", vars: { "--bg": "#FAF7F4", "--bg-card": "#FFFFFF", "--bg-hover": "#F2EDE8", "--text": "#2D2D2D", "--text-secondary": "#6B6B6B", "--text-muted": "#9B9B9B", "--accent": "#B08968", "--accent-light": "#F0E6DA", "--accent-dark": "#8B6A4E", "--border": "#E8DDD2", "--shadow": "rgba(176, 137, 104, 0.08)", "--gradient-start": "#B08968", "--gradient-end": "#D4A982" }},
  midnight: { name: "Midnight", emoji: "\u{1F319}", vars: { "--bg": "#1A1A2E", "--bg-card": "#242442", "--bg-hover": "#2E2E4A", "--text": "#E8E8F0", "--text-secondary": "#A8A8C0", "--text-muted": "#7878A0", "--accent": "#C084FC", "--accent-light": "#3D2E5E", "--accent-dark": "#A855F7", "--border": "#3A3A5C", "--shadow": "rgba(192, 132, 252, 0.1)", "--gradient-start": "#C084FC", "--gradient-end": "#818CF8" }},
};

// ==================== DATA HELPERS ====================
async function fetchData(type) {
  const res = await fetch(`/api/data?type=${type}`);
  if (!res.ok) throw new Error(`Failed to fetch ${type}`);
  return res.json();
}

async function postData(type, action, payload) {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, action, payload }),
  });
  if (!res.ok) throw new Error(`Failed to ${action} ${type}`);
  return res.json();
}

async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Failed to upload photo");
  return res.json();
}

// Compress image to stay under Vercel's 4.5MB body limit
function compressImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = dataUrl.split(",")[1];
      console.log(`[Nourish] Compressed image: ${file.size} bytes -> ~${Math.round(base64.length * 0.75)} bytes (${w}x${h})`);
      resolve({ base64, mediaType: "image/jpeg" });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function fileToBase64(file) {
  // Always compress images to avoid Vercel body size limits
  if (file.type.startsWith("image/")) {
    return compressImage(file);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// localStorage helpers (for meal history only)
function loadLocal(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try { const d = localStorage.getItem("nourish_" + key); return d ? JSON.parse(d) : fallback; }
  catch { return fallback; }
}
function saveLocal(key, value) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("nourish_" + key, JSON.stringify(value)); } catch {}
}

// ==================== ICONS ====================
const Icons = {
  Camera: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Fridge: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="8" y1="6" x2="8" y2="6.01"/><line x1="8" y1="14" x2="8" y2="16"/></svg>,
  ChefHat: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  History: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Sparkles: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
  Upload: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  ShoppingCart: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  Check: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Refresh: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
};

function Spinner({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
      <circle cx="12" cy="12" r="10" stroke="var(--accent-light)" strokeWidth="3" fill="none" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ==================== MEAL SCANNER ====================
function MealScanner() {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [pendingMeals, setPendingMeals] = useState([]);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(() => loadLocal("meal_history", []));
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef();

  const loadPending = useCallback(async () => {
    try {
      const data = await fetchData("pending_meals");
      setPendingMeals(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError("");
    setUploadSuccess(false);

    // Show preview
    const dataUrl = await fileToBase64(file);
    setImage(dataUrl);

    // Upload to server
    setUploading(true);
    try {
      await uploadPhoto(file);
      setUploadSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to upload photo");
    }
    setUploading(false);
  };

  const approveMeal = async (meal) => {
    try {
      await postData("pending_meals", "approve", { id: meal.id });
      const entry = { ...meal, date: meal.date || new Date().toISOString() };
      const newHistory = [entry, ...history].slice(0, 50);
      setHistory(newHistory);
      saveLocal("meal_history", newHistory);
      setPendingMeals((prev) => prev.filter((m) => m.id !== meal.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectMeal = async (meal) => {
    try {
      await postData("pending_meals", "reject", { id: meal.id });
      setPendingMeals((prev) => prev.filter((m) => m.id !== meal.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const clear = () => { setImage(null); setUploadSuccess(false); setError(""); };

  if (showHistory) {
    return (
      <div className="fade-in">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 className="serif" style={{ fontSize: 24 }}>Meal History</h2>
          <button onClick={() => setShowHistory(false)} style={{ background: "var(--accent-light)", color: "var(--accent)", border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 500, fontSize: 14 }}>Back to Scanner</button>
        </div>
        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>&#x1F4F7;</p>
            <p>No meals scanned yet. Upload a photo to get started!</p>
          </div>
        ) : history.map((h, i) => (
          <div key={i} style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", padding: 16, marginBottom: 12, border: "1px solid var(--border)", display: "flex", gap: 16, alignItems: "center" }}>
            {h.image && <img src={h.image} alt="" style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", objectFit: "cover" }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              <div style={{ fontWeight: 600 }}>{h.total?.calories} cal</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{h.items?.map(it => it.name).join(", ")}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 className="serif" style={{ fontSize: 24, marginBottom: 4 }}>Meal Scanner</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Upload a photo, then ask Claude to analyze it</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadPending} style={{ background: "var(--accent-light)", color: "var(--accent)", border: "none", padding: "8px", borderRadius: "var(--radius-sm)", cursor: "pointer" }} title="Refresh pending meals">
            <Icons.Refresh />
          </button>
          {history.length > 0 && (
            <button onClick={() => setShowHistory(true)} style={{ background: "var(--accent-light)", color: "var(--accent)", border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 500, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.History /> History
            </button>
          )}
        </div>
      </div>

      {/* Upload area */}
      {!image ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; handleFile(e.dataTransfer.files[0]); }}
          style={{ background: "var(--bg-card)", border: "2px dashed var(--border)", borderRadius: "var(--radius-lg)", padding: "60px 24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
        >
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={e => handleFile(e.target.files[0])} />
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--accent)" }}>
            <Icons.Camera />
          </div>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Upload a meal photo</p>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Tap to take a photo or drag & drop an image</p>
        </div>
      ) : (
        <div>
          <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 16 }}>
            <img src={image} alt="Meal" style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }} />
            <button onClick={clear} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icons.X />
            </button>
          </div>

          {uploading && (
            <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", padding: 24, textAlign: "center", border: "1px solid var(--border)" }}>
              <Spinner size={32} />
              <p style={{ marginTop: 12, color: "var(--text-secondary)", fontWeight: 500 }}>Uploading photo...</p>
            </div>
          )}

          {uploadSuccess && (
            <div style={{ background: "#E8F8EA", border: "1px solid #C3E6C3", borderRadius: "var(--radius)", padding: 16, color: "#2D7A38", fontSize: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>&#x2705;</span>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Photo uploaded!</p>
                <p>Now ask Claude to analyze your meals. Just say: &quot;analyze my new meals&quot;</p>
              </div>
            </div>
          )}

          <button onClick={clear} style={{ width: "100%", padding: "14px", borderRadius: "var(--radius)", border: "2px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 15, fontWeight: 500, cursor: "pointer", marginTop: 12 }}>
            Upload Another Photo
          </button>
        </div>
      )}

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius)", padding: 12, color: "#DC2626", fontSize: 14, marginTop: 16 }}>{error}</div>
      )}

      {/* Pending meals from Claude analysis */}
      {pendingMeals.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 className="serif" style={{ fontSize: 18, marginBottom: 12 }}>Pending Approval ({pendingMeals.length})</h3>
          {pendingMeals.map((meal) => (
            <div key={meal.id} className="fade-in" style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", marginBottom: 16, overflow: "hidden" }}>
              {meal.image && <img src={meal.image} alt="Meal" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />}

              <div style={{ padding: 20 }}>
                <div className="gradient-bg" style={{ borderRadius: "var(--radius)", padding: 20, color: "#fff", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 6 }}>Total Calories</div>
                  <div className="serif" style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>{meal.total?.calories}</div>
                  <div style={{ display: "flex", gap: 24 }}>
                    <div><div style={{ fontSize: 12, opacity: 0.8 }}>Protein</div><div style={{ fontSize: 16, fontWeight: 600 }}>{meal.total?.protein}g</div></div>
                    <div><div style={{ fontSize: 12, opacity: 0.8 }}>Carbs</div><div style={{ fontSize: 16, fontWeight: 600 }}>{meal.total?.carbs}g</div></div>
                    <div><div style={{ fontSize: 12, opacity: 0.8 }}>Fat</div><div style={{ fontSize: 16, fontWeight: 600 }}>{meal.total?.fat}g</div></div>
                  </div>
                </div>

                <div style={{ background: "var(--bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", overflow: "hidden", marginBottom: 12 }}>
                  {meal.items?.map((item, i) => (
                    <div key={i} style={{ padding: "12px 16px", borderBottom: i < meal.items.length - 1 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: 2 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.portion}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 600, color: "var(--accent)" }}>{item.calories} cal</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>P:{item.protein}g C:{item.carbs}g F:{item.fat}g</div>
                      </div>
                    </div>
                  ))}
                </div>

                {meal.summary && (
                  <div style={{ background: "var(--accent-light)", borderRadius: "var(--radius-sm)", padding: 12, fontSize: 13, color: "var(--accent-dark)", display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>&#x1F4A1;</span>
                    <span>{meal.summary}</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => approveMeal(meal)} className="gradient-bg" style={{ flex: 1, padding: "12px", borderRadius: "var(--radius-sm)", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Icons.Check /> Approve
                  </button>
                  <button onClick={() => rejectMeal(meal)} style={{ padding: "12px 20px", borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && pendingMeals.length === 0 && !image && (
        <div style={{ background: "var(--accent-light)", borderRadius: "var(--radius)", padding: 16, marginTop: 16, fontSize: 14, color: "var(--accent-dark)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>&#x1F4A1;</span>
          <span>Upload photos here, then ask Claude Code to analyze your meals. Claude will read the photos and add the nutrition info for your approval.</span>
        </div>
      )}
    </div>
  );
}

// ==================== MY FRIDGE ====================
function MyFridge() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("produce");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const categories = {
    produce: { label: "Produce", emoji: "&#x1F96C;" },
    protein: { label: "Protein", emoji: "&#x1F969;" },
    dairy: { label: "Dairy", emoji: "&#x1F9C0;" },
    grains: { label: "Grains", emoji: "&#x1F33E;" },
    condiments: { label: "Condiments", emoji: "&#x1FAD9;" },
    frozen: { label: "Frozen", emoji: "&#x1F9CA;" },
    beverages: { label: "Beverages", emoji: "&#x1F964;" },
    other: { label: "Other", emoji: "&#x1F4E6;" },
  };

  // Use actual emoji characters for rendering
  const catEmojis = {
    produce: "\u{1F96C}", protein: "\u{1F969}", dairy: "\u{1F9C0}", grains: "\u{1F33E}",
    condiments: "\u{1FAD9}", frozen: "\u{1F9CA}", beverages: "\u{1F964}", other: "\u{1F4E6}",
  };

  const loadFridge = useCallback(async () => {
    try {
      const data = await fetchData("fridge");
      setItems(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFridge(); }, [loadFridge]);

  const addItem = async () => {
    if (!newItem.trim()) return;
    const item = { id: Date.now(), name: newItem.trim(), category: newCategory, addedDate: new Date().toISOString() };
    const updated = [...items, item];
    setItems(updated);
    setNewItem("");
    try { await postData("fridge", "set", updated); } catch {}
  };

  const removeItem = async (id) => {
    const updated = items.filter(it => it.id !== id);
    setItems(updated);
    try { await postData("fridge", "set", updated); } catch {}
  };

  const filtered = items.filter(it => !search || it.name.toLowerCase().includes(search.toLowerCase()));
  const grouped = {};
  filtered.forEach(it => {
    if (!grouped[it.category]) grouped[it.category] = [];
    grouped[it.category].push(it);
  });

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 className="serif" style={{ fontSize: 24, marginBottom: 4 }}>My Fridge</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{items.length} item{items.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadFridge} style={{ background: "var(--accent-light)", color: "var(--accent)", border: "none", padding: "8px", borderRadius: "var(--radius-sm)", cursor: "pointer" }} title="Refresh from file">
            <Icons.Refresh />
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="gradient-bg" style={{ color: "#fff", border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 500, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Icons.Plus /> Add
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="fade-in" style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", padding: 16, border: "1px solid var(--border)", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()} placeholder="e.g., Greek yogurt"
              style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", fontSize: 14, background: "var(--bg)", color: "var(--text)", outline: "none" }}
              onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = "var(--border)"} autoFocus />
            <button onClick={addItem} disabled={!newItem.trim()} style={{ padding: "10px 20px", borderRadius: "var(--radius-sm)", border: "none", background: newItem.trim() ? "var(--accent)" : "var(--border)", color: "#fff", fontWeight: 600, cursor: newItem.trim() ? "pointer" : "default", fontSize: 14 }}>Add</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(categories).map(([key, { label }]) => (
              <button key={key} onClick={() => setNewCategory(key)} style={{ padding: "6px 12px", borderRadius: 20, border: newCategory === key ? "2px solid var(--accent)" : "2px solid var(--border)", background: newCategory === key ? "var(--accent-light)" : "transparent", fontSize: 13, cursor: "pointer", color: "var(--text)" }}>{catEmojis[key]} {label}</button>
            ))}
          </div>
        </div>
      )}

      {items.length > 5 && (
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your fridge..."
            style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", fontSize: 14, background: "var(--bg-card)", color: "var(--text)", outline: "none" }} />
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}><Icons.Search /></div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Spinner size={32} /></div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>{"\u{1F9CA}"}</p>
          <p style={{ fontWeight: 500, marginBottom: 4 }}>Your fridge is empty!</p>
          <p style={{ fontSize: 14, marginBottom: 16 }}>Add items manually, or tell Claude what you have.</p>
          <div style={{ background: "var(--accent-light)", borderRadius: "var(--radius)", padding: 14, fontSize: 13, color: "var(--accent-dark)", textAlign: "left" }}>
            {"\u{1F4A1}"} Tip: Tell Claude &quot;I have eggs, milk, bread, and cheese in my fridge&quot; and it will update your inventory.
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span>{catEmojis[cat] || "\u{1F4E6}"}</span> {categories[cat]?.label || cat}
              <span style={{ background: "var(--accent-light)", color: "var(--accent)", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: "none" }}>{catItems.length}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {catItems.map(item => (
                <div key={item.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <span>{item.name}</span>
                  <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, display: "flex", opacity: 0.5 }}
                    onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.5}>
                    <Icons.X />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ==================== MEAL PLANNER ====================
function MealPlanner() {
  const [fridgeItems, setFridgeItems] = useState([]);
  const [plan, setPlan] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [fridge, plans] = await Promise.all([
        fetchData("fridge"),
        fetchData("meal_plans"),
      ]);
      setFridgeItems(fridge);
      if (plans && plans.meals) {
        setPlan(plans);
        setShoppingList(plans.shoppingList || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const clearPlan = async () => {
    try {
      await postData("meal_plans", "clear", {});
      setPlan(null);
      setShoppingList(null);
    } catch {}
  };

  const difficultyColor = { easy: "#6BBF7A", medium: "#F4A261", hard: "#E85A5A" };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 className="serif" style={{ fontSize: 24, marginBottom: 4 }}>Meal Planner</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Ask Claude to plan meals from your fridge</p>
        </div>
        <button onClick={loadData} style={{ background: "var(--accent-light)", color: "var(--accent)", border: "none", padding: "8px", borderRadius: "var(--radius-sm)", cursor: "pointer" }} title="Refresh">
          <Icons.Refresh />
        </button>
      </div>

      <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>WHAT YOU HAVE ({fridgeItems.length} items)</div>
        {fridgeItems.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No items in your fridge yet. Add some in the Fridge tab first!</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {fridgeItems.slice(0, 20).map((it, i) => (
              <span key={i} style={{ background: "var(--accent-light)", color: "var(--accent-dark)", padding: "4px 10px", borderRadius: 12, fontSize: 13, fontWeight: 500 }}>{it.name}</span>
            ))}
            {fridgeItems.length > 20 && <span style={{ padding: "4px 10px", fontSize: 13, color: "var(--text-muted)" }}>+{fridgeItems.length - 20} more</span>}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Spinner size={32} /></div>
      ) : !plan ? (
        <div style={{ background: "var(--accent-light)", borderRadius: "var(--radius)", padding: 20, textAlign: "center" }}>
          <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>{"\u{1F468}\u{200D}\u{1F373}"}</span>
          <p style={{ fontWeight: 600, color: "var(--accent-dark)", marginBottom: 8 }}>No meal plan yet</p>
          <p style={{ fontSize: 14, color: "var(--accent-dark)", opacity: 0.8 }}>
            Ask Claude: &quot;Plan some meals based on my fridge&quot;
          </p>
        </div>
      ) : (
        <div className="fade-in">
          {plan.meals?.map((meal, i) => (
            <div key={i} style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 20, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h3 className="serif" style={{ fontSize: 18 }}>{meal.name}</h3>
                <span style={{ background: (difficultyColor[meal.difficulty] || "#999") + "22", color: difficultyColor[meal.difficulty] || "#999", padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, textTransform: "capitalize", flexShrink: 0, marginLeft: 8 }}>{meal.difficulty}</span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 12, lineHeight: 1.5 }}>{meal.description}</p>
              <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 13 }}>
                <span style={{ color: "var(--accent)", fontWeight: 500 }}>{"\u{1F525}"} {meal.estimatedCalories} cal</span>
                <span style={{ color: "var(--text-muted)" }}>{"\u23F1"} {meal.cookTime}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#6BBF7A", marginRight: 4 }}>Have:</span>
                {meal.haveIngredients?.map((ing, j) => (
                  <span key={j} style={{ background: "#E8F8EA", color: "#2D7A38", padding: "3px 8px", borderRadius: 8, fontSize: 12 }}>{ing}</span>
                ))}
              </div>
              {meal.needIngredients?.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#F4A261", marginRight: 4 }}>Need:</span>
                  {meal.needIngredients.map((ing, j) => (
                    <span key={j} style={{ background: "#FEF3E2", color: "#B87A2B", padding: "3px 8px", borderRadius: 8, fontSize: 12 }}>{ing}</span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {shoppingList?.length > 0 && (
            <div style={{ background: "var(--accent-light)", borderRadius: "var(--radius)", padding: 20, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Icons.ShoppingCart />
                <h3 className="serif" style={{ fontSize: 18, color: "var(--accent-dark)" }}>Shopping List</h3>
              </div>
              {shoppingList.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 14, color: "var(--accent-dark)" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          )}

          <button onClick={clearPlan} style={{ width: "100%", padding: "14px", borderRadius: "var(--radius)", border: "2px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 15, fontWeight: 500, cursor: "pointer", marginTop: 12 }}>
            Clear Plan
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== THEME PICKER ====================
function ThemePicker({ currentTheme, onThemeChange, onClose }) {
  return (
    <div className="fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", padding: 28, maxWidth: 360, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>Choose Your Vibe</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}><Icons.X /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Object.entries(THEMES).map(([key, theme]) => (
            <button key={key} onClick={() => onThemeChange(key)}
              style={{ padding: 14, borderRadius: "var(--radius-sm)", border: currentTheme === key ? "2px solid var(--accent)" : "2px solid var(--border)", background: currentTheme === key ? "var(--accent-light)" : "var(--bg)", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
              <span style={{ fontSize: 24, display: "block", marginBottom: 4 }}>{theme.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{theme.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
export default function Home() {
  const [activeTab, setActiveTab] = useState("scanner");
  const [theme, setTheme] = useState("rosegold");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = loadLocal("theme", "rosegold");
    setTheme(saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t = THEMES[theme];
    if (t) Object.entries(t.vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    saveLocal("theme", theme);
  }, [theme, mounted]);

  const tabs = [
    { id: "scanner", label: "Scan", icon: <Icons.Camera /> },
    { id: "fridge", label: "Fridge", icon: <Icons.Fridge /> },
    { id: "planner", label: "Plan", icon: <Icons.ChefHat /> },
  ];

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{"\u{1F957}"}</span>
          <h1 className="serif gradient-text" style={{ fontSize: 22, fontWeight: 600 }}>Nourish</h1>
        </div>
        <button onClick={() => setShowThemePicker(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, color: "var(--text-muted)" }} title="Change theme">
          <span style={{ fontSize: 18 }}>{THEMES[theme]?.emoji}</span>
        </button>
      </header>

      <main style={{ flex: 1, padding: 20, paddingBottom: 100, overflowY: "auto" }}>
        {activeTab === "scanner" && <MealScanner />}
        {activeTab === "fridge" && <MyFridge />}
        {activeTab === "planner" && <MealPlanner />}
      </main>

      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 520, background: "var(--bg-card)", borderTop: "1px solid var(--border)", display: "flex", padding: "8px 0", zIndex: 100 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 0", border: "none", background: "none", cursor: "pointer", color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)", transition: "color 0.2s", fontWeight: activeTab === tab.id ? 600 : 400 }}>
            <span style={{ transform: activeTab === tab.id ? "scale(1.15)" : "scale(1)", transition: "transform 0.2s" }}>{tab.icon}</span>
            <span style={{ fontSize: 11 }}>{tab.label}</span>
            {activeTab === tab.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", marginTop: -2 }} />}
          </button>
        ))}
      </nav>

      {showThemePicker && <ThemePicker currentTheme={theme} onThemeChange={t => { setTheme(t); setShowThemePicker(false); }} onClose={() => setShowThemePicker(false)} />}
    </div>
  );
}
