import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { Icon, Button, Logo } from "./App"
import { fetchRepoBriefing, type RepoBriefingData } from "./repoService"

interface DetectiveOfficeIntroProps {
  owner: string
  repo: string
  repositoryUrl: string
  onBackToHq: () => void
  onEnterDashboard: (repoUrl: string) => void
}

interface DialogueScreen {
  id: string
  stageNumber: number
  speakerTag: string
  title: string
  text: string
}

// Authentic Pixel Art Detective Portrait inside the RPG Dialogue Box (Completely Static)
function DetectiveDialoguePortrait() {
  return (
    <div className="ref-portrait-frame">
      <img
        src="/images/detective-portrait.png"
        alt="Detective portrait"
        className="ref-portrait-img"
      />
      {/* Cyan corner brackets */}
      <span className="p-bracket-tl" />
      <span className="p-bracket-tr" />
      <span className="p-bracket-bl" />
      <span className="p-bracket-br" />
    </div>
  )
}

// Pixel art detective standing in foreground near the desk with classic retro game idle animation
function DetectiveCharacter() {
  return (
    <div
      className="scene-detective-character detective-is-idle"
      aria-label="Pixel art detective character"
    >
      <img
        src="/images/detective-idle-1.png"
        alt="Pixel art detective character"
        className="detective-sprite-frame"
      />
      {/* Magnifying glass sparkle glint */}
      <div className="detective-lens-sparkle" aria-hidden="true">
        <span className="sparkle-star sparkle-star-1" />
        <span className="sparkle-star sparkle-star-2" />
      </div>
    </div>
  )
}

// CRT Screen overlay aligned inside the monitor bezel of Rainy Neon Detective Office
function CrtTerminalScreen({
  repoData,
  owner,
  repo,
}: {
  repoData: RepoBriefingData | null
  owner: string
  repo: string
}) {
  const [activeFileIndex, setActiveFileIndex] = useState(0)

  useEffect(() => {
    if (!repoData?.structureMap?.length) return
    const timer = window.setInterval(() => {
      setActiveFileIndex((prev) => (prev + 1) % repoData.structureMap.length)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [repoData])

  const currentFile = repoData?.structureMap?.[activeFileIndex]

  return (
    <div className="scene-crt-monitor-overlay" aria-label="CRT Monitor Screen Display">
      <div className="crt-scanlines" aria-hidden="true" />
      <div className="crt-glow-overlay" aria-hidden="true" />

      <div className="crt-terminal-content">
        <div className="crt-term-header">
          <span className="crt-status-dot">●</span>
          <span className="crt-term-title">REPO_OS v2.4</span>
          <span className="crt-term-pulse">ONLINE</span>
        </div>

        <div className="crt-term-target-row">
          <span className="crt-prompt-symbol">&gt;</span>
          <span className="crt-term-target">{owner}/{repo}</span>
        </div>

        <div className="crt-term-meta-row">
          <span className="crt-term-lang">{repoData?.primaryLanguage || "SOURCE"}</span>
          <span className="crt-term-stars">★{repoData?.stars?.toLocaleString() || "0"}</span>
          <span className="crt-term-branch">{repoData?.defaultBranch || "main"}</span>
        </div>

        {/* Small subtle scanning indicator / progress animation */}
        <div className="crt-scan-progress-bar">
          <div className="crt-progress-fill" />
        </div>

        {/* Real folder and file names discovered by existing analysis */}
        <div className="crt-file-tree">
          {repoData?.structureMap?.slice(0, 3).map((item, idx) => (
            <div
              key={item.name}
              className={`crt-file-line ${idx === (activeFileIndex % 3) ? "crt-file-active" : ""}`}
            >
              <span className="crt-tree-icon">{item.type === "dir" ? "📁" : "📄"}</span>
              <span className="crt-file-name">{item.name}</span>
              <span className="crt-file-role">[{item.role.slice(0, 8)}]</span>
            </div>
          ))}
        </div>

        <div className="crt-term-status-line">
          <span className="crt-term-cursor-prompt">&gt;</span>
          <span className="crt-term-action">
            {currentFile ? `INDEXING ${currentFile.name}` : "SCANNING MANIFEST..."}
          </span>
          <span className="crt-cursor">_</span>
        </div>
      </div>
    </div>
  )
}

// Retro Pixel-Art Left HUD Information Panel (Case File, Quick Read, Key Files)
function LeftHudPanel({
  data,
  owner,
  repo,
  isOpen,
  onClose,
}: {
  data: RepoBriefingData | null
  owner: string
  repo: string
  isOpen: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  if (!data) return null

  const handleCopyRepo = () => {
    navigator.clipboard.writeText(`${owner}/${repo}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleViewReadme = () => {
    window.open(`${data.url}#readme`, "_blank", "noopener,noreferrer")
  }

  return (
    <aside
      className={`hud-panel hud-panel-left ${isOpen ? "hud-panel-open" : ""}`}
      aria-label="Repository Dossier and Details"
    >
      <div className="hud-panel-inner">
        <div className="hud-panel-content">
          {/* 1. CASE FILE */}
          <div className="hud-section-card">
            <span className="card-bracket-tl" />
            <span className="card-bracket-tr" />
            <span className="card-bracket-bl" />
            <span className="card-bracket-br" />

            <div className="hud-card-header">
              <div className="hud-card-title-group">
                <span className="hud-card-icon">📁</span>
                <span className="hud-card-title">CASE FILE</span>
                <span className="hud-card-slashes">///</span>
              </div>
              <button
                className="hud-card-close-btn"
                onClick={onClose}
                title="Close Panel (X)"
                aria-label="Close Case File Panel"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="hud-meta-table">
              <div className="hud-meta-row">
                <span className="hud-meta-lbl">REPOSITORY</span>
                <div className="hud-meta-val-with-copy">
                  <span className="hud-meta-val">{owner}/{repo}</span>
                  <button
                    className="hud-copy-btn"
                    onClick={handleCopyRepo}
                    title="Copy repository slug"
                    type="button"
                  >
                    {copied ? "COPIED" : "📋"}
                  </button>
                </div>
              </div>
              <div className="hud-meta-row">
                <span className="hud-meta-lbl">BRANCH</span>
                <span className="hud-meta-val">{data.defaultBranch}</span>
              </div>
              <div className="hud-meta-row">
                <span className="hud-meta-lbl">LANGUAGE (MAIN)</span>
                <span className="hud-meta-val">{data.primaryLanguage || "General"}</span>
              </div>
              <div className="hud-meta-row">
                <span className="hud-meta-lbl">LAST UPDATED</span>
                <span className="hud-meta-val">{data.lastUpdated}</span>
              </div>
            </div>
          </div>

          {/* 2. QUICK READ */}
          <div className="hud-section-card">
            <span className="card-bracket-tl" />
            <span className="card-bracket-tr" />
            <span className="card-bracket-bl" />
            <span className="card-bracket-br" />

            <div className="hud-card-header">
              <div className="hud-card-title-group">
                <span className="hud-card-icon">📄</span>
                <span className="hud-card-title">QUICK READ</span>
                <span className="hud-card-slashes">///</span>
              </div>
            </div>

            <div className="hud-quick-read-content">
              <span className="hud-readme-tag">README.md</span>
              <p className="hud-readme-snippet">
                {data.description || data.whatItDoes || "No description provided."}
              </p>
              <button
                className="hud-readme-action-btn"
                onClick={handleViewReadme}
                title="View full README on GitHub"
                type="button"
              >
                VIEW README →
              </button>
            </div>
          </div>

          {/* 3. KEY FILES */}
          <div className="hud-section-card">
            <span className="card-bracket-tl" />
            <span className="card-bracket-tr" />
            <span className="card-bracket-bl" />
            <span className="card-bracket-br" />

            <div className="hud-card-header">
              <div className="hud-card-title-group">
                <span className="hud-card-icon">🔑</span>
                <span className="hud-card-title">KEY FILES</span>
                <span className="hud-card-slashes">///</span>
              </div>
            </div>

            <div className="hud-files-list">
              {data.structureMap?.slice(0, 5).map((file) => (
                <div key={file.name} className="hud-file-item">
                  <span className="hud-file-ico">{file.type === "dir" ? "📁" : "📄"}</span>
                  <span className="hud-file-txt">{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

// Retro Pixel-Art Right HUD Information Panel (Languages, Tech Stack, Repository Stats, Recent Activity)
function RightHudPanel({
  data,
  isOpen,
  onClose,
}: {
  data: RepoBriefingData | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!data) return null

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toLocaleString()
  }

  return (
    <aside
      className={`hud-panel hud-panel-right ${isOpen ? "hud-panel-open" : ""}`}
      aria-label="Repository Telemetry and Statistics"
    >
      <div className="hud-panel-inner">
        <div className="hud-panel-content">
          {/* 1. LANGUAGES */}
          <div className="hud-section-card">
            <span className="card-bracket-tl" />
            <span className="card-bracket-tr" />
            <span className="card-bracket-bl" />
            <span className="card-bracket-br" />

            <div className="hud-card-header">
              <div className="hud-card-title-group">
                <span className="hud-card-icon">📊</span>
                <span className="hud-card-title">LANGUAGES</span>
                <span className="hud-card-slashes">///</span>
              </div>
              <button
                className="hud-card-close-btn"
                onClick={onClose}
                title="Close Panel (X)"
                aria-label="Close Telemetry Panel"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="hud-languages-list">
              {data.languages && data.languages.length > 0 ? (
                data.languages.map((lang) => (
                  <div key={lang.name} className="hud-lang-row">
                    <div className="hud-lang-meta">
                      <span className="hud-lang-name">{lang.name}</span>
                      <span className="hud-lang-pct">{lang.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="hud-lang-track">
                      <div
                        className="hud-lang-bar"
                        style={{
                          width: `${Math.min(100, lang.percentage)}%`,
                          backgroundColor: lang.color || "#38bdf8",
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="hud-lang-row">
                  <div className="hud-lang-meta">
                    <span className="hud-lang-name">{data.primaryLanguage || "JavaScript"}</span>
                    <span className="hud-lang-pct">Primary</span>
                  </div>
                  <div className="hud-lang-track">
                    <div className="hud-lang-bar" style={{ width: "100%", backgroundColor: "#facc15" }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. TECH STACK */}
          <div className="hud-section-card">
            <span className="card-bracket-tl" />
            <span className="card-bracket-tr" />
            <span className="card-bracket-bl" />
            <span className="card-bracket-br" />

            <div className="hud-card-header">
              <div className="hud-card-title-group">
                <span className="hud-card-icon">&lt;/&gt;</span>
                <span className="hud-card-title">TECH STACK</span>
                <span className="hud-card-slashes">//</span>
              </div>
            </div>

            <div className="hud-tech-list">
              {data.techStack && data.techStack.length > 0 ? (
                data.techStack.map((tech) => (
                  <div key={tech.name} className="hud-tech-row">
                    <div className="hud-tech-left">
                      <span className={`hud-tech-icon-badge hud-badge-${tech.badge.toLowerCase()}`}>
                        {tech.badge}
                      </span>
                      <span className="hud-tech-name">{tech.name}</span>
                    </div>
                    <span className={`hud-tech-tag ${tech.isPrimary ? "hud-tag-primary" : "hud-tag-detected"}`}>
                      {tech.tag}
                    </span>
                  </div>
                ))
              ) : (
                <div className="hud-tech-row">
                  <div className="hud-tech-left">
                    <span className="hud-tech-icon-badge hud-badge-js">
                      {(data.primaryLanguage || "JS").slice(0, 3).toUpperCase()}
                    </span>
                    <span className="hud-tech-name">{data.primaryLanguage || "JavaScript"}</span>
                  </div>
                  <span className="hud-tech-tag hud-tag-primary">PRIMARY</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. REPOSITORY STATS */}
          <div className="hud-section-card">
            <span className="card-bracket-tl" />
            <span className="card-bracket-tr" />
            <span className="card-bracket-bl" />
            <span className="card-bracket-br" />

            <div className="hud-card-header">
              <div className="hud-card-title-group">
                <span className="hud-card-icon">📈</span>
                <span className="hud-card-title">REPOSITORY STATS</span>
                <span className="hud-card-slashes">///</span>
              </div>
            </div>

            <div className="hud-stats-grid">
              <div className="hud-stat-cell">
                <span className="hud-stat-icon stat-icon-gold">★</span>
                <div className="hud-stat-info">
                  <span className="hud-stat-val">{formatNumber(data.stars)}</span>
                  <span className="hud-stat-lbl">Stars</span>
                </div>
              </div>
              <div className="hud-stat-cell">
                <span className="hud-stat-icon">⏱</span>
                <div className="hud-stat-info">
                  <span className="hud-stat-val">{data.openIssues}</span>
                  <span className="hud-stat-lbl">Open Issues</span>
                </div>
              </div>
              <div className="hud-stat-cell">
                <span className="hud-stat-icon">🍴</span>
                <div className="hud-stat-info">
                  <span className="hud-stat-val">{formatNumber(data.forks)}</span>
                  <span className="hud-stat-lbl">Forks</span>
                </div>
              </div>
              <div className="hud-stat-cell">
                <span className="hud-stat-icon">👥</span>
                <div className="hud-stat-info">
                  <span className="hud-stat-val">{data.contributorsCount}</span>
                  <span className="hud-stat-lbl">Contributors</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. RECENT ACTIVITY */}
          <div className="hud-section-card">
            <span className="card-bracket-tl" />
            <span className="card-bracket-tr" />
            <span className="card-bracket-bl" />
            <span className="card-bracket-br" />

            <div className="hud-card-header">
              <div className="hud-card-title-group">
                <span className="hud-card-icon">🕒</span>
                <span className="hud-card-title">RECENT ACTIVITY</span>
                <span className="hud-card-slashes">///</span>
              </div>
            </div>

            <div className="hud-activity-timeline">
              {data.recentActivity?.map((act, i) => (
                <div key={i} className="hud-activity-node">
                  <span className="hud-timeline-dot" />
                  <span className="hud-activity-date">{act.date}</span>
                  <span className="hud-activity-action">{act.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function DetectiveOfficeIntro({
  owner,
  repo,
  repositoryUrl,
  onBackToHq,
  onEnterDashboard,
}: DetectiveOfficeIntroProps) {
  const [data, setData] = useState<RepoBriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialogue state: exactly 4 stages
  const [stepIndex, setStepIndex] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  const typewriterTimerRef = useRef<number | null>(null)

  // Fetch repository briefing data
  const loadRepoData = useCallback(async (currentOwner: string, currentRepo: string) => {
    setLoading(true)
    setError(null)
    setStepIndex(0)
    setCharCount(0)
    try {
      const briefing = await fetchRepoBriefing(currentOwner, currentRepo)
      setData(briefing)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to interrogate repository."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRepoData(owner, repo)
  }, [owner, repo, loadRepoData])

  // Build the 4 short dialogue screens using strictly verified repo data
  const screens: DialogueScreen[] = useMemo(() => {
    if (!data) return []
    return [
      {
        id: "stage-1-does",
        stageNumber: 1,
        speakerTag: "DETECTIVE // INTEL",
        title: "WHAT THE PROJECT DOES",
        text: `Hey there, rookie! Let's inspect this repository and understand how it connects. Today's case is ${
          data.fullName || `${data.owner}/${data.repo}`
        }${data.primaryLanguage ? ` (${data.primaryLanguage})` : ""}. ${
          data.description ||
          data.whatItDoes ||
          `An open-source repository maintained on GitHub.`
        }`,
      },
      {
        id: "stage-2-problem",
        stageNumber: 2,
        speakerTag: "DETECTIVE // MOTIVE",
        title: "THE PROBLEM IT SOLVES",
        text: `Every codebase has a motive. Here's why this project exists: ${data.problemSolved}`,
      },
      {
        id: "stage-3-how",
        stageNumber: 3,
        speakerTag: "DETECTIVE // MECHANISM",
        title: "HOW IT WORKS",
        text: `Under the hood, here's the core architecture: ${
          data.repositoryOverview || data.whatItDoes
        }`,
      },
      {
        id: "stage-4-explore",
        stageNumber: 4,
        speakerTag: "DETECTIVE // CRIME SCENE",
        title: "WHAT WE'LL EXPLORE NEXT",
        text: (() => {
          const entry =
            data.structureMap.find((s) => s.role.toUpperCase().includes("ENTRY")) ||
            data.structureMap[0]
          const second =
            data.structureMap.find((s) => s !== entry && s.type === "file") ||
            data.structureMap[1]
          if (entry && second) {
            return `We'll begin our investigation at ${entry.name} (${entry.role}) and trace how it connects to ${second.name}. Ready to dive in? Let's crack this case wide open!`
          }
          if (entry) {
            return `We'll begin our investigation at ${entry.name} (${entry.role}) and follow the clues. Ready to dive in? Let's crack this case wide open!`
          }
          return `We'll inspect the repository's core files, follow the import traces, and understand how the key functions are built. Ready to dive in?`
        })(),
      },
    ]
  }, [data])

  const currentScreen = screens[stepIndex]

  // Typewriter effect with pre-measured paragraph geometry to eliminate text-wrapping flicker
  useEffect(() => {
    if (loading || error || !currentScreen) return

    const fullText = currentScreen.text
    let current = 0
    setCharCount(0)
    setIsTyping(true)

    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current)
    }

    typewriterTimerRef.current = window.setInterval(() => {
      current++
      if (current <= fullText.length) {
        setCharCount(current)
      } else {
        setIsTyping(false)
        if (typewriterTimerRef.current) {
          clearInterval(typewriterTimerRef.current)
        }
      }
    }, 18)

    return () => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current)
      }
    }
  }, [stepIndex, loading, error, currentScreen?.id])

  // Advance dialogue or reveal complete text instantly on click
  const handleDialogueClick = () => {
    if (loading || error || !currentScreen) return

    if (isTyping) {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current)
      }
      setCharCount(currentScreen.text.length)
      setIsTyping(false)
    } else {
      if (stepIndex < screens.length - 1) {
        setStepIndex((prev) => prev + 1)
      } else {
        handleEnterInvestigation()
      }
    }
  }

  // Navigate directly to the existing dashboard (Page 3 handoff)
  const handleEnterInvestigation = () => {
    setFadingOut(true)
    setTimeout(() => {
      onEnterDashboard(data?.url || repositoryUrl)
    }, 320)
  }

  // Keyboard controls: Space/Enter advances, Escape skips
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault()
        handleDialogueClick()
      } else if (e.code === "Escape") {
        e.preventDefault()
        handleEnterInvestigation()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isTyping, stepIndex, screens, loading, error])

  return (
    <main className={`office-intro-page ${fadingOut ? "office-fade-out" : ""}`}>
      {/* Top Header Bar */}
      <header className="office-top-nav">
        <button className="office-logo-btn" onClick={onBackToHq} title="Return to HQ">
          <Logo compact />
        </button>

        <div className="office-nav-center">
          <span className="case-tag-pill">
            CASE FILE #{owner.slice(0, 3).toUpperCase()}_042
          </span>
          <span className="case-target-label">
            {owner} / {repo}
          </span>
        </div>

        <div className="office-nav-actions">
          <button
            className="office-skip-btn"
            onClick={handleEnterInvestigation}
            title="Skip straight to dashboard"
          >
            SKIP INTRO <Icon name="arrow" size={12} />
          </button>
        </div>
      </header>

      {/* Retro Pixel-Art Edge Trigger Tabs (only shown when panels are closed; when open, use X to close) */}
      {!leftPanelOpen && (
        <button
          className="hud-edge-tab hud-edge-tab-left"
          onClick={() => setLeftPanelOpen(true)}
          title="Open Case File"
          aria-expanded={false}
          type="button"
        >
          <span className="hud-tab-icon">📁</span>
          <span className="hud-tab-label">CASE FILE</span>
          <span className="hud-tab-arrow">▶</span>
        </button>
      )}

      {!rightPanelOpen && (
        <button
          className="hud-edge-tab hud-edge-tab-right"
          onClick={() => setRightPanelOpen(true)}
          title="Open Intel"
          aria-expanded={false}
          type="button"
        >
          <span className="hud-tab-arrow">◀</span>
          <span className="hud-tab-icon">📊</span>
          <span className="hud-tab-label">INTEL</span>
        </button>
      )}

      {/* Retro Pixel-Art HUD Side Panels */}
      <LeftHudPanel
        data={data}
        owner={owner}
        repo={repo}
        isOpen={leftPanelOpen}
        onClose={() => setLeftPanelOpen(false)}
      />

      <RightHudPanel
        data={data}
        isOpen={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
      />

      {/* Main Living Scene Stage Container (Dimensions, layout, and scene strictly preserved) */}
      <div className="office-stage-container">
        <div className="reference-scene-wrapper">
          {/* Authentic 16-bit Pixel Art Detective Office Viewport */}
          <div
            className="reference-scene-viewport"
            aria-label="Retro pixel art detective office scene matching reference artwork"
          >
            {/* 1. New Main Background: Rainy Neon Detective Office.png */}
            <img
              src="/images/Rainy Neon Detective Office.png"
              alt="Retro pixel-art detective office"
              className="reference-scene-bg-img"
            />

            {/* 2. Window Rain Streaks Overlay (Constrained strictly to the window) */}
            <div className="scene-rain-overlay" aria-hidden="true">
              <svg className="rain-svg" viewBox="0 0 300 450" preserveAspectRatio="none">
                <g className="rain-layer">
                  <line x1="25" y1="20" x2="10" y2="70" stroke="#7ecbf2" strokeWidth="1.5" />
                  <line x1="65" y1="120" x2="50" y2="170" stroke="#7ecbf2" strokeWidth="1.2" />
                  <line x1="110" y1="40" x2="95" y2="90" stroke="#a6e1ff" strokeWidth="1.5" />
                  <line x1="150" y1="160" x2="135" y2="210" stroke="#7ecbf2" strokeWidth="1.2" />
                  <line x1="195" y1="30" x2="180" y2="80" stroke="#a6e1ff" strokeWidth="1.6" />
                  <line x1="240" y1="140" x2="225" y2="190" stroke="#7ecbf2" strokeWidth="1.4" />
                  <line x1="280" y1="60" x2="265" y2="110" stroke="#7ecbf2" strokeWidth="1.2" />
                  <line x1="85" y1="250" x2="70" y2="300" stroke="#7ecbf2" strokeWidth="1.2" />
                  <line x1="170" y1="270" x2="155" y2="320" stroke="#a6e1ff" strokeWidth="1.5" />
                  <line x1="260" y1="280" x2="245" y2="330" stroke="#7ecbf2" strokeWidth="1.3" />
                </g>
              </svg>
            </div>

            {/* 3. Cozy Corner Oil Lantern Warm Amber Light Pulse */}
            <div className="scene-lantern-glow" aria-hidden="true" />

            {/* 4. Banker's Desk Lamp Warm Light Glow */}
            <div className="scene-desklamp-glow" aria-hidden="true" />

            {/* 5. Pixel Art Detective Character in foreground near desk */}
            <DetectiveCharacter />

            {/* 6. Live CRT Terminal Screen aligned inside the monitor bezel */}
            <CrtTerminalScreen repoData={data} owner={owner} repo={repo} />

            {/* 7. CLASSIC RPG DIALOGUE BOX (Positioned over lower scene) */}
            <div
              className="reference-dialogue-panel"
              onClick={handleDialogueClick}
              role="region"
              aria-label="Detective conversation dialogue"
            >
              {/* Double cyan pixel border frame */}
              <div className="rpg-border-outer">
                <div className="rpg-border-inner">
                  {/* Dialogue Content Layout */}
                  <div className="rpg-dialogue-content">
                    {/* Left Avatar Portrait using authentic artwork crop (Static) */}
                    <DetectiveDialoguePortrait />

                    {/* Right Dialogue Text Area */}
                    <div className="rpg-text-container">
                      {/* Header line: Speaker badge + Stage indicator */}
                      <div className="rpg-header-row">
                        <span className="rpg-speaker-title">
                          {currentScreen ? currentScreen.speakerTag : "DETECTIVE"}
                        </span>
                        {!loading && !error && (
                          <span className="rpg-stage-indicator">
                            STAGE 0{stepIndex + 1} / 0{screens.length}
                          </span>
                        )}
                      </div>

                      {/* Dialogue message body */}
                      <div className="rpg-message-body">
                        {loading ? (
                          <div className="rpg-loading-state">
                            <p className="rpg-p">
                              “Examining case manifests for <b>{owner}/{repo}</b>. Gathering initial intel…”
                            </p>
                            <div className="loading-radar-dots">
                              <span className="dot dot-1" />
                              <span className="dot dot-2" />
                              <span className="dot dot-3" />
                            </div>
                          </div>
                        ) : error ? (
                          <div className="rpg-error-state">
                            <p className="rpg-p text-coral">
                              “Case file access blocked. {error} Let's try another approach.”
                            </p>
                            <div className="error-actions-row" onClick={(e) => e.stopPropagation()}>
                              <Button className="button--primary btn-sm" onClick={() => loadRepoData(owner, repo)}>
                                <Icon name="search" size={14} /> RETRY ANALYSIS
                              </Button>
                              <Button
                                className="button--secondary btn-sm"
                                onClick={() => loadRepoData("vercel", "ms")}
                              >
                                EXPLORE SAMPLE (vercel/ms)
                              </Button>
                              <Button className="button--quiet btn-sm" onClick={onBackToHq}>
                                RETURN TO HQ
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="rpg-active-text">
                            <p className="rpg-p">
                              <span className="rpg-typed-text">{currentScreen.text.slice(0, charCount)}</span>
                              <span className="rpg-untyped-text" aria-hidden="true">{currentScreen.text.slice(charCount)}</span>
                              {isTyping && <span className="rpg-typewriter-cursor">▌</span>}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer Row: Space helper + Next Action Button / Diamond Indicator */}
                      {!loading && !error && (
                        <div className="rpg-footer-row">
                          <div className="rpg-hint-note">
                            <span className="rpg-key-tag">SPACE</span>
                            <span className="rpg-hint-text">
                              {isTyping ? "or click to reveal" : "or click to continue"}
                            </span>
                          </div>

                          <div className="rpg-action-slot" onClick={(e) => e.stopPropagation()}>
                            {stepIndex === screens.length - 1 ? (
                              <Button
                                className="button--primary rpg-enter-btn"
                                onClick={handleEnterInvestigation}
                              >
                                ENTER INVESTIGATION <Icon name="arrow" size={14} />
                              </Button>
                            ) : (
                              <Button className="button--secondary rpg-continue-btn" onClick={handleDialogueClick}>
                                {isTyping ? "REVEAL ALL" : "CONTINUE"} <span className="rpg-cyan-diamond">♦</span>
                              </Button>
                            )}
                          </div>
                        </div>
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
  )
}
