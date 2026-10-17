import { useState, useEffect } from "react"
import { Icon } from "./App"
import {
  fetchFileContent,
  type RepoBriefingData,
  type TreeEntry,
} from "./repoService"
import { PixelDetectiveSprite } from "./PixelDetectiveSprite"

export interface GameLevel {
  id: number
  title: string
  subtitle: string
  difficulty: "Rookie" | "Investigator" | "Inspector" | "Mastermind"
  xpReward: number
  requiredStars: number
  description: string
  missionGoal: string
  targetFiles: string[]
  hints: string[]
  questionPrompt?: string
  verificationCheck: (files: string[], repoData?: RepoBriefingData | null) => boolean
}

export const GAME_LEVELS: GameLevel[] = [
  {
    id: 1,
    title: "Repository Overview",
    subtitle: "Dossier Reconnaissance",
    difficulty: "Rookie",
    xpReward: 100,
    requiredStars: 0,
    description: "Scan the repository manifesto, license, primary programming language, and community metrics to establish a foundation.",
    missionGoal: "Inspect the repository summary, README, and confirm the project's primary purpose.",
    targetFiles: ["readme.md", "README.md", "package.json"],
    hints: [
      "Check the README file for installation guides and project overview.",
      "Identify the primary language tag and open-source license clearance.",
    ],
    questionPrompt: "Explain this repository and what core problem it solves.",
    verificationCheck: () => true,
  },
  {
    id: 2,
    title: "Find the Entry Point",
    subtitle: "Execution Trace",
    difficulty: "Rookie",
    xpReward: 150,
    requiredStars: 1,
    description: "Locate the primary execution entry file declared in package.json or the repository root where execution begins.",
    missionGoal: "Identify the main export file (e.g. source/index.js or index.ts) and trace its top-level exported functions.",
    targetFiles: ["package.json", "source/index.js", "src/index.ts", "index.js"],
    hints: [
      "Open package.json and look at the 'main', 'module', or 'exports' fields.",
      "The top-level index file usually exports the public API functions.",
    ],
    questionPrompt: "Find the main entry point and trace what runs first.",
    verificationCheck: () => true,
  },
  {
    id: 3,
    title: "Explore the File Structure",
    subtitle: "Folder Blueprint",
    difficulty: "Investigator",
    xpReward: 200,
    requiredStars: 2,
    description: "Map the folder organization, source directories, assets, and config files across the tree hierarchy.",
    missionGoal: "Inspect key directories (src/, test/, docs/, config) and uncover how code is split across modules.",
    targetFiles: ["source/", "src/", "test/", "lib/"],
    hints: [
      "Observe if the repository separates build artifacts, source code, and configurations.",
      "Check for utility directories, types declarations, or submodules.",
    ],
    questionPrompt: "Explain the file and folder layout of this repository.",
    verificationCheck: () => true,
  },
  {
    id: 4,
    title: "Investigate Dependencies",
    subtitle: "Supply Chain Clues",
    difficulty: "Investigator",
    xpReward: 250,
    requiredStars: 4,
    description: "Examine external packages, third-party libraries, dev dependencies, and runtime requirements.",
    missionGoal: "Inspect package.json dependencies and identify runtime vs development tooling.",
    targetFiles: ["package.json", "package-lock.json", "yarn.lock"],
    hints: [
      "Check 'dependencies' vs 'devDependencies' in the manifest.",
      "Micro-utilities often boast zero external dependencies for maximum speed.",
    ],
    questionPrompt: "Identify dependencies and external packages used here.",
    verificationCheck: () => true,
  },
  {
    id: 5,
    title: "Understand the Core Logic",
    subtitle: "Algorithm Deep Dive",
    difficulty: "Inspector",
    xpReward: 300,
    requiredStars: 6,
    description: "Decipher the core algorithms, regex matching, parsing routines, or state management rules.",
    missionGoal: "Read through the primary conversion/parsing loop and understand how durations or data transformations operate.",
    targetFiles: ["source/index.js", "src/index.ts", "src/index.js"],
    hints: [
      "Look for regular expressions used to extract numeric quantities and unit suffixes.",
      "Notice how edge cases (like negatives, NaN, or decimals) are validated.",
    ],
    questionPrompt: "Explain how the core logic and main parsing function works.",
    verificationCheck: () => true,
  },
  {
    id: 6,
    title: "Discover Tests",
    subtitle: "Validation Arsenal",
    difficulty: "Inspector",
    xpReward: 350,
    requiredStars: 8,
    description: "Unearth the automated test suites, testing frameworks, assertions, and test coverage cases.",
    missionGoal: "Inspect the test suite (test/index.js or spec files) and see what edge cases are validated.",
    targetFiles: ["test/index.js", "tests/", "spec/", "package.json"],
    hints: [
      "Look for 'test' scripts in package.json (e.g., mocha, jest, ava).",
      "Notice how test cases cover invalid input handling, zero duration, and unit conversions.",
    ],
    questionPrompt: "What test suites exist and what edge cases do they test?",
    verificationCheck: () => true,
  },
  {
    id: 7,
    title: "Solve the Architecture Challenge",
    subtitle: "Pattern Interrogation",
    difficulty: "Mastermind",
    xpReward: 400,
    requiredStars: 10,
    description: "Analyze the design patterns, modular boundaries, error handling philosophies, and export strategies.",
    missionGoal: "Determine whether the codebase follows functional programming, object-oriented, or pipeline architectural styles.",
    targetFiles: ["source/index.js", "readme.md", "package.json"],
    hints: [
      "Check whether functions are pure, idempotent, or mutate internal state.",
      "Assess how TypeScript types or JSDoc comments are exported for consumers.",
    ],
    questionPrompt: "Explain the architecture, design patterns, and modularity choices.",
    verificationCheck: () => true,
  },
  {
    id: 8,
    title: "Final Detective Challenge",
    subtitle: "Master Case Closed",
    difficulty: "Mastermind",
    xpReward: 500,
    requiredStars: 13,
    description: "Synthesize all forensic evidence: entry points, architecture, dependencies, and propose a pull request or refactoring clue.",
    missionGoal: "Review full repository dossier, answer forensic interrogation questions, and earn the Legendary Code Sleuth badge.",
    targetFiles: ["readme.md", "source/index.js", "package.json", "test/index.js"],
    hints: [
      "Review your accumulated case notes and insights.",
      "Formulate a complete summary of how you would contribute or extend this project.",
    ],
    questionPrompt: "Give me a complete developer's breakdown: strengths, weaknesses, and potential improvements.",
    verificationCheck: () => true,
  },
]

interface RepositoryGameMapProps {
  currentRepo: string
  repoData: RepoBriefingData | null
  treeEntries: TreeEntry[]
  onOpenAskQuestions: (prompt?: string) => void
  onOpenExplorerWithFile?: (filePath: string) => void
}

export function RepositoryGameMap({
  currentRepo,
  repoData,
  treeEntries,
  onOpenAskQuestions,
}: RepositoryGameMapProps) {
  // Persistence key per repo
  const progressKey = `repodetective_game_progress_${currentRepo.toLowerCase()}`

  // State: level progress (completed level IDs, stars per level, total XP)
  const [completedLevels, setCompletedLevels] = useState<number[]>([1])
  const [levelStars, setLevelStars] = useState<Record<number, number>>({ 1: 3 })
  const [totalXp, setTotalXp] = useState<number>(100)
  const [selectedLevel, setSelectedLevel] = useState<GameLevel | null>(null)
  const [previewFileContent, setPreviewFileContent] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string | null>(null)
  const [loadingFilePreview, setLoadingFilePreview] = useState<boolean>(false)
  const [solvingLevel, setSolvingLevel] = useState<boolean>(false)

  // Load progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(progressKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.completedLevels) setCompletedLevels(parsed.completedLevels)
        if (parsed.levelStars) setLevelStars(parsed.levelStars)
        if (parsed.totalXp) setTotalXp(parsed.totalXp)
      } else {
        // Defaults: Level 1 completed with 3 stars
        setCompletedLevels([1])
        setLevelStars({ 1: 3 })
        setTotalXp(100)
      }
    } catch {
      // ignore
    }
  }, [progressKey])

  // Save progress helper
  const saveProgress = (completed: number[], stars: Record<number, number>, xp: number) => {
    setCompletedLevels(completed)
    setLevelStars(stars)
    setTotalXp(xp)
    try {
      localStorage.setItem(
        progressKey,
        JSON.stringify({ completedLevels: completed, levelStars: stars, totalXp: xp })
      )
    } catch {
      // ignore
    }
  }

  // Calculate current total stars
  const totalStars = Object.values(levelStars).reduce((acc, s) => acc + s, 0)

  // Rank determination
  const getDetectiveRank = (xp: number) => {
    if (xp >= 1800) return { title: "Legendary Code Sleuth", badge: "🎖️ MASTER" }
    if (xp >= 1200) return { title: "Chief Investigator", badge: "⭐ CHIEF" }
    if (xp >= 700) return { title: "Senior Inspector", badge: "🔍 INSPECTOR" }
    if (xp >= 300) return { title: "Forensic Gumshoe", badge: "🕵️ GUMSHOE" }
    return { title: "Rookie Sleuth", badge: "🔰 ROOKIE" }
  }

  const currentRank = getDetectiveRank(totalXp)

  // Active level node (highest unlocked but incomplete, or last completed)
  const isLevelUnlocked = (lvl: GameLevel) => {
    if (lvl.id === 1) return true
    if (completedLevels.includes(lvl.id)) return true
    // Need previous level completed AND enough stars
    const prevCompleted = completedLevels.includes(lvl.id - 1)
    const hasEnoughStars = totalStars >= lvl.requiredStars
    return prevCompleted && hasEnoughStars
  }

  // Find the current active level node where the guide detective stands
  const activeLevelId = (() => {
    for (const lvl of GAME_LEVELS) {
      if (!completedLevels.includes(lvl.id) && isLevelUnlocked(lvl)) {
        return lvl.id
      }
    }
    return GAME_LEVELS[GAME_LEVELS.length - 1].id
  })()

  // S-Curve Coordinates for 8 Nodes on a scrollable game canvas
  // Height 1100px, Width 900px
  const nodeCoordinates: Record<number, { x: number; y: number }> = {
    1: { x: 450, y: 980 },
    2: { x: 260, y: 860 },
    3: { x: 200, y: 720 },
    4: { x: 380, y: 600 },
    5: { x: 650, y: 500 },
    6: { x: 720, y: 360 },
    7: { x: 520, y: 240 },
    8: { x: 450, y: 100 },
  }

  // Generate SVG curve path connecting the 8 nodes from bottom to top
  const pathD = `
    M 450 980
    C 380 940, 260 910, 260 860
    C 260 810, 190 770, 200 720
    C 210 660, 310 630, 380 600
    C 450 570, 600 540, 650 500
    C 700 460, 750 410, 720 360
    C 690 310, 570 280, 520 240
    C 470 200, 450 150, 450 100
  `

  // Handle Level Complete Challenge
  const handleSolveChallenge = (level: GameLevel) => {
    setSolvingLevel(true)
    setTimeout(() => {
      const alreadyCompleted = completedLevels.includes(level.id)
      const earnedStars = alreadyCompleted ? (levelStars[level.id] || 3) : 3
      const nextCompleted = alreadyCompleted
        ? completedLevels
        : [...completedLevels, level.id]
      const nextStars = { ...levelStars, [level.id]: Math.max(levelStars[level.id] || 0, earnedStars) }
      const nextXp = alreadyCompleted ? totalXp : totalXp + level.xpReward

      saveProgress(nextCompleted, nextStars, nextXp)
      setSolvingLevel(false)
      setSelectedLevel(null)
    }, 600)
  }

  // Preview file in challenge modal
  const handlePreviewFile = async (filePath: string) => {
    setPreviewFileName(filePath)
    setLoadingFilePreview(true)
    setPreviewFileContent(null)
    try {
      const parts = currentRepo.split("/")
      const owner = parts[0] || "vercel"
      const repo = parts[1] || "ms"
      const content = await fetchFileContent(owner, repo, filePath)
      setPreviewFileContent(content)
    } catch {
      setPreviewFileContent(`// Clue Note: Unable to fetch live remote content for ${filePath}.\n// Evidence markers show standard configuration for this repository case.`)
    } finally {
      setLoadingFilePreview(false)
    }
  }

  return (
    <div className="repomap-game-container">
      {/* ========================================================
          GAME HUD BAR (Stars, XP, Detective Rank, Legend)
         ======================================================== */}
      <div className="repomap-hud">
        <div className="repomap-hud-left">
          <div className="repomap-hud-badge">
            <span className="hud-badge-icon">{currentRank.badge}</span>
            <div className="hud-badge-info">
              <span className="hud-rank-label">DETECTIVE RANK</span>
              <span className="hud-rank-title">{currentRank.title}</span>
            </div>
          </div>

          <div className="repomap-hud-stat">
            <div className="hud-stat-header">
              <span className="hud-stat-icon">⭐</span>
              <span className="hud-stat-value">{totalStars} / 24</span>
              <span className="hud-stat-sub">STARS</span>
            </div>
            <div className="hud-progress-track">
              <div
                className="hud-progress-fill stars"
                style={{ width: `${Math.min(100, (totalStars / 24) * 100)}%` }}
              />
            </div>
          </div>

          <div className="repomap-hud-stat">
            <div className="hud-stat-header">
              <span className="hud-stat-icon">⚡</span>
              <span className="hud-stat-value">{totalXp} XP</span>
              <span className="hud-stat-sub">EXPERIENCE</span>
            </div>
            <div className="hud-progress-track">
              <div
                className="hud-progress-fill xp"
                style={{ width: `${Math.min(100, (totalXp / 2250) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="repomap-hud-right">
          <div className="repomap-hud-pill">
            <span className="pill-dot blink-cyan" />
            <span>CASE: <b>{currentRepo}</b></span>
          </div>
          <button
            className="repomap-reset-btn"
            onClick={() => {
              if (window.confirm("Reset case progress for this repository?")) {
                saveProgress([1], { 1: 3 }, 100)
              }
            }}
            title="Reset Game Progress"
            type="button"
          >
            RESET
          </button>
        </div>
      </div>

      {/* ========================================================
          SCROLLABLE ATMOSPHERIC WINDING MAP STAGE
         ======================================================== */}
      <div className="repomap-stage-scroll">
        <div className="repomap-stage-canvas">
          {/* Neon Cyberpunk Ambient Atmosphere & Grid */}
          <div className="repomap-grid-pattern" aria-hidden="true" />
          <div className="repomap-radial-glow top" aria-hidden="true" />
          <div className="repomap-radial-glow bottom" aria-hidden="true" />

          {/* SVG Winding Path between nodes */}
          <svg
            className="repomap-svg-path"
            viewBox="0 0 900 1100"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Outer Cyan Glow Filter */}
              <filter id="neon-path-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Neon Linear Gradient */}
              <linearGradient id="pathGradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.9" />
                <stop offset="45%" stopColor="#9477ff" stopOpacity="0.95" />
                <stop offset="75%" stopColor="#00e5ff" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffd875" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Background Path Track */}
            <path
              d={pathD}
              fill="none"
              stroke="#0a1a3d"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Mid Path Border */}
            <path
              d={pathD}
              fill="none"
              stroke="#1b3668"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Glowing Neon Candy Crush Dotted Trail */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#pathGradient)"
              strokeWidth="5"
              strokeDasharray="10 14"
              strokeLinecap="round"
              className="repomap-animated-dash"
              filter="url(#neon-path-glow)"
            />
          </svg>

          {/* Environmental Evidence Markers & Props */}
          <div className="repomap-props-layer" aria-hidden="true">
            <div className="map-prop prop-magnifier" style={{ left: 130, top: 930 }}>
              <span>🔍</span>
              <small>CASE START</small>
            </div>
            <div className="map-prop prop-evidence" style={{ left: 80, top: 760 }}>
              <span className="prop-tag">EVIDENCE #03</span>
              <small>AST TREE</small>
            </div>
            <div className="map-prop prop-evidence" style={{ left: 830, top: 430 }}>
              <span className="prop-tag">EVIDENCE #05</span>
              <small>PARSER LOGIC</small>
            </div>
            <div className="map-prop prop-vault" style={{ left: 570, top: 70 }}>
              <span className="vault-icon">🏆</span>
              <small>CASE SOLVED</small>
            </div>
          </div>

          {/* Interactive Game Level Nodes */}
          {GAME_LEVELS.map((level) => {
            const coord = nodeCoordinates[level.id] || { x: 450, y: 500 }
            const isCompleted = completedLevels.includes(level.id)
            const isUnlocked = isLevelUnlocked(level)
            const isCurrent = level.id === activeLevelId
            const stars = levelStars[level.id] || 0

            return (
              <div
                key={level.id}
                className={`repomap-node-wrap ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""} ${!isUnlocked ? "locked" : ""}`}
                style={{
                  left: `${coord.x}px`,
                  top: `${coord.y}px`,
                }}
              >
                {/* Guide Detective Sprite positioned at the active level */}
                {isCurrent && (
                  <div className="repomap-guide-char">
                    <div className="guide-char-bubble">
                      <span>Level {level.id} Active!</span>
                    </div>
                    <div className="guide-char-sprite">
                      <PixelDetectiveSprite />
                    </div>
                  </div>
                )}

                {/* Circular Glowing Level Node */}
                <button
                  className="repomap-node-circle"
                  onClick={() => {
                    if (isUnlocked) {
                      setSelectedLevel(level)
                      setPreviewFileContent(null)
                      setPreviewFileName(null)
                    }
                  }}
                  disabled={!isUnlocked}
                  title={isUnlocked ? `Level ${level.id}: ${level.title}` : `Locked. Requires ${level.requiredStars} stars.`}
                  type="button"
                >
                  {/* Outer pulsating ring for current node */}
                  {isCurrent && <span className="repomap-pulse-ring" />}

                  {/* Node Core Content */}
                  <div className="repomap-node-inner">
                    {isCompleted ? (
                      <span className="node-icon-check">✓</span>
                    ) : !isUnlocked ? (
                      <span className="node-icon-lock">🔒</span>
                    ) : (
                      <span className="node-number">{level.id}</span>
                    )}
                  </div>

                  {/* Star Rating Badge (Candy Crush Style) */}
                  <div className="repomap-node-stars">
                    <span className={`star ${stars >= 1 ? "filled" : ""}`}>★</span>
                    <span className={`star center ${stars >= 2 ? "filled" : ""}`}>★</span>
                    <span className={`star ${stars >= 3 ? "filled" : ""}`}>★</span>
                  </div>
                </button>

                {/* Node Level Label */}
                <div className="repomap-node-label">
                  <span className="node-label-title">{level.title}</span>
                  <span className="node-label-sub">{level.subtitle}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ========================================================
          LEVEL CHALLENGE MODAL / INSPECTION DOSSIER
         ======================================================== */}
      {selectedLevel && (
        <div className="repomap-modal-overlay" onClick={() => setSelectedLevel(null)}>
          <div className="repomap-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="repomap-modal-header">
              <div className="modal-header-tag">
                <span className="badge-level">LEVEL {selectedLevel.id}</span>
                <span className="badge-diff">{selectedLevel.difficulty}</span>
                <span className="badge-xp">+{selectedLevel.xpReward} XP</span>
              </div>
              <button
                className="repomap-modal-close"
                onClick={() => setSelectedLevel(null)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="repomap-modal-body">
              <h2 className="modal-level-title">{selectedLevel.title}</h2>
              <div className="modal-level-subtitle">{selectedLevel.subtitle}</div>

              <div className="modal-section">
                <span className="section-label">MISSION OBJECTIVE</span>
                <p className="section-desc">{selectedLevel.description}</p>
                <div className="mission-goal-box">
                  <span className="goal-icon">🎯</span>
                  <span>{selectedLevel.missionGoal}</span>
                </div>
              </div>

              {/* Target Repository Files */}
              <div className="modal-section">
                <span className="section-label">EVIDENCE DOSSIER &amp; RELEVANT FILES</span>
                <div className="target-files-row">
                  {selectedLevel.targetFiles.map((file) => {
                    const existsInTree = treeEntries.some((e) => e.path.toLowerCase().includes(file.toLowerCase()))
                    return (
                      <button
                        key={file}
                        className={`target-file-pill ${previewFileName === file ? "active" : ""}`}
                        onClick={() => handlePreviewFile(file)}
                        type="button"
                      >
                        <span className="file-icon">📄</span>
                        <span className="file-name">{file}</span>
                        {existsInTree && <span className="verified-dot" title="Verified in live repository tree" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Live File Content Preview */}
              {previewFileName && (
                <div className="modal-file-preview-box">
                  <div className="preview-header">
                    <span>INSPECTING: {previewFileName}</span>
                    {loadingFilePreview && <span className="loading-tag">SCANNING...</span>}
                  </div>
                  <pre className="preview-content">
                    {loadingFilePreview ? "Loading forensic file source..." : previewFileContent}
                  </pre>
                </div>
              )}

              {/* Clues and Hints */}
              <div className="modal-section">
                <span className="section-label">INVESTIGATOR CLUES &amp; HINTS</span>
                <ul className="modal-hints-list">
                  {selectedLevel.hints.map((hint, idx) => (
                    <li key={idx}>
                      <span className="hint-bullet">💡</span>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="modal-actions-row">
                {selectedLevel.questionPrompt && (
                  <button
                    className="modal-btn-ask"
                    onClick={() => {
                      setSelectedLevel(null)
                      onOpenAskQuestions(selectedLevel.questionPrompt)
                    }}
                    type="button"
                  >
                    <Icon name="search" size={14} />
                    <span>Ask AI Detective About This</span>
                  </button>
                )}

                <button
                  className="modal-btn-solve"
                  onClick={() => handleSolveChallenge(selectedLevel)}
                  disabled={solvingLevel}
                  type="button"
                >
                  {solvingLevel ? (
                    <span>VERIFYING EVIDENCE...</span>
                  ) : completedLevels.includes(selectedLevel.id) ? (
                    <span>RE-EXAMINE &amp; EARN 3 STARS ★★★</span>
                  ) : (
                    <span>START INVESTIGATION &amp; SOLVE CHALLENGE</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
