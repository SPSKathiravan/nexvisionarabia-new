import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useCounter(target: number, active: boolean, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0; const step = target / (duration / 16);
    const timer = setInterval(() => { start += step; if (start >= target) { setCount(target); clearInterval(timer); } else setCount(Math.floor(start)); }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
}

// ── Particle Canvas ───────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    const pts = Array.from({ length: 70 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: Math.random() * 1.5 + 0.5 }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0; if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = "rgba(196,160,48,0.7)"; ctx.fill(); });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => { const dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy); if (d < 130) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(196,160,48,${0.12 * (1 - d / 130)})`; ctx.lineWidth = 0.5; ctx.stroke(); } }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

// ── Stat Counter ──────────────────────────────────────────────────────────────
function StatItem({ value, suffix, label, active }: { value: number; suffix: string; label: string; active: boolean }) {
  const count = useCounter(value, active);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2.5rem,5vw,3.8rem)", color: "#C4A030", lineHeight: 1 }}>{count}{suffix}</div>
      <div style={{ fontSize: "0.78rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#888", marginTop: "0.4rem" }}>{label}</div>
    </div>
  );
}

// ── Shared Data ───────────────────────────────────────────────────────────────
const CLIENTS = ["SABIC", "Sipchem", "TASNEE", "SWCC", "JANA", "NAMA", "DAEAH E&C", "DAELIM", "GUSAN", "LARSEN & TOUBRO", "NHME GROUP", "POWERCHINA", "SINOHYDRO", "SINOPEC", "TECNICAS REUNIDAS", "HYUNDAI E&C"];

const MANPOWER_CATS = [
  { title: "Engineers", items: ["Planning Engineer", "Field Engineer", "Cost Engineer", "Safety Engineer", "Contract Engineer", "Civil Engineer", "Instrument Engineer", "Piping Engineer", "Mechanical Engineer", "Electrical Engineer", "Commissioning Engineer", "QA/QC Engineer", "Well Test Engineer"] },
  { title: "Supervisors", items: ["Civil Supervisor", "Mechanical Supervisor", "Piping Supervisor", "Electrical Supervisor", "Instrument Supervisor", "Safety Supervisor", "Commissioning Supervisor", "Welding Supervisor", "Painting Supervisor", "Well Test Supervisor"] },
  { title: "Foremen", items: ["Civil Foreman", "Mechanical Foreman", "Piping Foreman", "Welding Foreman", "Structural Foreman", "Instrument Foreman", "Electrical Foreman", "Insulation Foreman", "Rigger Foreman"] },
  { title: "Technicians & Fitters", items: ["Millwright Technician", "Electrical Technician", "Instrument Technician", "Mechanical Fitter", "Instrument Fitter", "Millwright Fitter"] },
  { title: "Fabricators & Trades", items: ["Pipe Fabricator", "Steel Fabricator", "Fabricator", "Duct Fabricator", "Concrete Worker", "Steel Fitter", "Steel Erector", "Duct Fitter"] },
  { title: "Welders", items: ["TIG Welder", "ARC Welder", "General Welder", "Structural Welder", "Pipe Welder", "Butt Welder"] },
  { title: "Safety & Support", items: ["Safety Officer", "Rigger Level I, II & III", "Scaffolder", "Work Permit Receiver", "Fire Watchman", "Standby Man", "Skilled Labor", "Unskilled Labor"] },
  { title: "Operators & Drivers", items: ["Crane Operator", "Forklift Operator", "Heavy Driver", "Light Driver", "Well Test Operator"] },
  { title: "Skilled Trades", items: ["Carpenter", "Mason", "Spray Painter", "Painter", "Sandblaster"] },
  { title: "Controllers & Inspectors", items: ["Cost Controller", "Material Controller", "Document Controller", "QA/QC Inspector"] },
  { title: "Administrative", items: ["Accountant", "Store Keeper"] },
];

const MATERIAL_CATS = [
  { title: "Construction & Building Materials", items: ["Wire Mesh", "Formwork Shuttering Clamps", "Construction Wood & Carpentry Wood", "Sheet Materials", "Specialty Adhesives", "Tools & Accessories", "Supplementary Cementing Materials", "Construction Sand", "Steel Rebar", "Steel Wire Rods", "Aggregates", "Chemical Admixtures"] },
  { title: "Mechanical Materials", items: ["Steel Pipes & Fittings", "Grooved Fittings", "Copper, Brass Pipes & Fittings", "Soldering & Welding Products", "Gauges & Meters", "Solvents, Adhesives & Cleaners", "Chlorine & Water Filters", "Bars & Tubes", "Pressure Tanks", "Sheets & Plates", "Clamps, Joints & Couplings", "Pipes, Fittings & Drains", "Arrestors", "Flanges", "Gaskets"] },
  { title: "Electrical Components & Fittings", items: ["Circuit Breakers", "Switches & Sockets", "Electrical Panels & Distribution Boards", "Cable Glands & Lugs", "Conduits & Conduit Fittings (PVC, GI, EMT)", "Busbars & Busbar Supports", "MCBs, MCCBs & Contactors", "Terminal Blocks & Connectors"] },
  { title: "Machineries & Tools", items: ["Machine Shop Equipment", "Automotive Tools", "Light Towers", "Hydraulic System", "Power Tools", "Welding Machine", "Angle Grinder", "Hand Tools", "Plumbing Tools", "Construction Equipment"] },
  { title: "Safety Materials", items: ["Safety Helmet", "Safety Vest", "Safety Harness", "Safety Shoes", "Safety Glasses", "Protective Glasses", "Face Shield Cover & Holder", "Ear Plug", "Face Mask / N95 / Respirator 3M", "Surgical & Nitrile & TIG Gloves", "Coverall", "Leather Apron", "Welding Gloves, Glass & Shield", "Fire Blanket, Bucket & Extinguishers", "First Aid Kit", "Smoke Detector", "Barricade Tapes", "Industrial Cleaning Tools", "Workwear", "Fall Protection", "Eye Wash & Shower"] },
];

const EQUIPMENT_CATS = [
  { title: "Earthmoving", items: ["Skid Steers", "Backhoe Loaders", "Wheel Loaders", "Excavators", "Dozers"], icon: "🚜" },
  { title: "Material Handling", items: ["Forklifts", "Tele Handlers", "Cranes", "Transportations"], icon: "🏗️" },
  { title: "Power & Portable Machinery", items: ["Generators", "Welders", "Mega Units Generator", "Tower Lights"], icon: "⚡" },
  { title: "Air Compressor & Access Equipment", items: ["Air Compressor", "Scissor Lifts", "Boom Lifts"], icon: "🔧" },
];

// ── Global Styles ─────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #0A0A0A; color: #F0EDE6; font-family: 'Inter', sans-serif; overflow-x: hidden; }
  ::selection { background: #C4A030; color: #000; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #0A0A0A; }
  ::-webkit-scrollbar-thumb { background: #C4A030; border-radius: 3px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:none; } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes marquee { from { transform:translateX(0); } to { transform:translateX(-50%); } }
  @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
  .gold-btn { background: linear-gradient(135deg,#C4A030,#E8C84A); color:#0A0A0A; font-weight:700; border:none; cursor:pointer; transition:all 0.3s; font-family:'Inter',sans-serif; }
  .gold-btn:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(196,160,48,0.45); }
  .outline-btn { background:transparent; border:2px solid #C4A030; color:#C4A030; font-weight:600; cursor:pointer; transition:all 0.3s; font-family:'Inter',sans-serif; }
  .outline-btn:hover { background:#C4A030; color:#0A0A0A; transform:translateY(-2px); }
  .nav-link { position:relative; background:none; border:none; color:#ddd; font-size:0.88rem; font-weight:500; cursor:pointer; font-family:'Inter',sans-serif; transition:color 0.2s; padding:0; }
  .nav-link::after { content:''; position:absolute; bottom:-4px; left:0; width:0; height:2px; background:#C4A030; transition:width 0.3s; }
  .nav-link:hover { color:#C4A030; }
  .nav-link:hover::after, .nav-link.active-link::after { width:100%; }
  .nav-link.active-link { color:#C4A030; }
  .section-tag { font-size:0.72rem; letter-spacing:0.22em; text-transform:uppercase; color:#C4A030; font-weight:600; }
  .section-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(2rem,4vw,3rem); letter-spacing:0.04em; line-height:1.1; color:#F0EDE6; }
  .gold-line { width:48px; height:3px; background:linear-gradient(90deg,#C4A030,#E8C84A); border-radius:2px; }
  .tab-btn { background:none; border:1px solid #2a2a2a; color:#888; padding:0.65rem 1.4rem; border-radius:0.35rem; cursor:pointer; font-family:'Inter',sans-serif; font-size:0.85rem; font-weight:500; transition:all 0.25s; white-space:nowrap; }
  .tab-btn.active, .tab-btn:hover { border-color:#C4A030; color:#C4A030; background:rgba(196,160,48,0.08); }
  input, textarea { background:#111; border:1px solid #2a2a2a; color:#F0EDE6; border-radius:0.5rem; padding:0.85rem 1rem; font-family:'Inter',sans-serif; font-size:0.9rem; width:100%; outline:none; transition:border-color 0.3s; }
  input:focus, textarea:focus { border-color:#C4A030; }
  input::placeholder, textarea::placeholder { color:#555; }
  .marquee-wrap { overflow:hidden; mask-image:linear-gradient(90deg,transparent,black 8%,black 92%,transparent); }
  .marquee-track { display:flex; gap:1.5rem; animation:marquee 35s linear infinite; white-space:nowrap; }
  .marquee-track:hover { animation-play-state:paused; }
  @media (max-width:768px) { .desktop-nav { display:none !important; } .mobile-btn { display:flex !important; } }
  @media (min-width:769px) { .mobile-btn { display:none !important; } }
`;

// ── Navbar (shared) ───────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { const fn = () => setScrolled(window.scrollY > 50); window.addEventListener("scroll", fn); return () => window.removeEventListener("scroll", fn); }, []);

  const goTo = (path: string, hash?: string) => {
    setMenuOpen(false);
    if (path === location.pathname) {
      if (hash) { setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 50); }
      else { window.scrollTo({ top: 0, behavior: "smooth" }); }
    } else {
      navigate(path);
      if (hash) { setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 300); }
    }
  };

  const isHome = location.pathname === "/";
  const isServices = location.pathname === "/services";

  const NAV = [
    { label: "Home", action: () => goTo("/") },
    { label: "About", action: () => goTo("/", "#about") },
    { label: "Our Services", action: () => goTo("/services") },
    { label: "Clients", action: () => goTo("/", "#clients") },
    { label: "Contact", action: () => goTo("/", "#contact") },
  ];

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? "rgba(8,8,8,0.96)" : "transparent", backdropFilter: scrolled ? "blur(14px)" : "none", borderBottom: scrolled ? "1px solid #1a1a1a" : "none", transition: "all 0.4s", padding: scrolled ? "0.6rem 2rem" : "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }} onClick={() => goTo("/")}>
        <div style={{ width: 42, height: 42, background: "linear-gradient(135deg,#C4A030,#7a6010)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "1rem", color: "#000", letterSpacing: "0.05em" }}>NV</div>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.05rem", letterSpacing: "0.12em", color: "#F0EDE6" }}>NEX VISION <span style={{ color: "#C4A030" }}>ARABIA</span></div>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.18em", color: "#666", textTransform: "uppercase" }}>Manpower · Equipment · Material</div>
        </div>
      </div>

      {/* Desktop Nav */}
      <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
        {NAV.map(({ label, action }) => {
          const isActive = (label === "Home" && isHome) || (label === "Our Services" && isServices);
          return (
            <button key={label} className={`nav-link${isActive ? " active-link" : ""}`} onClick={action}>{label}</button>
          );
        })}
        <button className="gold-btn" onClick={() => goTo("/", "#contact")} style={{ padding: "0.55rem 1.4rem", borderRadius: "0.4rem", fontSize: "0.85rem" }}>Get In Touch</button>
      </div>

      {/* Mobile */}
      <button className="mobile-btn" onClick={() => setMenuOpen(m => !m)} style={{ display: "none", background: "none", border: "1px solid #2a2a2a", color: "#F0EDE6", borderRadius: "0.4rem", padding: "0.5rem 0.7rem", cursor: "pointer", flexDirection: "column", gap: "4px" }}>
        {[0, 1, 2].map(i => <span key={i} style={{ display: "block", width: 20, height: 2, background: "#C4A030", borderRadius: 2 }} />)}
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(0,0,0,0.97)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2rem", animation: "fadeIn 0.25s ease" }}>
          <button onClick={() => setMenuOpen(false)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "none", border: "none", color: "#888", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
          {NAV.map(({ label, action }) => (
            <button key={label} onClick={action} style={{ background: "none", border: "none", color: "#F0EDE6", fontFamily: "'Bebas Neue',sans-serif", fontSize: "2.2rem", letterSpacing: "0.1em", cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      )}
    </nav>
  );
}

// ── Footer (shared) ───────────────────────────────────────────────────────────
function Footer() {
  const navigate = useNavigate();
  const goTo = (path: string, hash?: string) => {
    if (path === window.location.pathname) { if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 50); }
    else { navigate(path); if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 300); }
  };
  return (
    <footer style={{ background: "#050505", borderTop: "1px solid #1a1a1a", padding: "4rem 2rem 2rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "3rem", marginBottom: "3rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "1rem" }}>
              <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#C4A030,#7a6010)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "0.9rem", color: "#000" }}>NV</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "0.95rem", letterSpacing: "0.1em" }}>NEX VISION <span style={{ color: "#C4A030" }}>ARABIA</span></div>
            </div>
            <p style={{ color: "#555", fontSize: "0.82rem", lineHeight: 1.8 }}>Industrial Solutions, Quality Revolution. Serving Saudi Arabia with manpower, equipment, and material supply.</p>
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#C4A030", marginBottom: "1.2rem" }}>Quick Links</div>
            {[["Home", "/", ""], ["About", "/", "#about"], ["Our Services", "/services", ""], ["Clients", "/", "#clients"], ["Contact", "/", "#contact"]].map(([l, p, h]) => (
              <div key={l} style={{ marginBottom: "0.5rem" }}>
                <button onClick={() => goTo(p, h || undefined)} style={{ background: "none", border: "none", color: "#555", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: 0, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = "#C4A030"}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "#555"}>{l}</button>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#C4A030", marginBottom: "1.2rem" }}>Services</div>
            {["Manpower Supply", "Equipment Rental", "Material Supply"].map(l => (
              <div key={l} style={{ marginBottom: "0.5rem" }}>
                <button onClick={() => goTo("/services")} style={{ background: "none", border: "none", color: "#555", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: 0, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = "#C4A030"}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "#555"}>{l}</button>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#C4A030", marginBottom: "1.2rem" }}>Contact</div>
            <div style={{ color: "#555", fontSize: "0.82rem", lineHeight: 2 }}>Al Khobar, Al Jubail, KSA<br />+966 53 763 7629<br />info@nexvisionarabia.com<br />www.nexvisionarabia.com</div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ color: "#444", fontSize: "0.78rem" }}>© 2026 Nexvision Arabia. All rights reserved.</div>
          <div style={{ color: "#444", fontSize: "0.78rem" }}>Al Khobar · Al Jubail · Kingdom of Saudi Arabia</div>
        </div>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── HOME PAGE ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function HomePage() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [formState, setFormState] = useState({ name: "", email: "", phone: "", message: "" });
  const [formSent, setFormSent] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsActive, setStatsActive] = useState(false);
  const navigate = useNavigate();

  const SLIDES = [
    { tag: "Industrial Solutions, Quality Revolution", headline: "Smart Solutions.", headline2: "Flexible Service.", headline3: "Reliable Results.", sub: "Manpower Supply · Equipment Rental · Material Supply" },
    { tag: "Kingdom of Saudi Arabia", headline: "Right People.", headline2: "Right Skills.", headline3: "Right Results.", sub: "Serving Construction, Oil & Gas, Infrastructure & Industrial Projects" },
    { tag: "Trusted Since Day One", headline: "Trusted Materials,", headline2: "Stronger", headline3: "Foundations.", sub: "Al Khobar · Al Jubail · Kingdom of Saudi Arabia" },
  ];

  useEffect(() => { const t = setInterval(() => setHeroIdx(i => (i + 1) % SLIDES.length), 5000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const el = statsRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsActive(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  const scroll = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

  const VALUES = [
    { title: "Safety", desc: "Prioritizing the well-being of our team, clients, and project sites through safe and responsible work practices.", icon: "🛡️" },
    { title: "Quality", desc: "Providing reliable materials, well-maintained equipment, and skilled manpower that meet high industry standards.", icon: "✅" },
    { title: "Performance", desc: "Delivering efficient, timely, and professional solutions that support the successful completion of every project.", icon: "⚡" },
    { title: "Reliability", desc: "Building long-term trust through dependable service, consistent support, and a strong commitment to client satisfaction.", icon: "🤝" },
  ];

  const { ref: aboutRef, visible: aboutVis } = useInView();
  const { ref: valRef, visible: valVis } = useInView();
  const { ref: clientRef, visible: clientVis } = useInView();
  const { ref: ctaRef, visible: ctaVis } = useInView();

  return (
    <>
      {/* ── HERO ── */}
      <section id="home" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#0A0A0A 0%,#111008 60%,#0A0A0A 100%)" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "45%", height: "100%", background: "linear-gradient(135deg, transparent 40%, rgba(196,160,48,0.04) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "2px", background: "linear-gradient(90deg, transparent, #C4A030, transparent)" }} />
        <ParticleCanvas />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 1000, margin: "0 auto", padding: "8rem 2rem 4rem" }}>
          <div key={heroIdx} style={{ animation: "fadeUp 0.7s ease" }}>
            <div className="section-tag" style={{ marginBottom: "1.2rem" }}>{SLIDES[heroIdx].tag}</div>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(3rem,8vw,6rem)", letterSpacing: "0.02em", lineHeight: 1.0, marginBottom: "1.5rem" }}>
              <span style={{ color: "#C4A030" }}>{SLIDES[heroIdx].headline}</span><br />
              <span style={{ color: "#F0EDE6" }}>{SLIDES[heroIdx].headline2}</span><br />
              <span style={{ color: "#C4A030" }}>{SLIDES[heroIdx].headline3}</span>
            </h1>
            <p style={{ color: "#888", fontSize: "1rem", marginBottom: "2.5rem", maxWidth: 520, lineHeight: 1.7 }}>{SLIDES[heroIdx].sub}</p>
          </div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button className="gold-btn" onClick={() => navigate("/services")} style={{ padding: "0.9rem 2.2rem", borderRadius: "0.4rem", fontSize: "0.9rem" }}>Explore Services →</button>
            <button className="outline-btn" onClick={() => scroll("#contact")} style={{ padding: "0.9rem 2.2rem", borderRadius: "0.4rem", fontSize: "0.9rem" }}>Contact Us</button>
          </div>
          <div style={{ marginTop: "3rem", display: "flex", gap: "0.5rem" }}>
            {SLIDES.map((_, i) => <button key={i} onClick={() => setHeroIdx(i)} style={{ width: i === heroIdx ? 28 : 7, height: 4, borderRadius: 2, background: i === heroIdx ? "#C4A030" : "#333", border: "none", cursor: "pointer", transition: "all 0.4s" }} />)}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", animation: "float 2s ease-in-out infinite", opacity: 0.4 }}>
          <div style={{ width: 1, height: 36, background: "linear-gradient(to bottom,transparent,#C4A030)" }} />
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#888" }}>SCROLL</div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div ref={statsRef} style={{ background: "#0d0d0d", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", padding: "0.75rem 2rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "2rem" }}>
          {[{ value: 16, suffix: "+", label: "Clients Served" }, { value: 3, suffix: "", label: "Core Services" }, { value: 100, suffix: "%", label: "Client Focus" }, { value: 50, suffix: "+", label: "Trade Roles" }].map((s, i) => <StatItem key={i} {...s} active={statsActive} />)}
        </div>
      </div>

      {/* ── ABOUT ── */}
      <section id="about" style={{ padding: "7rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div ref={aboutRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "5rem", alignItems: "center" }}>
            <div style={{ opacity: aboutVis ? 1 : 0, transform: aboutVis ? "none" : "translateX(-30px)", transition: "all 0.7s ease" }}>
              <div className="section-tag" style={{ marginBottom: "0.75rem" }}>Who We Are</div>
              <h2 className="section-title" style={{ marginBottom: "1rem" }}>NEXVISION <span style={{ color: "#C4A030" }}>ARABIA</span></h2>
              <div className="gold-line" style={{ marginBottom: "1.5rem" }} />
              <p style={{ color: "#999", lineHeight: 1.85, marginBottom: "1.25rem", fontSize: "0.95rem" }}>Nexvision Arabia is a reliable and progressive service provider based in the Kingdom of Saudi Arabia, offering complete solutions in material supply, equipment rental, and manpower support. With a strong focus on quality, safety, and service excellence, we support various sectors including construction, oil & gas, infrastructure, and industrial projects.</p>
              <p style={{ color: "#999", lineHeight: 1.85, fontSize: "0.95rem", marginBottom: "2rem" }}>We are specialized in supplying quality materials, providing dependable and well-maintained equipment, and arranging skilled manpower to meet the changing needs of our clients. Our team works with professionalism, efficiency, and a customer-focused approach, ensuring every project is delivered on time and completed to the highest standards.</p>
              <button className="gold-btn" onClick={() => navigate("/services")} style={{ padding: "0.8rem 2rem", borderRadius: "0.4rem", fontSize: "0.88rem" }}>Our Services →</button>
            </div>
            <div style={{ opacity: aboutVis ? 1 : 0, transform: aboutVis ? "none" : "translateX(30px)", transition: "all 0.7s 0.15s ease", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                { label: "VISION", text: "Our vision is to become a trusted and leading service provider in the Kingdom of Saudi Arabia, delivering reliable solutions in material supply, equipment rental, and manpower support. We aim to maintain the highest standards of quality, safety, and professionalism while continuously improving our services to exceed client expectations." },
                { label: "MISSION", text: "Our mission is to support our clients with dependable materials, well-maintained equipment, and skilled manpower that meet their project requirements. We are committed to building long-term partnerships through timely service, efficient operations, and customer-focused solutions for construction, oil & gas, infrastructure, and industrial projects." },
              ].map(({ label, text }) => (
                <div key={label} style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderLeft: "3px solid #C4A030", borderRadius: "0.5rem", padding: "1.75rem" }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.15rem", letterSpacing: "0.12em", color: "#C4A030", marginBottom: "0.75rem" }}>{label}</div>
                  <p style={{ color: "#888", fontSize: "0.88rem", lineHeight: 1.8 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Values */}
          <div ref={valRef} style={{ marginTop: "5rem" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <div className="section-tag" style={{ marginBottom: "0.6rem" }}>Our Values</div>
              <h2 className="section-title">What <span style={{ color: "#C4A030" }}>Drives Us</span></h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1.25rem" }}>
              {VALUES.map((v, i) => (
                <div key={v.title} style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "0.75rem", padding: "2rem", opacity: valVis ? 1 : 0, transform: valVis ? "none" : "translateY(24px)", transition: `all 0.5s ease ${i * 0.1}s` }}>
                  <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{v.icon}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.2rem", letterSpacing: "0.08em", color: "#C4A030", marginBottom: "0.6rem" }}>{v.title}</div>
                  <p style={{ color: "#777", fontSize: "0.85rem", lineHeight: 1.75 }}>{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES TEASER ── */}
      <section style={{ padding: "5rem 2rem", background: "#080808" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div className="section-tag" style={{ marginBottom: "0.75rem" }}>What We Offer</div>
          <h2 className="section-title" style={{ marginBottom: "1rem" }}>Our <span style={{ color: "#C4A030" }}>Core Services</span></h2>
          <p style={{ color: "#666", fontSize: "0.9rem", maxWidth: 500, margin: "0 auto 3rem" }}>Complete industrial solutions across three core pillars — click to explore all details.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
            {[
              { icon: "👷", title: "Manpower Supply", desc: "Skilled, certified workers across all trades — Engineers, Supervisors, Welders, Technicians and more, ready to deploy across KSA projects.", tab: "manpower" },
              { icon: "📦", title: "Material Supply", desc: "Construction, mechanical, electrical, and safety materials sourced and delivered — trusted materials for stronger foundations.", tab: "material" },
              { icon: "🚜", title: "Equipment Rental", desc: "Heavy machinery fleet including excavators, cranes, forklifts, generators, and access equipment for all project scales.", tab: "equipment" },
            ].map((s, i) => (
              <div key={s.title} onClick={() => navigate("/services", { state: { tab: s.tab } })}
                style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "1rem", padding: "2.5rem 2rem", cursor: "pointer", transition: "all 0.3s", textAlign: "left" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C4A030"; (e.currentTarget as HTMLElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(196,160,48,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>{s.icon}</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.35rem", letterSpacing: "0.06em", color: "#C4A030", marginBottom: "0.75rem" }}>{s.title}</div>
                <p style={{ color: "#777", fontSize: "0.88rem", lineHeight: 1.75, marginBottom: "1.25rem" }}>{s.desc}</p>
                <div style={{ color: "#C4A030", fontSize: "0.82rem", fontWeight: 600 }}>View Details →</div>
              </div>
            ))}
          </div>
          <button className="gold-btn" onClick={() => navigate("/services")} style={{ padding: "0.9rem 2.5rem", borderRadius: "0.45rem", fontSize: "0.92rem" }}>View All Services →</button>
        </div>
      </section>

      {/* ── CLIENTS ── */}
      <section id="clients" style={{ padding: "7rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div ref={clientRef} style={{ textAlign: "center", marginBottom: "4rem", opacity: clientVis ? 1 : 0, transform: clientVis ? "none" : "translateY(20px)", transition: "all 0.6s ease" }}>
            <div className="section-tag" style={{ marginBottom: "0.6rem" }}>Our Clients</div>
            <h2 className="section-title">Trusted By <span style={{ color: "#C4A030" }}>Industry Leaders</span></h2>
            <p style={{ color: "#666", marginTop: "1rem", fontSize: "0.9rem", maxWidth: 600, margin: "1rem auto 0" }}>We have proven our commitments by providing quality, timely and cost-effective services to our esteemed and valuable clients.</p>
          </div>
          <div className="marquee-wrap">
            <div className="marquee-track">
              {[...CLIENTS, ...CLIENTS].map((c, i) => (
                <div key={i} style={{ padding: "0.85rem 1.75rem", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "0.45rem", color: "#888", fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.04em", whiteSpace: "nowrap", transition: "all 0.3s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C4A030"; (e.currentTarget as HTMLElement).style.color = "#C4A030"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#888"; }}>{c}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div ref={ctaRef} style={{ background: "linear-gradient(135deg,#111008,#1a1500)", borderTop: "1px solid #2a2000", borderBottom: "1px solid #2a2000", padding: "5rem 2rem", textAlign: "center", opacity: ctaVis ? 1 : 0, transform: ctaVis ? "none" : "translateY(20px)", transition: "all 0.6s ease" }}>
        <div className="section-tag" style={{ marginBottom: "1rem" }}>Industrial Solutions, Quality Revolution</div>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "0.04em", color: "#F0EDE6", marginBottom: "0.5rem" }}>SMART SOLUTIONS. FLEXIBLE SERVICE.</h2>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "0.04em", color: "#C4A030", marginBottom: "1.5rem" }}>RELIABLE RESULTS.</h2>
        <p style={{ color: "#777", fontSize: "0.95rem", maxWidth: 500, margin: "0 auto 2.5rem" }}>Partner with Nexvision Arabia for all your manpower, equipment, and material needs across Saudi Arabia.</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="gold-btn" onClick={() => scroll("#contact")} style={{ padding: "0.95rem 2.5rem", borderRadius: "0.45rem", fontSize: "0.95rem" }}>Start Your Project →</button>
          <button className="outline-btn" onClick={() => navigate("/services")} style={{ padding: "0.95rem 2.5rem", borderRadius: "0.45rem", fontSize: "0.95rem" }}>View Services</button>
        </div>
      </div>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ padding: "7rem 2rem", background: "#080808" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "4rem" }}>
          <div>
            <div className="section-tag" style={{ marginBottom: "0.75rem" }}>Get In Touch</div>
            <h2 className="section-title" style={{ marginBottom: "1rem" }}>Contact <span style={{ color: "#C4A030" }}>Us</span></h2>
            <div className="gold-line" style={{ marginBottom: "1.75rem" }} />
            <p style={{ color: "#777", fontSize: "0.9rem", lineHeight: 1.8, marginBottom: "2.5rem" }}>Connect with us to get the right materials, equipment, and skilled manpower for your next project in Saudi Arabia.</p>
            {[{ icon: "📍", label: "Location", value: "Al Khobar, Al Jubail, Kingdom of Saudi Arabia" }, { icon: "📞", label: "Phone", value: "+966 53 763 7629" }, { icon: "✉️", label: "Email", value: "info@nexvisionarabia.com" }, { icon: "🌐", label: "Website", value: "www.nexvisionarabia.com" }].map(({ icon, label, value }) => (
              <div key={label} style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "flex-start" }}>
                <div style={{ width: 42, height: 42, background: "rgba(196,160,48,0.08)", border: "1px solid rgba(196,160,48,0.2)", borderRadius: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.2rem" }}>{label}</div>
                  <div style={{ color: "#ccc", fontSize: "0.9rem" }}>{value}</div>
                </div>
              </div>
            ))}
            <a href="https://api.whatsapp.com/send?phone=966537637629" target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", background: "#25D366", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "0.45rem", textDecoration: "none", fontWeight: 600, fontSize: "0.88rem", marginTop: "0.5rem", transition: "all 0.25s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(37,211,102,0.35)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              WhatsApp Us
            </a>
          </div>
          <div>
            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "1rem", padding: "2.5rem" }}>
              <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", letterSpacing: "0.06em", color: "#F0EDE6", marginBottom: "1.5rem" }}>Send a Message</h3>
              {formSent ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", color: "#C4A030", letterSpacing: "0.06em" }}>Message Sent!</div>
                  <p style={{ color: "#666", marginTop: "0.5rem", fontSize: "0.88rem" }}>We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); setFormSent(true); setTimeout(() => setFormSent(false), 4000); setFormState({ name: "", email: "", phone: "", message: "" }); }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <input placeholder="Full Name" value={formState.name} onChange={e => setFormState(s => ({ ...s, name: e.target.value }))} required />
                    <input type="email" placeholder="Email Address" value={formState.email} onChange={e => setFormState(s => ({ ...s, email: e.target.value }))} required />
                  </div>
                  <input placeholder="Phone Number" value={formState.phone} onChange={e => setFormState(s => ({ ...s, phone: e.target.value }))} />
                  <textarea placeholder="Tell us about your project requirements..." rows={5} value={formState.message} onChange={e => setFormState(s => ({ ...s, message: e.target.value }))} required style={{ resize: "vertical" }} />
                  <button type="submit" className="gold-btn" style={{ padding: "1rem", borderRadius: "0.45rem", fontSize: "0.92rem", marginTop: "0.25rem" }}>Send Message →</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SERVICES PAGE ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function ServicesPage() {
  const location = useLocation();
  const initialTab = (location.state as any)?.tab || "manpower";
  const [activeTab, setActiveTab] = useState(initialTab);
  const { ref: s1Ref, visible: s1Vis } = useInView(0.05);
  const { ref: s2Ref, visible: s2Vis } = useInView(0.05);
  const { ref: s3Ref, visible: s3Vis } = useInView(0.05);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { if ((location.state as any)?.tab) setActiveTab((location.state as any).tab); }, [location.state]);

  return (
    <div style={{ paddingTop: "6rem", minHeight: "100vh", background: "#0A0A0A" }}>
      {/* Page Hero */}
      <div style={{ background: "linear-gradient(135deg,#0A0A0A,#111008)", borderBottom: "1px solid #1a1a1a", padding: "4rem 2rem 3rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 300, background: "radial-gradient(ellipse, rgba(196,160,48,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="section-tag" style={{ marginBottom: "0.75rem" }}>What We Offer</div>
        <h1 className="section-title" style={{ fontSize: "clamp(2.5rem,6vw,4rem)", marginBottom: "1rem" }}>Our <span style={{ color: "#C4A030" }}>Services</span></h1>
        <p style={{ color: "#666", fontSize: "0.95rem", maxWidth: 560, margin: "0 auto" }}>Complete industrial solutions — Manpower Supply, Material Supply, and Equipment Rental — tailored to your project needs across Saudi Arabia.</p>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 2rem" }}>
        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "3.5rem" }}>
          {[["manpower", "👷 Manpower Supply"], ["material", "📦 Material Supply"], ["equipment", "🚜 Equipment Rental"]].map(([k, l]) => (
            <button key={k} className={`tab-btn${activeTab === k ? " active" : ""}`} onClick={() => setActiveTab(k)} style={{ fontSize: "0.92rem", padding: "0.8rem 2rem" }}>{l}</button>
          ))}
        </div>

        {/* ── MANPOWER ── */}
        {activeTab === "manpower" && (
          <div ref={s1Ref} style={{ opacity: s1Vis ? 1 : 0, transform: s1Vis ? "none" : "translateY(20px)", transition: "all 0.5s ease" }}>
            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "1rem", padding: "2.5rem", marginBottom: "2.5rem" }}>
              <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "2rem", letterSpacing: "0.06em", color: "#C4A030", marginBottom: "0.75rem" }}>MANPOWER SUPPLY</h2>
              <div className="gold-line" style={{ marginBottom: "1.25rem" }} />
              <p style={{ color: "#888", lineHeight: 1.85, fontSize: "0.95rem", maxWidth: 850, marginBottom: "1rem" }}>Nexvision Arabia offers professional manpower support services designed to meet the requirements of construction, industrial, infrastructure, and oil & gas projects across Saudi Arabia. We provide skilled, reliable, and experienced workers who can support daily operations and help clients complete their projects safely, efficiently, and on schedule. Our manpower solutions are focused on quality, flexibility, and client satisfaction.</p>
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
                {["Right People", "Right Skills", "Right Results"].map(t => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C4A030" }} />
                    <span style={{ color: "#C4A030", fontWeight: 700, fontSize: "0.88rem", letterSpacing: "0.06em" }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: "1.1rem" }}>
              {MANPOWER_CATS.map((cat, i) => (
                <div key={cat.title} style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "0.65rem", padding: "1.5rem", opacity: s1Vis ? 1 : 0, transform: s1Vis ? "none" : "translateY(16px)", transition: `all 0.45s ease ${i * 0.04}s` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C4A030"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "0.95rem", letterSpacing: "0.1em", color: "#C4A030", marginBottom: "0.75rem", borderBottom: "1px solid #1e1e1e", paddingBottom: "0.5rem" }}>{cat.title}</div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {cat.items.map(item => (
                      <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", color: "#777", fontSize: "0.8rem", lineHeight: 1.5 }}>
                        <span style={{ color: "#C4A030", marginTop: "0.15rem", flexShrink: 0 }}>›</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MATERIAL ── */}
        {activeTab === "material" && (
          <div ref={s2Ref} style={{ opacity: s2Vis ? 1 : 0, transform: s2Vis ? "none" : "translateY(20px)", transition: "all 0.5s ease" }}>
            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "1rem", padding: "2.5rem", marginBottom: "2.5rem" }}>
              <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "2rem", letterSpacing: "0.06em", color: "#C4A030", marginBottom: "0.75rem" }}>MATERIAL SUPPLY</h2>
              <div className="gold-line" style={{ marginBottom: "1.25rem" }} />
              <p style={{ color: "#888", lineHeight: 1.85, fontSize: "0.95rem", maxWidth: 850, marginBottom: "1.25rem" }}>Nexvision Arabia provides a comprehensive range of industrial and construction materials to support projects across Saudi Arabia. From construction basics to specialized mechanical and safety equipment, we deliver trusted materials that form stronger foundations for every project.</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(196,160,48,0.08)", border: "1px solid rgba(196,160,48,0.2)", borderRadius: "0.35rem", padding: "0.55rem 1.2rem" }}>
                <span style={{ color: "#C4A030", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.08em" }}>TRUSTED MATERIALS, STRONGER FOUNDATIONS</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: "1.25rem" }}>
              {MATERIAL_CATS.map((cat, i) => (
                <div key={cat.title} style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "0.75rem", padding: "1.75rem", opacity: s2Vis ? 1 : 0, transform: s2Vis ? "none" : "translateY(16px)", transition: `all 0.45s ease ${i * 0.07}s` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C4A030"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1rem", letterSpacing: "0.08em", color: "#C4A030", marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #1e1e1e" }}>{cat.title}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {cat.items.map(item => (
                      <span key={item} style={{ background: "#111", border: "1px solid #222", color: "#888", fontSize: "0.75rem", padding: "0.28rem 0.65rem", borderRadius: "0.3rem" }}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EQUIPMENT ── */}
        {activeTab === "equipment" && (
          <div ref={s3Ref} style={{ opacity: s3Vis ? 1 : 0, transform: s3Vis ? "none" : "translateY(20px)", transition: "all 0.5s ease" }}>
            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "1rem", padding: "2.5rem", marginBottom: "2.5rem" }}>
              <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "2rem", letterSpacing: "0.06em", color: "#C4A030", marginBottom: "0.75rem" }}>EQUIPMENT RENTAL</h2>
              <div className="gold-line" style={{ marginBottom: "1.25rem" }} />
              <p style={{ color: "#888", lineHeight: 1.85, fontSize: "0.95rem", maxWidth: 850 }}>Nexvision Arabia is a trusted provider of heavy equipment, offering a comprehensive range tailored to the demands of construction, infrastructure development, and industrial applications. Our inventory includes a diverse selection of heavy equipment — excavators, loaders, compactors, and more — sourced from reputable manufacturers renowned for their reliability and performance. Whether you're engaged in earthmoving, material handling, or road construction, our commitment to excellence ensures you have access to equipment that meets the highest standards of efficiency and durability.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "1.25rem" }}>
              {EQUIPMENT_CATS.map((cat, i) => (
                <div key={cat.title} style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "0.75rem", padding: "2rem", opacity: s3Vis ? 1 : 0, transform: s3Vis ? "none" : "translateY(16px)", transition: `all 0.45s ease ${i * 0.1}s` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C4A030"; (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
                  <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>{cat.icon}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.1rem", letterSpacing: "0.08em", color: "#C4A030", marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #1e1e1e" }}>{cat.title}</div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {cat.items.map(item => (
                      <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#777", fontSize: "0.88rem" }}>
                        <span style={{ color: "#C4A030" }}>›</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── APP SHELL ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function AppShell() {
  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
      </Routes>
      <Footer />
    </>
  );
}

export default function NexVisionArabia() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}