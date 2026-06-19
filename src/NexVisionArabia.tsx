import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.08) {
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
    <div style={{ textAlign: "center", padding: "0.5rem" }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(1.8rem,5vw,2.4rem)", color: "#C4A030", lineHeight: 1 }}>{count}{suffix}</div>
      <div style={{ fontSize: "clamp(0.6rem,2.5vw,0.65rem)", letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginTop: "0.3rem" }}>{label}</div>
    </div>
  );
}

// ── Shared Data ───────────────────────────────────────────────────────────────
const CLIENT_LOGOS = [
  "/images/client-1.png", "/images/client-2.png", "/images/client-3.png", "/images/client-4.png",
  "/images/client-5.png", "/images/client-6.png", "/images/client-7.png", "/images/client-8.png",
  "/images/client-9.png", "/images/client-10.png", "/images/client-11.png", "/images/client-12.png",
  "/images/client-13.png", "/images/client-14.png", "/images/client-15.png", "/images/client-16.png"
];

// ══════════════════════════════════════════════════════════════════════════════
// ── CATALOG CONFIGURATION ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

type InnerPage = { imgSrc: string };
type CatalogDef = {
  key: string;
  label: string;
  coverTitle: string;
  coverSub: string;
  coverImg: string;
  pages: InnerPage[];
};

function generateUnifiedPages(): InnerPage[] {
  return Array.from({ length: 6 }).map((_, i) => ({
    imgSrc: `/images/catalog-inner-${i + 1}.png`,
  }));
}

const MASTER_CATALOG: CatalogDef = {
  key: "master-catalog",
  label: "Catalog",
  coverTitle: "COMPANY CATALOG",
  coverSub: "Integrated Industrial Solutions",
  coverImg: "/images/catalog-cover.png",
  pages: generateUnifiedPages(),
};

function InnerPageView({ page }: { page: InnerPage }) {
  return (
    <div className="book-page" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
      <div className="book-page-imgbox" style={{ width: "100%", height: "100%", marginBottom: 0, borderRadius: 0, overflow: "hidden", background: "#111" }}>
        {page.imgSrc ? (
          <img src={page.imgSrc} alt="Catalog Page" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => console.error("Failed to load inner page image:", page.imgSrc)} />
        ) : (
          <div className="img-placeholder">
            <span>+</span>
            <small>Add PNG image here</small>
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogBookModal({ catalog, onClose }: { catalog: CatalogDef; onClose: () => void; }) {
  const [phase, setPhase] = useState<"cover" | "inner" | "back">("cover");
  const [spreadIdx, setSpreadIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    console.log("Catalog Opened:", catalog.key, "Cover Image Path:", catalog.coverImg);
  }, [catalog]);

  const TOTAL_SPREADS = Math.ceil(catalog.pages.length / 2);
  const leftPage  = catalog.pages[spreadIdx * 2];
  const rightPage = catalog.pages[spreadIdx * 2 + 1];

  const goNext = () => {
    if (phase === "cover") { setPhase("inner"); setSpreadIdx(0); setAnimKey(k => k + 1); }
    else if (phase === "inner") { if (spreadIdx < TOTAL_SPREADS - 1) { setSpreadIdx(i => i + 1); setAnimKey(k => k + 1); } else { setPhase("back"); } }
  };

  const goPrev = () => {
    if (phase === "back") { setPhase("inner"); setSpreadIdx(TOTAL_SPREADS - 1); setAnimKey(k => k + 1); }
    else if (phase === "inner") { if (spreadIdx > 0) { setSpreadIdx(i => i - 1); setAnimKey(k => k + 1); } else { setPhase("cover"); } }
  };

  const leftPageNum  = spreadIdx * 2 + 2;
  const rightPageNum = spreadIdx * 2 + 3;
  const totalPagesCount = catalog.pages.length + 2;

  return (
    <div className="catalog-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <button className="catalog-close" onClick={onClose}>✕</button>

      {phase === "cover" && (
        <div className="book-cover-card" onClick={goNext} style={{ cursor: "pointer", overflow: "hidden" }}>
          <div className="book-page-imgbox" style={{ position: "absolute", inset: 0, height: "100%", width: "100%", zIndex: 0 }}>
            {catalog.coverImg ? (
              <img src={catalog.coverImg} alt={catalog.coverTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => console.error("Cover image failed to load:", catalog.coverImg)} />
            ) : (
              <div className="img-placeholder"><span>+</span>Add cover PNG here</div>
            )}
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "2rem", display: "flex", justifyContent: "center", background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
            <button className="book-cover-open-btn">CLICK TO OPEN →</button>
          </div>
        </div>
      )}

      {phase === "inner" && (
        <div className="book-spread-wrap">
          <div className="spread-label">Pages {leftPageNum}–{rightPageNum} of {totalPagesCount}</div>
          <button className="nav-arrow left" onClick={goPrev} aria-label="Previous">‹</button>
          <div key={animKey} className="book-spread-pages" style={{ gap: 0 }}>
            <InnerPageView page={leftPage}  />
            <InnerPageView page={rightPage} />
          </div>
          <button className="nav-arrow right" onClick={goNext} aria-label="Next">›</button>
          <div className="dots-row">
            {Array.from({ length: TOTAL_SPREADS }).map((_, i) => (
              <button key={i} className={`dot${i === spreadIdx ? " active" : ""}`} onClick={() => { setSpreadIdx(i); setAnimKey(k => k + 1); }} aria-label={`Spread ${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      {phase === "back" && (
        <div className="book-back-cover" onClick={goPrev} style={{ position: "relative", cursor: "pointer", overflow: "hidden" }}>
          <div className="book-page-imgbox" style={{ position: "absolute", inset: 0, height: "100%", width: "100%", zIndex: 0 }}>
            <img src="/images/back-qr.png" alt="QR Code" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => console.error("Back QR failed to load")} />
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "2rem", display: "flex", justifyContent: "center", background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
            <div className="back-cta" style={{ padding: "0.6rem 1.4rem" }}>← CLICK TO GO BACK</div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogLauncher() {
  const [fanOpen, setFanOpen] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<CatalogDef | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCatalog = (cat: CatalogDef) => { setActiveCatalog(cat); setFanOpen(false); };

  const onEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setFanOpen(true);
  };

  const onLeave = () => {
    hoverTimeout.current = setTimeout(() => { setFanOpen(false); }, 300);
  };

  const fanTransforms = [
    { tx: -85, ty: -5, rot: -20 },
    { tx: -40, ty: -70, rot: -5 },
    { tx: 10,  ty: -55, rot: 10 },
  ];

  return (
    <>
      <div onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {fanTransforms.map((ft, i) => (
          <button key={i} className="catalog-fan-card" onClick={() => openCatalog(MASTER_CATALOG)} onMouseEnter={onEnter} onMouseLeave={onLeave}
            style={{ transform: fanOpen ? `translate(${ft.tx}px, ${ft.ty}px) rotate(${ft.rot}deg)` : "translate(0,0) rotate(0deg) scale(0.7)", opacity: fanOpen ? 1 : 0, transitionDelay: fanOpen ? `${i * 0.06}s` : "0s", pointerEvents: fanOpen ? "auto" : "none" }}>
            Catalog
          </button>
        ))}
        <button className="catalog-badge" onClick={() => setFanOpen(v => !v)} onMouseEnter={onEnter} onMouseLeave={onLeave} aria-label="Open catalogs">
          <img src="favicon.ico.jpeg" alt="Nex Vision Arabia" style={{ width: "44px", height: "auto", objectFit: "contain", zIndex: 2, borderRadius: "4px" }} />
        </button>
      </div>
      {activeCatalog && <CatalogBookModal catalog={activeCatalog} onClose={() => setActiveCatalog(null)} />}
    </>
  );
}

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

  .gold-btn {
    background: linear-gradient(135deg,#C4A030,#E8C84A);
    color:#0A0A0A; font-weight:700; border:none; cursor:pointer;
    transition:all 0.3s; font-family:'Inter',sans-serif;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .gold-btn:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(196,160,48,0.45); }
  .gold-btn:active { transform:translateY(0); }

  .outline-btn {
    background:transparent; border:2px solid #C4A030; color:#C4A030;
    font-weight:600; cursor:pointer; transition:all 0.3s;
    font-family:'Inter',sans-serif;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .outline-btn:hover { background:#C4A030; color:#0A0A0A; transform:translateY(-2px); }
  .outline-btn:active { transform:translateY(0); }

  .nav-link {
    position:relative; background:none; border:none; color:#ddd;
    font-size:0.88rem; font-weight:500; cursor:pointer;
    font-family:'Inter',sans-serif; transition:color 0.2s; padding:0;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    min-height: 44px; display: inline-flex; align-items: center;
  }
  .nav-link::after { content:''; position:absolute; bottom:-4px; left:0; width:0; height:2px; background:#C4A030; transition:width 0.3s; }
  .nav-link:hover { color:#C4A030; }
  .nav-link:hover::after, .nav-link.active-link::after { width:100%; }
  .nav-link.active-link { color:#C4A030; }

  .section-tag { font-size:0.72rem; letter-spacing:0.22em; text-transform:uppercase; color:#C4A030; font-weight:600; }
  .section-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(1.8rem,6vw,3rem); letter-spacing:0.04em; line-height:1.1; color:#F0EDE6; }
  .gold-line { width:48px; height:3px; background:linear-gradient(90deg,#C4A030,#E8C84A); border-radius:2px; }

  .tab-btn {
    background:none; border:1px solid #2a2a2a; color:#888;
    padding:0.65rem 1.4rem; border-radius:0.35rem; cursor:pointer;
    font-family:'Inter',sans-serif; font-size:0.85rem; font-weight:500;
    transition:all 0.25s; white-space:nowrap;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    min-height: 44px;
  }
  .tab-btn.active, .tab-btn:hover { border-color:#C4A030; color:#C4A030; background:rgba(196,160,48,0.08); }

  input, textarea {
    background:#111; border:1px solid #2a2a2a; color:#F0EDE6;
    border-radius:0.5rem; padding:0.85rem 1rem;
    font-family:'Inter',sans-serif; font-size:16px;
    width:100%; outline:none; transition:border-color 0.3s;
    -webkit-appearance: none;
    appearance: none;
  }
  input:focus, textarea:focus { border-color:#C4A030; }
  input::placeholder, textarea::placeholder { color:#555; }

  .marquee-wrap { overflow:hidden; mask-image:linear-gradient(90deg,transparent,black 8%,black 92%,transparent); }
  .marquee-track { display:flex; gap:2.5rem; animation:marquee 35s linear infinite; white-space:nowrap; }
  .marquee-track:hover { animation-play-state:paused; }

  .service-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
  .service-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(196,160,48,0.3); }

  /* ── Desktop nav / Mobile toggle ── */
  .mobile-btn { display: none; }
  @media (max-width:768px) {
    .desktop-nav { display:none !important; }
    .mobile-btn { display:flex !important; }
  }
  @media (min-width:769px) {
    .mobile-btn { display:none !important; }
  }

  /* ══════════════════════════════════════
     MOBILE OVERRIDES — comprehensive
     ══════════════════════════════════════ */
  @media (max-width:600px) {

    /* Stats grid — 2x2 on mobile */
    .hero-stats-grid {
      grid-template-columns: repeat(2,1fr) !important;
      gap: 0 !important;
    }
    .hero-stats-grid > div {
      border-right: 1px solid #1a1a1a;
      border-bottom: 1px solid #1a1a1a;
      padding: 1rem 0.5rem !important;
    }
    .hero-stats-grid > div:nth-child(2n) { border-right: none; }
    .hero-stats-grid > div:nth-child(3),
    .hero-stats-grid > div:nth-child(4) { border-bottom: none; }

    /* About section */
    .about-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }

    /* Values grid — 2 col on mobile */
    .values-grid { grid-template-columns: 1fr 1fr !important; gap: 1rem !important; }
    .values-grid > div { padding: 1.25rem 0.85rem !important; }

    /* Contact / CTA */
    .contact-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
    .cta-btn-row { flex-direction: column !important; align-items: center; }

    /* Services teaser */
    .services-teaser-grid { grid-template-columns: 1fr !important; }

    /* Footer */
    .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 2rem !important; }

    /* Form name/email stacked */
    .form-name-email { grid-template-columns: 1fr !important; }

    /* Tab row scroll */
    .tab-row {
      justify-content: flex-start !important;
      overflow-x: auto;
      flex-wrap: nowrap !important;
      padding-bottom: 0.5rem;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .tab-row::-webkit-scrollbar { display: none; }

    /* Section padding reductions */
    section, .section-pad {
      padding-left: 1rem !important;
      padding-right: 1rem !important;
    }

    /* Hero section adjustments */
    #home { min-height: 100svh; }
    #home .hero-content-area { padding: 7rem 1rem 1rem !important; }

    /* About section */
    #about { padding: 3.5rem 1rem !important; }
    #about .about-grid { gap: 2rem !important; }
    #about p { font-size: 0.88rem !important; }

    /* Values section */
    .values-section { padding: 3rem 1rem !important; }

    /* Clients section */
    #clients { padding: 3rem 0 !important; }

    /* Contact section */
    #contact { padding: 3.5rem 1rem !important; }
    #contact form { padding: 1.5rem 1rem !important; }

    /* Section titles */
    .section-title { font-size: clamp(1.7rem,8vw,2.5rem) !important; }

    /* Gold line mobile */
    .gold-line { margin: 1rem 0 !important; }

    /* About image */
    .about-video-wrap { aspect-ratio: 16/9 !important; }

    /* Nav contact info in mobile menu */
    .mobile-contact-row { flex-direction: column !important; gap: 1rem !important; align-items: flex-start !important; }

    /* Animation threshold adjustment for mobile */
    .anim-section { opacity: 0; }

    /* Buttons full width on mobile where applicable */
    .outline-btn-mobile-full { width: 100% !important; text-align: center; }
  }

  /* Tablet adjustments */
  @media (min-width: 601px) and (max-width: 900px) {
    .hero-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
    .values-grid { grid-template-columns: repeat(2,1fr) !important; }
    .footer-grid { grid-template-columns: repeat(2,1fr) !important; }
    .form-name-email { grid-template-columns: 1fr 1fr; }
  }

  /* ── Catalog Overlay ── */
  @keyframes overlayIn { from { opacity:0; } to { opacity:1; } }
  @keyframes coverIn { from { opacity:0; transform:scale(0.92) translateY(10px); } to { opacity:1; transform:none; } }
  @keyframes pageIn { from { opacity:0; transform:translateX(14px); } to { opacity:1; transform:none; } }

  .catalog-badge {
    position: fixed; bottom: 30px; right: 30px; z-index: 500;
    width: 65px; height: 52px; background: #C4A030; border: none;
    border-radius: 0 8px 8px 8px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; cursor: pointer;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4); transition: transform 0.3s ease;
    will-change: transform; text-decoration: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .catalog-badge::before {
    content: ''; position: absolute; top: -9px; left: 0;
    width: 32px; height: 9px; background: #C4A030; border-radius: 6px 6px 0 0;
  }
  .catalog-badge:hover { transform: scale(1.05); }

  .catalog-fan-card {
    position: fixed; bottom: 35px; right: 35px; z-index: 499;
    background: #ffffff; color: #333; border: none; border-radius: 6px;
    width: 70px; height: 48px; display: flex; align-items: center;
    justify-content: center; font-family: 'Inter', sans-serif; font-size: 0.75rem;
    font-weight: 500; box-shadow: 0 4px 15px rgba(0,0,0,0.3); cursor: pointer;
    transition: transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
    will-change: transform, opacity;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .catalog-fan-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.4); }

  .catalog-overlay {
    position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.92);
    display: flex; align-items: center; justify-content: center;
    animation: overlayIn 0.25s ease;
    padding: 3rem 2rem;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .catalog-close {
    position: fixed; top: 1rem; right: 1rem; z-index: 1001;
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(196,160,48,0.1); border: 1px solid rgba(196,160,48,0.4);
    color: #C4A030; font-size: 1.05rem; cursor: pointer; transition: all 0.25s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    display: flex; align-items: center; justify-content: center;
  }
  .catalog-close:hover { background:#C4A030; color:#0A0A0A; }

  .book-cover-card {
    width: min(340px,85vw); aspect-ratio: 210/297;
    background: #121200; border: 1px solid #2a2200; border-radius: 0.65rem;
    box-shadow: 0 30px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(196,160,48,0.15);
    position: relative; cursor: pointer; animation: coverIn 0.4s ease;
    transition: transform 0.3s;
  }
  .book-cover-card:hover { transform:translateY(-4px); }
  .book-cover-card::before {
    content:''; position:absolute; top:0; right:0; width:55%; height:7px;
    background:linear-gradient(90deg,#C4A030,#E8C84A); z-index: 20;
  }
  .book-cover-open-btn {
    align-self:center; background:#C4A030; color:#0A0A0A; font-weight:700;
    font-size:0.78rem; letter-spacing:0.08em; padding:0.6rem 1.25rem;
    border-radius:2rem; border:none; display:inline-flex; align-items:center;
    gap:0.4rem; cursor:pointer; z-index: 20;
  }

  .book-spread-wrap {
    position:relative; width: min(640px,92vw);
    display:flex; flex-direction:column; align-items:center;
  }
  .spread-label { position:absolute; top:-2rem; left:0; color:#888; font-size:0.75rem; letter-spacing:0.05em; }

  .nav-arrow {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 44px; height: 44px; border-radius: 50%;
    background: #111; border: 1px solid #C4A030; color: #C4A030;
    font-size: 1.3rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    z-index: 5; transition: all 0.25s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .nav-arrow:hover { background:#C4A030; color:#0A0A0A; }
  .nav-arrow.left { left: -50px; }
  .nav-arrow.right { right: -50px; }

  .book-spread-pages {
    display: grid; grid-template-columns: 1fr 1fr; gap: 2px;
    width: 100%; background: #C4A030; border-radius: 0.5rem;
    overflow: hidden; box-shadow: 0 30px 70px rgba(0,0,0,0.6);
    animation: pageIn 0.3s ease;
  }
  .book-page { background:#0d0d0d; aspect-ratio:210/297; display:flex; flex-direction:column; }
  .img-placeholder {
    width:100%; height:100%; display:flex; flex-direction:column;
    align-items:center; justify-content:center; border:1.5px dashed #3a3000;
    color:#6b5c1f; font-size:0.72rem; gap:0.3rem; text-align:center; padding:0.5rem;
  }
  .img-placeholder span { font-size:1.4rem; color:#C4A030; }
  .img-placeholder small { color:#4a3f15; font-size:0.6rem; }

  .dots-row { display:flex; gap:0.4rem; margin-top:1.25rem; flex-wrap:wrap; justify-content:center; }
  .dot {
    width: 10px; height: 10px; border-radius: 50%; background: #333; border: none;
    cursor: pointer; transition: all 0.25s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .dot.active { background:#C4A030; width:20px; border-radius:4px; }

  .book-back-cover {
    width: min(340px,85vw); aspect-ratio: 210/297;
    background: #0d0d0d; border: 1px solid #2a2200; border-radius: 0.65rem;
    box-shadow: 0 30px 70px rgba(0,0,0,0.7);
    position: relative; cursor: pointer; animation: coverIn 0.35s ease;
  }
  .back-cta {
    align-self:center; color:#C4A030; font-weight:700; font-size:0.78rem;
    letter-spacing:0.08em; border:1px solid #C4A030; padding:0.6rem 1.4rem;
    border-radius:2rem; z-index: 20; background: rgba(0,0,0,0.5);
    backdrop-filter: blur(2px);
  }

  /* Catalog mobile tweaks — keep side-by-side book spread on all screen sizes */
  @media (max-width: 768px) {
    .nav-arrow.left { left: -38px; }
    .nav-arrow.right { right: -38px; }
    .book-spread-pages { grid-template-columns: 1fr 1fr !important; }
    .book-page { aspect-ratio: 210/297; min-height: unset; }
    .spread-label { top: -1.8rem; font-size: 0.65rem; }
    .book-spread-wrap { width: min(580px, 88vw); }
  }
  @media (max-width: 540px) {
    .nav-arrow.left { left: -32px; }
    .nav-arrow.right { right: -32px; }
    .book-spread-wrap { width: 90vw; }
    .nav-arrow { width: 28px; height: 28px; font-size: 1rem; }
  }
  @media (max-width: 400px) {
    .nav-arrow.left { left: -26px; }
    .nav-arrow.right { right: -26px; }
    .book-spread-wrap { width: 92vw; }
    .nav-arrow { width: 24px; height: 24px; font-size: 0.9rem; }
  }
  @media (max-width:600px) {
    .catalog-badge { width:52px; height:42px; bottom:18px; right:18px; border-radius: 0 6px 6px 6px; }
    .catalog-badge::before { width: 26px; height: 8px; top: -8px; border-radius: 4px 4px 0 0; }
    .catalog-fan-card { width: 60px; height: 42px; font-size: 0.65rem; bottom: 20px; right: 20px; }
  }

  /* ── Services Page ── */
  @keyframes svReveal { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:none; } }
  @keyframes svSlideLeft { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:none; } }
  @keyframes svSlideRight { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:none; } }
  @keyframes shimmer { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
  @keyframes scanline { from { transform:translateY(-100%); } to { transform:translateY(100vh); } }

  .sv-hero { position:relative; min-height:22vh; display:flex; align-items:flex-end; overflow:hidden; }
  .sv-hero-bg { position:absolute; inset:0; background:linear-gradient(135deg,#0a0a0a 0%,#111200 50%,#0a0a0a 100%); }
  .sv-hero-grid {
    position:absolute; inset:0;
    background-image:linear-gradient(rgba(196,160,48,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(196,160,48,0.04) 1px,transparent 1px);
    background-size:60px 60px;
  }
  .sv-hero-content { position:relative; z-index:2; padding:5rem 1.5rem 2rem; max-width:1200px; margin:0 auto; width:100%; }

  .sv-col-header { display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem; }
  .sv-col-num { font-family:'Bebas Neue',sans-serif; font-size:3.5rem; color:rgba(196,160,48,0.15); line-height:1; user-select:none; }
  .sv-col-title-wrap { display:flex; flex-direction:column; }
  .sv-col-eyebrow { font-size:0.65rem; letter-spacing:0.2em; text-transform:uppercase; color:#C4A030; font-weight:600; }
  .sv-col-title { font-family:'Bebas Neue',sans-serif; font-size:1.7rem; letter-spacing:0.05em; color:#F0EDE6; line-height:1; }

  .sv-img-primary { width:100%; border-radius:0.5rem; overflow:hidden; border:1px solid #1e1e00; position:relative; }
  .sv-img-primary img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.6s ease; }
  .sv-img-primary:hover img { transform:scale(1.03); }
  .sv-img-primary::after { content:''; position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 50%); pointer-events:none; }

  .sv-item-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:2px; margin-top:2px; }
  .sv-item-cell { position:relative; aspect-ratio:1/1; overflow:hidden; background:#0d0d0d; cursor:default; }
  .sv-item-cell img { width:100%; height:100%; object-fit:cover; transition:transform 0.5s ease, filter 0.4s ease; filter:brightness(0.75) saturate(0.8); }
  .sv-item-cell:hover img { transform:scale(1.1); filter:brightness(1) saturate(1); }
  .sv-item-cell-label { position:absolute; inset:0; display:flex; align-items:flex-end; padding:0.4rem 0.5rem; background:linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 55%); opacity:0; transition:opacity 0.35s; pointer-events:none; }
  .sv-item-cell:hover .sv-item-cell-label { opacity:1; }
  .sv-item-cell-label span { font-size:0.6rem; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:#E8C84A; line-height:1.2; }
  .sv-item-cell-border { position:absolute; inset:0; border:1px solid rgba(196,160,48,0); transition:border-color 0.35s; pointer-events:none; }
  .sv-item-cell:hover .sv-item-cell-border { border-color:rgba(196,160,48,0.4); }

  .sv-divider { width:100%; height:1px; background:linear-gradient(90deg,transparent,#C4A030,transparent); margin:2rem 0; opacity:0.3; }

  .sv-feature-list { list-style:none; padding:0; margin:0; }
  .sv-feature-list li { display:flex; align-items:flex-start; gap:0.6rem; padding:0.5rem 0; border-bottom:1px solid #111; font-size:0.82rem; color:#aaa; line-height:1.4; }
  .sv-feature-list li::before { content:''; display:block; width:4px; height:4px; border-radius:50%; background:#C4A030; margin-top:0.38rem; flex-shrink:0; }

  .sv-badge {
    display:inline-flex; align-items:center; gap:0.4rem;
    background:rgba(196,160,48,0.08); border:1px solid rgba(196,160,48,0.2);
    border-radius:2rem; padding:0.3rem 0.75rem;
    font-size:clamp(0.62rem,2.5vw,0.72rem); font-weight:600;
    letter-spacing:0.08em; color:#C4A030; text-transform:uppercase;
    white-space: nowrap;
  }

  .sv-three-col { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0; min-height:100vh; }
  .sv-col { border-right:1px solid #1a1a1a; display:flex; flex-direction:column; }
  .sv-col:last-child { border-right:none; }
  .sv-col-inner { padding:2rem 1.75rem 3rem; flex:1; display:flex; flex-direction:column; }

  .sv-section-strip { padding:0.65rem 1.75rem; background:#0d0d0d; border-bottom:1px solid #1a1a1a; display:flex; align-items:center; gap:0.5rem; }
  .sv-section-strip-dot { width:6px; height:6px; border-radius:50%; background:#C4A030; flex-shrink:0; }
  .sv-section-strip-label { font-size:0.68rem; letter-spacing:0.16em; text-transform:uppercase; color:#C4A030; font-weight:600; }

  .sv-eq-category { margin-bottom:1.5rem; }
  .sv-eq-cat-label { font-size:0.65rem; letter-spacing:0.18em; text-transform:uppercase; color:#C4A030; font-weight:700; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem; }
  .sv-eq-cat-label::after { content:''; flex:1; height:1px; background:rgba(196,160,48,0.2); }
  .sv-eq-grid { display:grid; grid-template-columns:1fr 1fr; gap:2px; }
  .sv-eq-item { position:relative; aspect-ratio:4/3; overflow:hidden; background:#0d0d0d; }
  .sv-eq-item img { width:100%; height:100%; object-fit:cover; transition:transform 0.5s, filter 0.4s; filter:brightness(0.7); }
  .sv-eq-item:hover img { transform:scale(1.08); filter:brightness(1); }
  .sv-eq-item-tag { position:absolute; bottom:0; left:0; right:0; padding:0.35rem 0.45rem; background:rgba(0,0,0,0.8); font-size:0.55rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#E8C84A; }

  .sv-manpower-cat { margin-bottom:1.25rem; }
  .sv-manpower-cat-title { font-size:0.65rem; letter-spacing:0.16em; text-transform:uppercase; color:#C4A030; font-weight:700; margin-bottom:0.5rem; }
  .sv-manpower-roles { display:flex; flex-wrap:wrap; gap:0.3rem; }
  .sv-role-chip {
    font-size:0.68rem; background:#111; border:1px solid #222;
    color:#aaa; padding:0.25rem 0.55rem; border-radius:0.25rem;
    transition:all 0.25s; cursor:default;
    -webkit-tap-highlight-color: transparent;
  }
  .sv-role-chip:hover { border-color:#C4A030; color:#C4A030; background:rgba(196,160,48,0.05); }

  /* Services page — tablet & mobile breakpoints */
  @media (max-width:900px) {
    .sv-three-col { grid-template-columns:1fr !important; }
    .sv-col { border-right:none; border-bottom:1px solid #1a1a1a; }
    .sv-col:last-child { border-bottom: none; }
    .sv-item-grid { grid-template-columns:repeat(3,1fr); }
    .sv-hero-content { padding: 4rem 1.25rem 1.5rem; }
  }
  @media (max-width:600px) {
    .sv-item-grid { grid-template-columns:repeat(3,1fr); }
    .sv-eq-grid { grid-template-columns:1fr 1fr; }
    .sv-col-inner { padding:1.5rem 1rem 2rem; }
    .sv-col-num { font-size: 2.5rem; }
    .sv-col-title { font-size: 1.4rem; }
    .sv-hero { min-height: 18vh; }
    .sv-hero-content { padding: 3.5rem 1rem 1.25rem; }
    .sv-badge { font-size: 0.62rem; padding: 0.25rem 0.6rem; }
    .sv-feature-list li { font-size: 0.8rem; }
    .sv-manpower-roles { gap: 0.25rem; }
    .sv-role-chip { font-size: 0.65rem; padding: 0.22rem 0.45rem; }
    .sv-divider { margin: 1.5rem 0; }
    .sv-eq-category { margin-bottom: 1.25rem; }
    .sv-eq-item-tag { font-size: 0.5rem; padding: 0.3rem 0.35rem; }
  }

  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    .marquee-track { animation: none; }
  }
`;

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { const fn = () => setScrolled(window.scrollY > 50); window.addEventListener("scroll", fn); return () => window.removeEventListener("scroll", fn); }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

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
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 601, background: scrolled ? "rgba(8,8,8,0.96)" : "transparent", backdropFilter: scrolled ? "blur(14px)" : "none", borderBottom: scrolled ? "1px solid #1a1a1a" : "none", transition: "all 0.4s", padding: scrolled ? "0.75rem 1.25rem" : "1.2rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }} onClick={() => goTo("/")}>
        <img src="/headerlogo.jpg" alt="Nex Vision Arabia" style={{ height: "42px", width: "auto", objectFit: "contain", borderRadius: "4px" }} />
      </div>

      <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
        {NAV.map(({ label, action }) => {
          const isActive = (label === "Home" && isHome) || (label === "Our Services" && isServices);
          return (
            <button key={label} className={`nav-link${isActive ? " active-link" : ""}`} onClick={action}>{label}</button>
          );
        })}
        <button className="gold-btn" onClick={() => goTo("/", "#contact")} style={{ padding: "0.55rem 1.4rem", borderRadius: "0.4rem", fontSize: "0.85rem" }}>Get In Touch</button>
      </div>

      {/* Mobile hamburger — min touch target 44px */}
      <button
        className="mobile-btn"
        onClick={() => setMenuOpen(m => !m)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        style={{ background: "none", border: "1px solid #2a2a2a", color: "#F0EDE6", borderRadius: "0.4rem", padding: "0.6rem 0.75rem", cursor: "pointer", flexDirection: "column", gap: "5px", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" }}>
        {[0, 1, 2].map(i => <span key={i} style={{ display: "block", width: 20, height: 2, background: "#C4A030", borderRadius: 2, transition: "transform 0.3s" }} />)}
      </button>

      {/* Full-screen mobile menu */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "#000", display: "flex", flexDirection: "column", animation: "fadeIn 0.25s ease", overflow: "hidden", WebkitOverflowScrolling: "touch" }}>
          {/* Menu header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <img src="/headerlogo.jpg" alt="Nex Vision Arabia" style={{ height: "36px", width: "auto", objectFit: "contain", borderRadius: "4px" }} />
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              style={{ background: "rgba(196,160,48,0.1)", border: "1px solid rgba(196,160,48,0.3)", color: "#C4A030", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.1rem", fontWeight: 700, WebkitTapHighlightColor: "transparent" }}>✕</button>
          </div>

          {/* Nav links — scrollable area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "1.5rem 1.5rem", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            {NAV.map(({ label, action }, i) => {
              const isActive = (label === "Home" && isHome) || (label === "Our Services" && isServices);
              return (
                <button key={label} onClick={action}
                  style={{ background: "none", border: "none", borderBottom: "1px solid #111", color: isActive ? "#C4A030" : "#F0EDE6", fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(1.7rem,7vw,2.2rem)", letterSpacing: "0.12em", cursor: "pointer", textAlign: "left", padding: "1rem 0", display: "flex", alignItems: "center", justifyContent: "space-between", animation: `fadeUp 0.4s ease ${i * 0.07}s both`, transition: "color 0.2s", minHeight: 60, WebkitTapHighlightColor: "transparent" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#C4A030"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = isActive ? "#C4A030" : "#F0EDE6"}
                >
                  {label}
                  <span style={{ color: "#C4A030", fontSize: "1.2rem", opacity: isActive ? 1 : 0.4 }}>›</span>
                </button>
              );
            })}
          </div>

          {/* Bottom CTA area */}
          <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #1a1a1a", background: "#080808", flexShrink: 0 }}>
            <button className="gold-btn" onClick={() => { goTo("/", "#contact"); setMenuOpen(false); }} style={{ width: "100%", padding: "1rem", borderRadius: "0.5rem", fontSize: "1rem", marginBottom: "1rem", letterSpacing: "0.05em" }}>Get In Touch →</button>
            <div className="mobile-contact-row" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="tel:+966537637629" style={{ textDecoration: "none", textAlign: "center" }}>
                <div style={{ fontSize: "0.6rem", color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.2rem" }}>Phone</div>
                <div style={{ color: "#888", fontSize: "0.82rem" }}>+966 53 763 7629</div>
              </a>
              <div style={{ width: 1, background: "#1a1a1a" }} />
              <a href="mailto:info@nexvisionarabia.com" style={{ textDecoration: "none", textAlign: "center" }}>
                <div style={{ fontSize: "0.6rem", color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.2rem" }}>Email</div>
                <div style={{ color: "#888", fontSize: "0.82rem" }}>info@nexvisionarabia.com</div>
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const navigate = useNavigate();
  const goTo = (path: string, hash?: string) => {
    if (path === window.location.pathname) { if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 50); }
    else { navigate(path); if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 300); }
  };
  return (
    <footer style={{ background: "#050505", borderTop: "1px solid #1a1a1a", padding: "3rem 1.25rem 1.5rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "2rem", marginBottom: "2.5rem" }}>
          <div>
            <img src="/footerlogo.png" alt="Nex Vision Arabia" style={{ height: "40px", width: "auto", objectFit: "contain", marginBottom: "0.85rem" }} />
            <p style={{ color: "#555", fontSize: "0.8rem", lineHeight: 1.8 }}>Industrial Solutions, Quality Revolution. Serving Saudi Arabia with manpower, equipment, and material supply.</p>
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#C4A030", marginBottom: "1rem" }}>Quick Links</div>
            {[["Home", "/", ""], ["About", "/", "#about"], ["Our Services", "/services", ""], ["Clients", "/", "#clients"], ["Contact", "/", "#contact"]].map(([l, p, h]) => (
              <div key={l} style={{ marginBottom: "0.5rem" }}>
                <button onClick={() => goTo(p, h || undefined)} style={{ background: "none", border: "none", color: "#555", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: "0.3rem 0", transition: "color 0.2s", minHeight: 36, WebkitTapHighlightColor: "transparent" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = "#C4A030"}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "#555"}>{l}</button>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#C4A030", marginBottom: "1rem" }}>Services</div>
            {["Manpower Supply", "Equipment Rental", "Material Supply"].map(l => (
              <div key={l} style={{ marginBottom: "0.5rem" }}>
                <button onClick={() => goTo("/services")} style={{ background: "none", border: "none", color: "#555", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: "0.3rem 0", transition: "color 0.2s", minHeight: 36, WebkitTapHighlightColor: "transparent" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = "#C4A030"}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "#555"}>{l}</button>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#C4A030", marginBottom: "1rem" }}>Contact</div>
            <div style={{ color: "#555", fontSize: "0.8rem", lineHeight: 2.1 }}>
              Al Khobar, Al Jubail, KSA<br />
              <a href="tel:+966537637629" style={{ color: "#555", textDecoration: "none" }}>+966 53 763 7629</a><br />
              <a href="mailto:info@nexvisionarabia.com" style={{ color: "#555", textDecoration: "none" }}>info@nexvisionarabia.com</a>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ color: "#444", fontSize: "0.75rem" }}>© 2026 Nexvision Arabia. All rights reserved.</div>
          <div style={{ color: "#444", fontSize: "0.75rem" }}>Al Khobar · Al Jubail · Kingdom of Saudi Arabia</div>
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
  ];

  useEffect(() => { const t = setInterval(() => setHeroIdx(i => (i + 1) % SLIDES.length), 5000); return () => clearInterval(t); }, []);
  useEffect(() => { setTimeout(() => setStatsActive(true), 800); }, []);

  const VALUES = [
    { title: "Safety", desc: "Prioritizing the well-being of our team, clients, and project sites through safe and responsible work practices.", icon: (<div style={{ width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#1a1200,#2a1e00)",border:"2px solid #C4A030",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4A030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>) },
    { title: "Quality", desc: "Providing reliable materials, well-maintained equipment, and skilled manpower that meet high industry standards.", icon: (<div style={{ width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#1a1200,#2a1e00)",border:"2px solid #C4A030",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4A030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>) },
    { title: "Performance", desc: "Delivering efficient, timely, and professional solutions that support the successful completion of every project.", icon: (<div style={{ width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#1a1200,#2a1e00)",border:"2px solid #C4A030",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4A030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>) },
    { title: "Reliability", desc: "Building long-term trust through dependable service, consistent support, and a strong commitment to client satisfaction.", icon: (<div style={{ width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#1a1200,#2a1e00)",border:"2px solid #C4A030",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4A030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>) },
  ];

  const { ref: aboutRef, visible: aboutVis } = useInView(0.08);
  const { ref: valRef, visible: valVis } = useInView(0.06);
  const { ref: clientRef, visible: clientVis } = useInView(0.06);
  const { ref: ctaRef, visible: ctaVis } = useInView(0.06);

  return (
    <>
      {/* ── HERO + STATS ── */}
      <section id="home" style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden", background: "#000" }}>
        <video src="/images/hero-video.mp4" autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
        <div className="hero-content-area" style={{ position: "relative", zIndex: 2, maxWidth: 1000, margin: "0 auto", padding: "8rem 1.25rem 2rem", width: "100%" }}>
        </div>
        {/* Stats bar */}
        <div ref={statsRef} style={{ position: "relative", zIndex: 2, width: "100%", borderTop: "1px solid #1a1a1a", background: "#000", marginTop: "auto" }}>
          <div className="hero-stats-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
            {[
              { value: 16, suffix: "+", label: "Clients Served" },
              { value: 1200, suffix: "+", label: "Workforce Deployed" },
              { value: 50, suffix: "+", label: "Projects Completed" },
              { value: 8, suffix: "", label: "Years Experience" },
            ].map((stat, i) => (
              <StatItem key={i} value={stat.value} suffix={stat.suffix} label={stat.label} active={statsActive} />
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" ref={aboutRef} style={{ padding: "5rem 1.25rem", background: "#050505" }}>
        <div className="about-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "3rem", alignItems: "center" }}>
          <div style={{ animation: aboutVis ? "fadeUp 0.6s ease forwards" : "none", opacity: 0 }}>
            <div className="section-tag">Who We Are</div>
            <h2 className="section-title" style={{ marginTop: "0.5rem" }}>BUILDING THE FUTURE OF <span style={{ color: "#C4A030" }}>INDUSTRY</span></h2>
            <div className="gold-line" style={{ margin: "1.25rem 0" }} />
            <p style={{ color: "#888", lineHeight: 1.8, marginBottom: "1.25rem", fontSize: "clamp(0.85rem,3vw,0.95rem)" }}>
              NEX VISION ARABIA is a premier provider of integrated industrial solutions in the Kingdom of Saudi Arabia. We specialize in delivering top-tier manpower, state-of-the-art equipment rental, and high-quality material supply to support the Kingdom's ambitious Vision 2030 goals.
            </p>
            <p style={{ color: "#888", lineHeight: 1.8, marginBottom: "1.75rem", fontSize: "clamp(0.85rem,3vw,0.95rem)" }}>
              Our commitment to safety, quality, and operational excellence ensures that we are not just a vendor, but a strategic partner in your project's success.
            </p>
            <button className="outline-btn" onClick={() => navigate("/services")} style={{ padding: "0.8rem 1.6rem", borderRadius: "0.4rem", fontSize: "0.88rem", width: "100%", maxWidth: 300 }}>Learn More About Our Services</button>
          </div>
          <div className="about-video-wrap" style={{ position: "relative", aspectRatio: "4/3", background: "#111", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid #1a1a1a", animation: aboutVis ? "fadeIn 0.8s ease 0.2s forwards" : "none", opacity: 0 }}>
            <video src="/images/about-video.mp4" autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="values-section" ref={valRef} style={{ padding: "4rem 1.25rem", background: "#000" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center", marginBottom: "2.5rem" }}>
          <div className="section-tag">Our Core Values</div>
          <h2 className="section-title" style={{ marginTop: "0.5rem" }}>WHY CHOOSE <span style={{ color: "#C4A030" }}>US</span></h2>
        </div>
        <div className="values-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.5rem" }}>
          {VALUES.map((v, i) => (
            <div key={i} style={{ padding: "1.75rem 1.25rem", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "0.5rem", textAlign: "center", transition: "transform 0.3s", animation: valVis ? `fadeUp 0.5s ease ${i * 0.1}s forwards` : "none", opacity: 0 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translateY(-5px)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "none"}>
              <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "center" }}>{v.icon}</div>
              <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.35rem", color: "#F0EDE6", marginBottom: "0.65rem" }}>{v.title}</h3>
              <p style={{ color: "#777", fontSize: "clamp(0.82rem,2.5vw,0.9rem)", lineHeight: 1.6 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CLIENTS ── */}
      <section id="clients" ref={clientRef} style={{ padding: "3.5rem 0", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", background: "#050505", overflow: "hidden" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <div className="section-tag">Trusted By Industry Leaders</div>
        </div>
        <div className="marquee-wrap">
          <div className="marquee-track" style={{ alignItems: "center" }}>
            {[...CLIENT_LOGOS, ...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, i) => (
              <img key={i} src={logo} alt="Client Logo" style={{ height: "45px", width: "auto", objectFit: "contain", opacity: 0.7, flexShrink: 0 }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" ref={ctaRef} style={{ padding: "5rem 1.25rem", background: "#000" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <div className="section-tag">Get In Touch</div>
          <h2 className="section-title" style={{ marginTop: "0.5rem" }}>START YOUR <span style={{ color: "#C4A030" }}>PROJECT</span></h2>
          <p style={{ color: "#888", maxWidth: 560, margin: "1.25rem auto 2.5rem", fontSize: "clamp(0.85rem,3vw,0.95rem)", lineHeight: 1.7 }}>Ready to discuss your requirements? Contact us today for a consultation or quote.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = `New Project Inquiry%0A%0AName: ${encodeURIComponent(formState.name)}%0APhone: ${encodeURIComponent(formState.phone)}%0AEmail: ${encodeURIComponent(formState.email)}%0AMessage: ${encodeURIComponent(formState.message)}`;
              window.open(`https://wa.me/966537637629?text=${text}`, "_blank");
              setFormSent(true);
            }}
            style={{ textAlign: "left", background: "#0a0a0a", padding: "2rem 1.5rem", borderRadius: "0.5rem", border: "1px solid #1a1a1a" }}>
            <div className="form-name-email" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
              <input
                placeholder="Your Name"
                value={formState.name}
                onChange={e => setFormState({...formState, name: e.target.value})}
                autoComplete="name"
                required />
              <input
                placeholder="Phone Number"
                value={formState.phone}
                onChange={e => setFormState({...formState, phone: e.target.value})}
                autoComplete="tel"
                inputMode="tel"
                required />
            </div>
            <input
              placeholder="Email Address"
              type="email"
              value={formState.email}
              onChange={e => setFormState({...formState, email: e.target.value})}
              style={{ marginBottom: "0.85rem" }}
              autoComplete="email"
              required />
            <textarea
              placeholder="Tell us about your project needs..."
              rows={4}
              value={formState.message}
              onChange={e => setFormState({...formState, message: e.target.value})}
              style={{ marginBottom: "1.25rem", resize: "vertical" }}
              required />
            {formSent && (
              <div style={{ color: "#C4A030", textAlign: "center", marginBottom: "1rem", fontSize: "0.9rem" }}>
                ✓ Message sent! We will contact you soon.
              </div>
            )}
            <button type="submit" className="gold-btn" style={{ width: "100%", padding: "1rem", fontSize: "1rem", borderRadius: "0.4rem" }}>
              Send Message
            </button>
          </form>


        </div>
      </section>

      <CatalogLauncher />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SERVICES DATA ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const MATERIAL_CATEGORIES = [
  {
    label: "Construction & Building Materials",
    img: "/images/mat-construction.png",
    items: ["Wire Mesh","Formwork Shuttering Clamps","Construction Wood & Carpentry Wood","Sheet Materials","Specialty Adhesives","Tools & Accessories","Supplementary Cementing Materials","Construction Sand","Steel Rebar","Steel Wire Rods","Aggregates","Chemical Admixtures"],
  },
  {
    label: "Mechanical Materials",
    img: "/images/mat-mechanical.png",
    items: ["Steel Pipes & Fittings","Grooved Fittings","Copper, Brass Pipes & Fittings","Soldering & Welding Products","Gauges & Meters","Solvents, Adhesives & Cleaners","Chlorine & Water Filters","Bars & Tubes","Pressure Tanks","Sheets & Plates","Clamps, Joints & Couplings","Pipes, Fittings & Drains","Arrestors","Flanges","Gaskets"],
  },
  {
    label: "Machineries & Tools",
    img: "/images/mat-machineries.png",
    items: ["Machine Shop Equipment","Automotive Tools","Light Towers","Hydraulic System","Power Tools","Welding Machine","Angle Grinder","Hand Tools","Plumbing Tools","Construction Equipment"],
  },
  {
    label: "Electrical Components & Fittings",
    img: "/images/mat-electrical.png",
    items: ["Circuit Breakers","Switches & Sockets","Electrical Panels & Distribution Boards","Cable Glands & Lugs","Conduits & Conduit Fittings (PVC, GI, EMT)","Busbars & Busbar Supports","MCBs, MCCBs & Contactors","Terminal Blocks & Connectors"],
  },
  {
    label: "Safety Materials",
    img: "/images/mat-safety.png",
    items: ["Protective Glasses","Safety Helmet","Safety Vest","Safety Harness","First Aid Kit","Safety Shoes","Safety Glasses","Ear Plug","Face Mask","Surgical Hand Gloves","Smoke Detector","N95 Welding Face Mask","Respirator 3M Mask","Filter for 3M Mask","Coverall","Safety Flag","Face Shield Cover","Face Shield Holder","TIG Gloves","Leather Apron","Welding Gloves","Welding Glass","Welding Shield","Nitrile Gloves","Barricade Tapes","Fire Blanket","Fire Bucket","Fire Extinguishers","Industrial Cleaning Tools","Workwear","Fall Protection","Eye Wash & Shower"],
  },
];

const EQUIPMENT_CATEGORIES = [
  {
    label: "Earthmoving",
    items: [
      { name: "Skid Steers", img: "/images/eq-skid-steer.png" },
      { name: "Backhoe Loaders", img: "/images/eq-backhoe.png" },
      { name: "Wheel Loaders", img: "/images/eq-wheel-loader.png" },
      { name: "Excavators", img: "/images/eq-excavator.png" },
      { name: "Dozers", img: "/images/eq-dozer.png" },
    ],
  },
  {
    label: "Material Handling",
    items: [
      { name: "Forklifts", img: "/images/eq-forklift.png" },
      { name: "Tele Handlers", img: "/images/eq-telehandler.png" },
      { name: "Cranes", img: "/images/eq-crane.png" },
      { name: "Transportations", img: "/images/eq-transport.png" },
    ],
  },
  {
    label: "Power & Portable",
    items: [
      { name: "Generators", img: "/images/eq-generator.png" },
      { name: "Welders", img: "/images/eq-welder.png" },
      { name: "Mega Units Generator", img: "/images/eq-mega-gen.png" },
      { name: "Tower Lights", img: "/images/eq-tower-light.png" },
    ],
  },
  {
    label: "Air Compressor & Access Equipment",
    items: [
      { name: "Air Compressor", img: "/images/eq-compressor.png" },
      { name: "Air Compressor", img: "/images/eq-compressor-2.png" },
      { name: "Scissor Lifts", img: "/images/eq-scissor-lift.png" },
      { name: "Boom Lifts", img: "/images/eq-boom-lift.png" },
    ],
  },
];

const MANPOWER_CATEGORIES = [
  {
    title: "Engineers",
    roles: ["Planning Engineer","Field Engineer","Cost Engineer","Safety Engineer","Contract Engineer","Civil Engineer","Instrument Engineer","Piping Engineer","Mechanical Engineer","Electrical Engineer","Commissioning Engineer","QA/QC Engineer","Well test Engineer"],
  },
  {
    title: "Technicians & Fitters",
    roles: ["Millwright Technician","Electrical Technician","Instrument Technician","Mechanical Fitter","Instrument Fitter","Millwright Fitter"],
  },
  {
    title: "Fabricators & Related Trades",
    roles: ["Pipe Fabricator","Steel Fabricator","Fabricator","Duct Fabricator","Concrete Worker","Steel Fitter","Steel Erector","Duct Fitter"],
  },
  {
    title: "Foreman",
    roles: ["Civil Foreman","Mechanical Foreman","Piping Foreman","Welding Foreman","Structural Foreman","Instrument Foreman","Electrical Foreman","Insulation Foreman","Rigger Foreman"],
  },
  {
    title: "Welders",
    roles: ["TIG Welder","ARC Welder","General Welder","Structural Welder","Pipe Welder","Butt Welder"],
  },
  {
    title: "Safety & Support",
    roles: ["Safety Officer","Rigger Level I, II & III","Scaffolder","Work Permit Receiver","Fire Watchman","Standby Man","Skilled Labor","Unskilled Labor"],
  },
  {
    title: "Operators & Drivers",
    roles: ["Crane Operator","Forklift Operator","Heavy Driver","Light Driver","Well test Operator"],
  },
  {
    title: "Controllers & Inspectors",
    roles: ["Cost Controller","Material Controller","Document Controller","QA/QC Inspector"],
  },
  {
    title: "Supervisors",
    roles: ["Civil Supervisor","Mechanical Supervisor","Piping Supervisor","Electrical Supervisor","Instrument Supervisor","Safety Supervisor","Commissioning Supervisor","Welding Supervisor","Painting Supervisor","Well test Supervisor"],
  },
  {
    title: "Skilled Trades & Workers",
    roles: ["Carpenter","Mason","Spray Painter","Painter","Sandblaster"],
  },
  {
    title: "Administrative & Others",
    roles: ["Accountant","Store Keeper"],
  },
];

// ── AnimatedSection — lower threshold on mobile for better trigger ─────────────
function AnimatedSection({ children, delay = 0, direction = "up" }: { children: React.ReactNode; delay?: number; direction?: "up" | "left" | "right" }) {
  const { ref, visible } = useInView(0.05);
  const animMap = { up: "svReveal", left: "svSlideLeft", right: "svSlideRight" };
  return (
    <div ref={ref} style={{ animation: visible ? `${animMap[direction]} 0.5s ease ${delay}s both` : "none", opacity: 0 }}>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SERVICES PAGE ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function ServicesPage() {
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const goToContact = () => {
    navigate("/");
    setTimeout(() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" }), 300);
  };

  return (
    <div style={{ paddingTop: "68px", minHeight: "100vh", background: "#0A0A0A" }}>

      {/* ── HERO STRIP ── */}
      <div className="sv-hero">
        <div className="sv-hero-bg" />
        <div className="sv-hero-grid" />
        <div className="sv-hero-content">
          <AnimatedSection delay={0}>
            <div className="section-tag" style={{ marginBottom: "0.6rem" }}>Integrated Industrial Solutions</div>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2.4rem,8vw,5rem)", letterSpacing: "0.03em", lineHeight: 1, color: "#F0EDE6" }}>
              OUR <span style={{ color: "#C4A030" }}>SERVICES</span>
            </h1>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
              <span className="sv-badge">Material Supply</span>
              <span className="sv-badge">Equipment Rental</span>
              <span className="sv-badge">Manpower Supply</span>
            </div>
          </AnimatedSection>
        </div>
      </div>

      {/* ── 3-COLUMN LAYOUT ── */}
      <div className="sv-three-col">

        {/* ════════ COL 1 — MATERIAL SUPPLY ════════ */}
        <div className="sv-col">
          <div className="sv-col-inner">
            <AnimatedSection delay={0.05} direction="left">
              <div className="sv-col-header">
                <div className="sv-col-num">01</div>
                <div className="sv-col-title-wrap">
                  <div className="sv-col-eyebrow">Trusted Materials</div>
                  <div className="sv-col-title">MATERIAL SUPPLY</div>
                </div>
              </div>
              <p style={{ color: "#777", fontSize: "0.82rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Delivering a comprehensive range of high-quality materials essential for construction, industrial, and oil & gas projects across Saudi Arabia. Every item sourced for performance and reliability.
              </p>
            </AnimatedSection>

            {MATERIAL_CATEGORIES.map((cat, ci) => (
              <AnimatedSection key={ci} delay={0.15 + ci * 0.07}>
                <div className="sv-eq-category">
                  <div className="sv-eq-cat-label">{cat.label}</div>
                  <div className="sv-eq-grid">
                    <div className="sv-eq-item" style={{ gridColumn: "1 / -1", aspectRatio: "16/9" }}>
                      <img
                        src={cat.img}
                        alt={cat.label}
                        onError={e => {
                          const el = e.currentTarget as HTMLImageElement;
                          el.style.display = "none";
                          const parent = el.parentElement!;
                          parent.style.background = "linear-gradient(135deg,#0d0d00,#191600)";
                          const fb = parent.querySelector(".sv-eq-fallback") as HTMLElement;
                          if (fb) fb.style.display = "flex";
                        }}
                      />
                      <div className="sv-eq-fallback" style={{ position: "absolute", inset: 0, display: "none", alignItems: "center", justifyContent: "center", padding: "0.4rem", textAlign: "center" }}>
                        <span style={{ fontSize: "0.55rem", color: "#C4A030", fontWeight: 600, letterSpacing: "0.05em" }}>{cat.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}

            <AnimatedSection delay={0.25}>
              <div className="sv-divider" />
              <ul className="sv-feature-list">
                <li>Construction & Building Materials</li>
                <li>Mechanical Pipes, Fittings & Flanges</li>
                <li>Electrical Components & Circuitry</li>
                <li>Machineries & Industrial Tools</li>
                <li>Safety Gear & Protective Equipment</li>
              </ul>
            </AnimatedSection>
          </div>
        </div>

        {/* ════════ COL 2 — EQUIPMENT RENTAL ════════ */}
        <div className="sv-col">
          <div className="sv-col-inner">
            <AnimatedSection delay={0.1}>
              <div className="sv-col-header">
                <div className="sv-col-num">02</div>
                <div className="sv-col-title-wrap">
                  <div className="sv-col-eyebrow">Efficiency & Durability</div>
                  <div className="sv-col-title">EQUIPMENT RENTAL</div>
                </div>
              </div>
              <p style={{ color: "#777", fontSize: "0.82rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                A diverse fleet of well-maintained heavy equipment from reputable manufacturers — ready for earthmoving, material handling, and power generation across any project scale.
              </p>
            </AnimatedSection>

            {EQUIPMENT_CATEGORIES.map((cat, ci) => (
              <AnimatedSection key={ci} delay={0.15 + ci * 0.07}>
                <div className="sv-eq-category">
                  <div className="sv-eq-cat-label">{cat.label}</div>
                  <div className="sv-eq-grid">
                    {cat.items.map((item, ii) => (
                      <div key={ii} className="sv-eq-item">
                        <img
                          src={item.img}
                          alt={item.name}
                          onError={e => {
                            const el = e.currentTarget as HTMLImageElement;
                            el.style.display = "none";
                            const parent = el.parentElement!;
                            parent.style.background = "linear-gradient(135deg,#0d0d00,#191600)";
                            const fb = parent.querySelector(".sv-eq-fallback") as HTMLElement;
                            if (fb) fb.style.display = "flex";
                          }}
                        />
                        <div className="sv-eq-fallback" style={{ position: "absolute", inset: 0, display: "none", alignItems: "center", justifyContent: "center", padding: "0.4rem", textAlign: "center" }}>
                          <span style={{ fontSize: "0.55rem", color: "#C4A030", fontWeight: 600, letterSpacing: "0.05em" }}>{item.name}</span>
                        </div>
                        <div className="sv-eq-item-tag">{item.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            ))}

            <AnimatedSection delay={0.5}>
              <div className="sv-divider" />
              <ul className="sv-feature-list">
                <li>Earthmoving — Excavators, Loaders, Dozers</li>
                <li>Material Handling — Cranes, Forklifts, Tele Handlers</li>
                <li>Power Units — Generators, Welders, Tower Lights</li>
                <li>Air Compressors, Scissor Lifts & Boom Lifts</li>
              </ul>
            </AnimatedSection>
          </div>
        </div>

        {/* ════════ COL 3 — MANPOWER SUPPLY ════════ */}
        <div className="sv-col">
          <div className="sv-col-inner">
            <AnimatedSection delay={0.1} direction="right">
              <div className="sv-col-header">
                <div className="sv-col-num">03</div>
                <div className="sv-col-title-wrap">
                  <div className="sv-col-eyebrow">Right People · Right Skills</div>
                  <div className="sv-col-title">MANPOWER SUPPLY</div>
                </div>
              </div>
              <p style={{ color: "#777", fontSize: "0.82rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Professional manpower support for construction, industrial, infrastructure, and oil & gas projects. Skilled, reliable, and experienced workers — focused on quality, flexibility, and client satisfaction.
              </p>
            </AnimatedSection>

            {MANPOWER_CATEGORIES.map((cat, ci) => (
              <AnimatedSection key={ci} delay={0.15 + ci * 0.05} direction="right">
                <div className="sv-manpower-cat">
                  <div className="sv-manpower-cat-title">{cat.title}</div>
                  <div className="sv-manpower-roles">
                    {cat.roles.map((role, ri) => (
                      <span key={ri} className="sv-role-chip">{role}</span>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            ))}

            <AnimatedSection delay={0.7} direction="right">
              <div className="sv-divider" />
              <ul className="sv-feature-list">
                <li>Engineers, Supervisors & Foremen</li>
                <li>Technicians, Fitters & Welders</li>
                <li>Safety Officers & Support Staff</li>
                <li>Heavy Equipment Operators & Drivers</li>
                <li>Administrative & QA/QC Personnel</li>
              </ul>
            </AnimatedSection>
          </div>
        </div>

      </div>{/* end .sv-three-col */}

      {/* ── CTA STRIP ── */}
      <div style={{ borderTop: "1px solid #1a1a1a", background: "#050505", padding: "3.5rem 1.25rem", textAlign: "center" }}>
        <AnimatedSection delay={0}>
          <div className="section-tag" style={{ marginBottom: "0.6rem" }}>Ready to Start?</div>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(1.7rem,5vw,2.6rem)", letterSpacing: "0.04em", color: "#F0EDE6", marginBottom: "1.5rem" }}>
            REQUEST A <span style={{ color: "#C4A030" }}>QUOTE TODAY</span>
          </h2>
          <button className="gold-btn" onClick={goToContact} style={{ padding: "1rem 2.5rem", borderRadius: "0.4rem", fontSize: "0.95rem", minWidth: 200 }}>
            Contact Us →
          </button>
        </AnimatedSection>
      </div>

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── APP ROUTER ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function App() {
  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </>
  );
}

export default App;