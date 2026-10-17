import { useState, useEffect } from "react"
import { Logo, Icon } from "./App"

interface DetectiveOfficeIntroProps {
  repoUrl: string
  onComplete: () => void
  onBack: () => void
}

export function DetectiveOfficeIntro({ repoUrl, onComplete, onBack }: DetectiveOfficeIntroProps) {
  const [stage, setStage] = useState<number>(0)
  const [fading, setFading] = useState<boolean>(false)

  // Dialogue steps
  const dialogueSteps = [
    {
      speaker: "DETECTIVE REPO",
      text: "Rain's pouring over the city, but here in the office, the CRT terminal is already glowing. A new case just arrived on the wire.",
    },
    {
      speaker: "DETECTIVE REPO",
      text: `Target: ${repoUrl || "vercel/ms"}. We've analyzed the clues: entry points, manifests, and file dependencies.`,
    },
    {
      speaker: "DETECTIVE REPO",
      text: "Take a seat at the desk, rookie. Let's step into the dashboard and crack this codebase wide open.",
    },
  ]

  const currentStep = dialogueSteps[stage] || dialogueSteps[0]

  const handleNext = () => {
    if (stage < dialogueSteps.length - 1) {
      setStage((prev) => prev + 1)
    } else {
      handleEnterDashboard()
    }
  }

  const handleEnterDashboard = () => {
    setFading(true)
    setTimeout(() => {
      onComplete()
    }, 400)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        handleNext()
      } else if (e.key === "Escape") {
        onComplete()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [stage])

  return (
    <div className={`office-intro-page ${fading ? "office-fade-out" : ""}`}>
      {/* Top Bar */}
      <header className="office-top-nav shell">
        <button className="office-logo-btn" onClick={onBack} type="button">
          <Logo compact />
        </button>
        <div className="office-nav-center">
          <span className="case-tag-pill">INVESTIGATION DISPATCH</span>
          <span className="case-target-label">{repoUrl || "vercel/ms"}</span>
        </div>
        <button className="office-skip-btn" onClick={onComplete} type="button">
          SKIP TO DASHBOARD <Icon name="arrow" size={14} />
        </button>
      </header>

      {/* Main Office Stage */}
      <main className="office-stage-container">
        <div className="reference-scene-wrapper">
          <div className="reference-scene-viewport">
            {/* Retro 16-bit Cyber Detective Office Scene SVG */}
            <svg
              className="reference-scene-svg"
              viewBox="0 0 960 480"
              xmlns="http://www.w3.org/2000/svg"
              shapeRendering="crispEdges"
            >
              <defs>
                {/* Night sky outside rainy window */}
                <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#050a1a" />
                  <stop offset="60%" stopColor="#0c1638" />
                  <stop offset="100%" stopColor="#152456" />
                </linearGradient>

                {/* Desk lamp light cone */}
                <linearGradient id="lampCone" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffd875" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#ffb833" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#050816" stopOpacity="0" />
                </linearGradient>

                {/* Window moonlight cone */}
                <linearGradient id="moonGlow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#39d9f2" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#080e22" stopOpacity="0" />
                </linearGradient>

                {/* CRT screen glow */}
                <radialGradient id="screenCyanGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#050c1e" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Room Walls & Floor */}
              <rect x="0" y="0" width="960" height="480" fill="#070c1e" />
              <rect x="0" y="390" width="960" height="90" fill="#040712" />
              {/* Floor baseboard line */}
              <rect x="0" y="388" width="960" height="3" fill="#1b284e" />

              {/* ========================================================
                  LEFT ARCHED/TALL WINDOW WITH CITY SKYLINE & RAIN
                 ======================================================== */}
              {/* Window Frame Outer */}
              <rect x="180" y="30" width="220" height="310" fill="#0b1328" stroke="#1c2c54" strokeWidth="4" />
              {/* Window Glass Pane */}
              <rect x="186" y="36" width="208" height="298" fill="url(#nightSky)" />

              {/* Distant Cyber City Buildings */}
              <rect x="195" y="170" width="35" height="160" fill="#0b142e" />
              <rect x="235" y="130" width="45" height="200" fill="#091026" />
              <rect x="285" y="150" width="50" height="180" fill="#0d1836" />
              <rect x="340" y="110" width="40" height="220" fill="#0a122a" />

              {/* City Windows flickering */}
              <g className="city-lights-flicker">
                <rect x="242" y="145" width="4" height="6" fill="#00e5ff" opacity="0.8" />
                <rect x="252" y="145" width="4" height="6" fill="#39d9f2" opacity="0.7" />
                <rect x="262" y="145" width="4" height="6" fill="#ffd875" opacity="0.8" />
                <rect x="242" y="165" width="4" height="6" fill="#00e5ff" opacity="0.6" />
                <rect x="295" y="170" width="5" height="7" fill="#ff465a" opacity="0.7" />
                <rect x="310" y="170" width="5" height="7" fill="#00e5ff" opacity="0.8" />
                <rect x="325" y="190" width="5" height="7" fill="#ffd875" opacity="0.7" />
                <rect x="350" y="130" width="4" height="6" fill="#00e5ff" opacity="0.9" />
                <rect x="362" y="130" width="4" height="6" fill="#39d9f2" opacity="0.8" />
              </g>

              {/* Glowing Full Moon */}
              <circle cx="250" cy="85" r="24" fill="#a4f0ff" opacity="0.9" />
              <circle cx="250" cy="85" r="32" fill="#39d9f2" opacity="0.18" />

              {/* Cat Silhouette on the window sill */}
              <path
                d="M 270 295 C 270 280 280 270 288 270 C 295 270 302 278 302 295 L 305 315 L 265 315 Z"
                fill="#030610"
              />
              <polygon points="274,272 270,258 280,268" fill="#030610" />
              <polygon points="296,272 300,258 290,268" fill="#030610" />
              {/* Cat tail curled */}
              <path d="M 302 310 Q 314 312 314 298" stroke="#030610" strokeWidth="3" fill="none" />

              {/* Window Panes Grid */}
              <line x1="290" y1="36" x2="290" y2="334" stroke="#152040" strokeWidth="4" />
              <line x1="186" y1="185" x2="394" y2="185" stroke="#152040" strokeWidth="4" />

              {/* Diagonal Rain Streaks */}
              <g className="rain-layer" stroke="#68b4f0" strokeWidth="1.2" opacity="0.4">
                <line x1="200" y1="50" x2="180" y2="100" />
                <line x1="240" y1="60" x2="220" y2="110" />
                <line x1="280" y1="40" x2="260" y2="90" />
                <line x1="330" y1="70" x2="310" y2="120" />
                <line x1="220" y1="150" x2="200" y2="200" />
                <line x1="270" y1="140" x2="250" y2="190" />
                <line x1="320" y1="160" x2="300" y2="210" />
                <line x1="360" y1="130" x2="340" y2="180" />
              </g>

              {/* Vines / Hanging Houseplants draping down the window */}
              <g fill="#163832">
                <circle cx="180" cy="40" r="12" />
                <circle cx="188" cy="55" r="10" />
                <circle cx="178" cy="70" r="11" />
                <circle cx="186" cy="90" r="8" />
                <circle cx="176" cy="110" r="7" />
              </g>

              {/* ========================================================
                  DETECTIVE EVIDENCE PINBOARD (UPPER RIGHT WALL)
                 ======================================================== */}
              <rect x="580" y="40" width="170" height="130" fill="#101830" stroke="#253a66" strokeWidth="3" />
              {/* Pinned Notes & Suspect Cards */}
              <rect x="595" y="55" width="38" height="48" fill="#e8c89b" />
              <circle cx="614" cy="70" r="10" fill="#080e22" />
              <rect x="645" y="60" width="44" height="34" fill="#d2defa" />
              <rect x="650" y="105" width="35" height="30" fill="#ffd875" />
              <rect x="700" y="80" width="40" height="42" fill="#f0f4fc" />
              {/* Red Connecting Conspiracy Strings */}
              <line x1="614" y1="79" x2="667" y2="77" stroke="#ff465a" strokeWidth="2" />
              <line x1="667" y1="77" x2="667" y2="115" stroke="#ff465a" strokeWidth="2" />
              <line x1="667" y1="77" x2="720" y2="101" stroke="#ff465a" strokeWidth="2" />
              {/* Pushpins */}
              <circle cx="614" cy="57" r="2.5" fill="#ff465a" />
              <circle cx="667" cy="62" r="2.5" fill="#ff465a" />
              <circle cx="720" cy="82" r="2.5" fill="#ff465a" />

              {/* Bookshelves on Left & Right Wall */}
              <rect x="20" y="240" width="120" height="14" fill="#1a2544" />
              <rect x="30" y="190" width="16" height="50" fill="#845ec2" />
              <rect x="48" y="180" width="22" height="60" fill="#39d9f2" />
              <rect x="72" y="195" width="14" height="45" fill="#ff465a" />
              <rect x="88" y="185" width="20" height="55" fill="#e6b393" />

              {/* Cozy Corner Oil Lantern on left bookshelf */}
              <g className="lantern-pulse">
                <rect x="115" y="200" width="18" height="28" fill="#ffd875" opacity="0.9" />
                <rect x="113" y="196" width="22" height="4" fill="#0c1328" />
                <rect x="113" y="228" width="22" height="4" fill="#0c1328" />
                <circle cx="124" cy="214" r="30" fill="#ffd875" opacity="0.15" />
              </g>

              {/* Stack of books on right wall shelf */}
              <rect x="760" y="220" width="180" height="14" fill="#1a2544" />
              <rect x="770" y="170" width="20" height="50" fill="#00e5ff" />
              <rect x="792" y="160" width="16" height="60" fill="#9477ff" />
              <rect x="810" y="175" width="24" height="45" fill="#e6b393" />
              <rect x="836" y="165" width="22" height="55" fill="#ff465a" />

              {/* Houseplant in terracotta pot on right shelf */}
              <polygon points="875,220 865,190 905,190 895,220" fill="#b98068" />
              <ellipse cx="885" cy="180" rx="22" ry="16" fill="#1b4d3e" />
              <ellipse cx="895" cy="170" rx="18" ry="14" fill="#2d7a64" />

              {/* ========================================================
                  DETECTIVE WOODEN WORK DESK (CENTER-RIGHT FOREGROUND)
                 ======================================================== */}
              <rect x="360" y="320" width="460" height="18" fill="#1c2848" stroke="#0e172e" strokeWidth="2" />
              {/* Desk Front Panel */}
              <rect x="380" y="338" width="420" height="65" fill="#101932" />
              {/* Desk Drawers with Brass Handles */}
              <rect x="680" y="344" width="110" height="24" fill="#152040" stroke="#0b1226" />
              <rect x="725" y="354" width="20" height="4" fill="#ffd875" />
              <rect x="680" y="372" width="110" height="24" fill="#152040" stroke="#0b1226" />
              <rect x="725" y="382" width="20" height="4" fill="#ffd875" />

              {/* Banker's Green/Brass Desk Lamp */}
              <path d="M 720 320 Q 735 240 685 240" stroke="#d4af37" strokeWidth="5" fill="none" />
              <ellipse cx="680" cy="240" rx="26" ry="10" fill="#1a6b46" stroke="#0e4028" strokeWidth="2" />
              {/* Banker Lamp Glow Cone downward over keyboard & desk */}
              <polygon points="655,245 560,335 770,335 705,245" fill="url(#lampCone)" className="desk-lamp-cone" />

              {/* ========================================================
                  CRT TERMINAL MONITOR ON DESK
                 ======================================================== */}
              {/* Monitor Stand */}
              <rect x="525" y="300" width="40" height="20" fill="#080e20" />
              <rect x="510" y="318" width="70" height="6" fill="#141e3a" />
              {/* Monitor Bezel */}
              <rect x="460" y="165" width="170" height="135" rx="6" fill="#0a1226" stroke="#233a68" strokeWidth="4" />
              {/* CRT Phosphor Screen */}
              <rect x="472" y="177" width="146" height="111" rx="4" fill="#030816" stroke="#00e5ff" strokeWidth="1.5" />
              <rect x="472" y="177" width="146" height="111" fill="url(#screenCyanGlow)" />

              {/* Screen Terminal Content */}
              {/* Repo detective banner on monitor */}
              <rect x="480" y="184" width="130" height="14" fill="#00e5ff" opacity="0.2" />
              <text x="484" y="194" fill="#00e5ff" fontSize="8" fontFamily="'Press Start 2P', monospace">
                vercel/ms
              </text>
              {/* Mock code lines on monitor */}
              <line x1="482" y1="206" x2="520" y2="206" stroke="#ff465a" strokeWidth="2" />
              <line x1="525" y1="206" x2="570" y2="206" stroke="#39d9f2" strokeWidth="2" />
              <line x1="482" y1="214" x2="550" y2="214" stroke="#8c9cb8" strokeWidth="1.5" />
              <line x1="482" y1="222" x2="535" y2="222" stroke="#39d9f2" strokeWidth="1.5" />
              <line x1="482" y1="230" x2="560" y2="230" stroke="#9477ff" strokeWidth="1.5" />
              <line x1="482" y1="238" x2="505" y2="238" stroke="#ffd875" strokeWidth="1.5" />

              {/* Bar graph stats on CRT right side */}
              <rect x="560" y="245" width="6" height="30" fill="#00e5ff" />
              <rect x="570" y="235" width="6" height="40" fill="#39d9f2" />
              <rect x="580" y="225" width="6" height="50" fill="#ff465a" />
              <rect x="590" y="215" width="6" height="60" fill="#00e5ff" />

              {/* Monitor Power LED */}
              <circle cx="618" cy="292" r="2" fill="#00e5ff" />

              {/* Keyboard on Desk in front of Monitor */}
              <polygon points="485,322 470,332 590,332 575,322" fill="#0a1226" stroke="#1d2d52" strokeWidth="1.5" />

              {/* Steaming Coffee Mug with Cat Logo */}
              <rect x="635" y="308" width="18" height="18" rx="2" fill="#00e5ff" />
              {/* Cat paw silhouette on mug */}
              <circle cx="644" cy="317" r="3.5" fill="#060c1c" />
              {/* Mug handle */}
              <path d="M 653 311 Q 659 316 653 323" stroke="#00e5ff" strokeWidth="2.5" fill="none" />
              {/* Steam curly path */}
              <path d="M 644 304 Q 641 298 644 292" stroke="#95e9f8" strokeWidth="1.2" fill="none" opacity="0.6" />

              {/* Stack of case file folders on desk */}
              <rect x="380" y="318" width="60" height="8" fill="#e6b393" />
              <rect x="385" y="314" width="55" height="5" fill="#b98068" />
              <rect x="382" y="310" width="58" height="5" fill="#ffd875" />

              {/* ========================================================
                  DETECTIVE SITTING IN OFFICE CHAIR SIPPING COFFEE
                 ======================================================== */}
              <g className="detective-retro-idle">
                {/* Chair Backrest */}
                <rect x="345" y="230" width="45" height="90" rx="6" fill="#121e3a" stroke="#070c18" strokeWidth="3" />

                {/* Detective Character (Fedor & Trenchcoat) */}
                {/* Body / Coat */}
                <path d="M 370 260 L 440 260 L 450 330 L 370 330 Z" fill="#2c3f78" />
                {/* Coat Lapel */}
                <polygon points="405,260 415,295 395,295" fill="#1b2752" />
                <polygon points="415,260 425,295 405,295" fill="#9477ff" />

                {/* Face & Head */}
                <rect x="390" y="215" width="30" height="25" fill="#e6b393" />
                {/* Eye looking intently at CRT screen */}
                <rect x="408" y="224" width="4" height="4" fill="#080d20" />
                {/* Coffee mug held in hands */}
                <rect x="425" y="260" width="14" height="14" rx="2" fill="#ffd875" />
                {/* Detective Fedor / Slouch Hat */}
                <ellipse cx="405" cy="210" rx="36" ry="7" fill="#3b2f7a" />
                <rect x="385" y="185" width="40" height="24" rx="3" fill="#6b55c4" />
                {/* Hat Ribbon */}
                <rect x="385" y="202" width="40" height="6" fill="#ff465a" />
              </g>

              {/* CRT Scanline Filter Overlay */}
              <g opacity="0.12">
                {Array.from({ length: 48 }).map((_, i) => (
                  <line key={i} x1="0" y1={i * 10} x2="960" y2={i * 10} stroke="#000" strokeWidth="1" />
                ))}
              </g>
            </svg>
          </div>

          {/* ========================================================
              RPG DIALOGUE BOX (MATCHING SCREENSHOT AESTHETIC)
             ======================================================== */}
          <div className="reference-dialogue-panel" onClick={handleNext}>
            <div className="rpg-border-outer">
              <div className="rpg-border-inner">
                <div className="rpg-dialogue-content">
                  {/* Detective Face Portrait Frame */}
                  <div className="ref-portrait-frame">
                    <span className="p-bracket-tl" />
                    <span className="p-bracket-tr" />
                    <span className="p-bracket-bl" />
                    <span className="p-bracket-br" />
                    <svg
                      className="ref-portrait-svg"
                      viewBox="0 0 32 32"
                      shapeRendering="crispEdges"
                    >
                      {/* Pixel Art Mini Portrait */}
                      <rect x="6" y="4" width="20" height="7" fill="#6b55c4" />
                      <rect x="6" y="9" width="20" height="2" fill="#ff465a" />
                      <rect x="2" y="11" width="28" height="4" fill="#3b2f7a" />
                      <rect x="8" y="15" width="16" height="11" fill="#e6b393" />
                      <rect x="18" y="18" width="3" height="3" fill="#080d20" />
                      <rect x="12" y="26" width="8" height="6" fill="#2c3f78" />
                    </svg>
                  </div>

                  {/* Text Container */}
                  <div className="rpg-text-container">
                    <div className="rpg-header-row">
                      <span className="rpg-speaker-title">{currentStep.speaker}</span>
                      <span className="rpg-stage-indicator">
                        CASE PHASE {stage + 1} / {dialogueSteps.length}
                      </span>
                    </div>

                    <div className="rpg-message-body">
                      <p className="rpg-p">{currentStep.text}</p>
                    </div>

                    <div className="rpg-footer-row">
                      <div className="rpg-hint-note">
                        <span className="rpg-key-tag">SPACE / ENTER</span>
                        <span className="rpg-hint-text">Advance dialogue</span>
                      </div>

                      <div className="rpg-action-slot">
                        {stage < dialogueSteps.length - 1 ? (
                          <button
                            className="rpg-continue-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNext()
                            }}
                            type="button"
                          >
                            CONTINUE <span className="rpg-cyan-diamond">◆</span>
                          </button>
                        ) : (
                          <button
                            className="rpg-enter-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEnterDashboard()
                            }}
                            type="button"
                          >
                            ENTER DASHBOARD <Icon name="arrow" size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
