import { useState, type ReactNode } from "react"
import { parseGitHubUrl } from "./repoService"
import { CaseBriefing } from "./CaseBriefing"
import { DetectiveOfficeIntro } from "./DetectiveOfficeIntro"

export type IconName = "arrow" | "branch" | "check" | "chevron" | "file" | "folder" | "github" | "map" | "search" | "spark" | "terminal"

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    branch: (
      <>
        <circle cx="6" cy="5" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="19" r="2" />
        <path d="M6 7v10M8 7c5 0 3 8 8 8h2M18 8v7" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    file: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h4" />
      </>
    ),
    folder: <path d="M3 6h7l2 2h9v11H3z" />,
    github: (
      <path d="M12 2.8a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.9c-2.7.6-3.3-1.1-3.3-1.1-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 0 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.4-1.1.6-1.3-2.2-.2-4.5-1.1-4.5-4.7 0-1 .4-1.9 1-2.6-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.6 0 3.7-2.2 4.5-4.5 4.7.4.3.7.9.7 1.8v2.7c0 .4.2.6.7.5A9.5 9.5 0 0 0 12 2.8Z" />
    ),
    map: (
      <>
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="8" r="2" />
        <circle cx="9" cy="18" r="2" />
        <path d="m8 6 8 2M17 10l-7 6M7 8l2 8" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    spark: (
      <path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />
    ),
    terminal: (
      <>
        <path d="m5 8 4 4-4 4M11 16h8" />
        <rect x="2.5" y="4" width="19" height="16" rx="1" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  )
}

export function Button({
  children,
  className = "",
  onClick,
  type = "button",
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  type?: "button" | "submit"
}) {
  return (
    <button className={`button ${className}`} onClick={onClick} type={type}>
      {children}
    </button>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`logo ${compact ? "logo--compact" : ""}`}>
      <span className="logo-mark">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span>
        REPO<span className="logo-accent">DETECTIVE</span>
      </span>
    </div>
  )
}

const detectiveMap = [
  ".......hhhhhhh........",
  "......hHHHHHHHH.......",
  "......HHHHHHHHH.......",
  "......BBBBBBBBB.......",
  "...HHHHHHHHHHHHHHH....",
  ".......SSSSSSSs.......",
  "......SESSSSSSs.......",
  "......SSSSSSSss.......",
  ".......SSSSSss........",
  "........sssss.........",
  ".....CCLLLLLLCCC......",
  "....CCCCLLLLCCCCC.....",
  "....CCCCCLLCCCCCCC....",
  "....CCCCCCCCCCCCCc....",
  "....CCCCCGCCCCCCCc....",
  "....CCCCCCCCCCCCCc....",
  "....CCCCCGCCCCCCCc....",
  "....KKKKKKKKKKKKKK....",
  "....CCCCCCCCCCCCCc....",
  "...CCCCCCGCCCCCCCcc...",
  "...CCCCCCCCCCCCCCcc...",
  "..CCCCCCCCCCCCCCCCcc..",
  "..cccccccccccccccccc..",
  ".....DD.......DD......",
  ".....DD.......DD......",
  "....DDD......DDD......",
]
const detectiveColors: Record<string, string> = {
  h: "#6b55c4",
  H: "#3b2f7a",
  B: "#FF465A",
  S: "#e6b393",
  s: "#b98068",
  E: "#080D20",
  C: "#2c3f78",
  c: "#1b2752",
  L: "#9477FF",
  G: "#39D9F2",
  K: "#101a38",
  D: "#0c1330",
  A: "#33478a",
}

export function Detective({ className = "" }: { className?: string }) {
  const pixels: ReactNode[] = []
  detectiveMap.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== ".")
        pixels.push(
          <rect
            key={`${x}-${y}`}
            x={x * 4}
            y={y * 4}
            width={4.2}
            height={4.2}
            fill={detectiveColors[ch]}
          />,
        )
    }),
  )
  return (
    <svg
      className={`detective ${className}`}
      viewBox="-34 -4 126 112"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Pixel detective inspecting code with a magnifying glass"
    >
      {pixels}
      {/* arm reaching toward the lens */}
      <rect x={-2} y={44} width={22} height={8} fill="#33478a" />
      <rect x={-6} y={44} width={6} height={6} fill="#e6b393" />
      {/* handle */}
      <rect x={-10} y={40} width={5} height={5} fill="#9477FF" />
      {/* sight beam toward the discovery */}
      <polygon points="-29,30 -34,22 -34,38" fill="url(#beam)" />
      <defs>
        <linearGradient id="beam" x1="1" x2="0">
          <stop offset="0" stopColor="#39D9F2" stopOpacity=".55" />
          <stop offset="1" stopColor="#39D9F2" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* lens */}
      <circle cx={-18} cy={30} r={11} fill="rgba(57,217,242,.16)" />
      <circle
        cx={-18}
        cy={30}
        r={11}
        fill="none"
        stroke="#39D9F2"
        strokeWidth={4}
        className="detective-lens"
      />
      <rect x={-22} y={24} width={3} height={3} fill="#F2F3FA" opacity={0.8} />
    </svg>
  )
}

function RepositoryScene() {
  return (
    <div
      className="repo-scene"
      aria-label="Repository map showing source files connected to a highlighted entry point"
    >
      <div className="scene-grid" />
      <div className="scene-header">
        <span>
          <i /> REPOSITORY TRACE
        </span>
        <small>CASE_0042</small>
      </div>
      <div className="scene-stage">
        <svg
          className="scene-connections"
          viewBox="0 0 440 320"
          aria-hidden="true"
        >
          <path className="path-cyan" d="M142 46 H200" />
          <path className="path-cyan" d="M264 70 C264 104 320 98 320 130" />
          <path className="path-violet" d="M142 156 H248" />
          <path className="path-violet" d="M142 266 H186" />
          <path className="path-red" d="M318 222 V182" />
        </svg>
        <div className="scene-node node-source">
          <Icon name="file" size={16} />
          <div>
            <b>source/index.js</b>
            <small>ENTRY FILE</small>
          </div>
        </div>
        <div className="scene-node node-import">
          <Icon name="file" size={16} />
          <div>
            <b>pretty-ms</b>
            <small>IMPORT</small>
          </div>
        </div>
        <div className="scene-node node-package">
          <Icon name="file" size={16} />
          <div>
            <b>package.json</b>
            <small>MANIFEST</small>
          </div>
        </div>
        <div className="scene-node node-test">
          <Icon name="file" size={16} />
          <div>
            <b>test/index.js</b>
            <small>TESTS</small>
          </div>
        </div>
        <div className="scene-discovery">
          <span className="discovery-pulse" />
          <Icon name="spark" size={18} />
          <div>
            <small>DISCOVERY</small>
            <b>export default ms()</b>
          </div>
        </div>
        <div className="scene-code-card">
          <div className="code-card-bar">
            <span />
            <span />
            <span />
            <b>index.js</b>
          </div>
          <code>
            <i>01</i> import prettyMilliseconds
            <br />
            <i>02</i> import parseMilliseconds
            <br />
            <span className="code-hit">
              <i>09</i> <em>export default function</em> <strong>ms</strong>()
            </span>
          </code>
        </div>
      </div>
      <Detective className="scene-detective" />
      <div className="scene-caption">
        <span>FOLLOW THE IMPORTS</span>
        <b>01 / 03</b>
      </div>
    </div>
  )
}

const steps = [
  {
    number: "01",
    title: "Explore the repository.",
    text: "Open real files, spot entry points, and learn the lay of the land without getting lost in the README.",
    icon: "folder" as IconName,
  },
  {
    number: "02",
    title: "Trace how code connects.",
    text: "Follow imports and data flow through an interactive map built from the relationships in the code.",
    icon: "map" as IconName,
  },
  {
    number: "03",
    title: "Prepare to contribute.",
    text: "Complete guided missions that build the context and confidence for a thoughtful first change.",
    icon: "branch" as IconName,
  },
]

function Landing({ onStart }: { onStart: (repository: string) => void }) {
  const [repo, setRepo] = useState("https://github.com/vercel/ms")
  const [inputError, setInputError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = parseGitHubUrl(repo)
    if (!parsed) {
      setInputError("PLEASE ENTER A VALID GITHUB URL (e.g. https://github.com/owner/repository or owner/repository)")
      return
    }
    setInputError(null)
    onStart(parsed.fullUrl)
  }

  return (
    <main className="landing">
      <nav className="nav shell">
        <Logo compact />
        <div className="nav-links">
          <span>HOW IT WORKS</span>
          <span>FIELD NOTES</span>
          <Button className="button--quiet" onClick={() => onStart(repo)}>
            <Icon name="github" /> OPEN DEMO
          </Button>
        </div>
      </nav>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> CASE FILES FOR CURIOUS CODERS
          </div>
          <div className="hero-title">
            EVERY CODEBASE
            <br />
            HAS A <em>STORY.</em>
          </div>
          <p className="hero-description">
            Investigate real GitHub repositories. Follow the clues, understand
            how code connects, and get ready to make your first contribution.
          </p>
          <form className="repo-form" onSubmit={handleSubmit}>
            <label className="repo-label" htmlFor="repository">
              START WITH A GITHUB REPOSITORY
            </label>
            <div className={`repo-input-wrap ${inputError ? "has-error" : ""}`}>
              <Icon name="github" size={20} />
              <input
                aria-describedby={inputError ? "repo-error-pill" : "prototype-note"}
                id="repository"
                onChange={(event) => {
                  setRepo(event.target.value)
                  if (inputError) setInputError(null)
                }}
                placeholder="https://github.com/owner/repository"
                value={repo}
              />
              <Button className="button--primary" type="submit">
                START INVESTIGATION <Icon name="arrow" />
              </Button>
            </div>
            {inputError && (
              <div className="repo-error-pill" id="repo-error-pill" role="alert">
                <span className="status-dot error-dot" />
                <span>{inputError}</span>
              </div>
            )}
          </form>
          <div className="prototype-note" id="prototype-note" role="status">
            <Icon name="spark" size={14} />
            <span>
              <b>PROTOTYPE PREVIEW</b> Opens a guided sample case. Live
              repository analysis is coming soon.
            </span>
          </div>
          <div className="trust-line">
            <span>NO SETUP REQUIRED</span>
            <span>REAL OPEN-SOURCE CODE</span>
            <span>BEGINNER FRIENDLY</span>
          </div>
        </div>
        <div className="hero-art">
          <RepositoryScene />
        </div>
      </section>

      <section className="steps-section shell">
        <div className="section-heading">
          <div>
            <div className="eyebrow">YOUR INVESTIGATION PROTOCOL</div>
            <div className="section-title">
              FROM OUTSIDER TO
              <br />
              <span>INSIDER.</span>
            </div>
          </div>
          <p>Three deliberate moves. One codebase that finally makes sense.</p>
        </div>
        <div className="steps">
          {steps.map((step, index) => (
            <article className="step" key={step.number}>
              <div className="step-top">
                <span className="step-number">{step.number}</span>
                <span className="step-icon">
                  <Icon name={step.icon} size={22} />
                </span>
              </div>
              <div className="step-title">{step.title}</div>
              <p>{step.text}</p>
              <div className="step-track">
                <span style={{ width: `${(index + 1) * 33.33}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>
      <footer className="landing-footer shell">
        <Logo compact />
        <span>INVESTIGATE. UNDERSTAND. CONTRIBUTE.</span>
        <span>EST. 2025 / OPEN SOURCE</span>
      </footer>
    </main>
  )
}

const codeLines = [
  <>
    <b>import</b> prettyMilliseconds <b>from</b> <i>'pretty-ms'</i>;
  </>,
  <>
    <b>import</b> parseMilliseconds <b>from</b> <i>'parse-ms'</i>;
  </>,
  <></>,
  <>
    <b>const</b> second = <strong>1000</strong>;
  </>,
  <>
    <b>const</b> minute = second * <strong>60</strong>;
  </>,
  <>
    <b>const</b> hour = minute * <strong>60</strong>;
  </>,
  <>
    <b>const</b> day = hour * <strong>24</strong>;
  </>,
  <></>,
  <>
    <b>export default function</b> <u>ms</u>(value, options = {"{}"}) {"{"}
  </>,
  <>
    {" "}
    <b>if</b> (<b>typeof</b> value === <i>'string'</i>) {"{"}
  </>,
  <>
    {" "}
    <b>return</b> parseMilliseconds(value);
  </>,
  <> {"}"}</>,
  <></>,
  <>
    {" "}
    <b>return</b> prettyMilliseconds(value, {"{"}
  </>,
  <>
    {" "}
    compact: <strong>true</strong>,
  </>,
  <> ...options,</>,
  <> {"}"});</>,
  <>{"}"}</>,
]

function TreeItem({
  name,
  active,
  depth = 0,
  folder = false,
}: {
  name: string
  active?: boolean
  depth?: number
  folder?: boolean
}) {
  return (
    <div
      className={`tree-item ${active ? "active" : ""}`}
      style={{ paddingLeft: `${12 + depth * 15}px` }}
    >
      {folder && <Icon name="chevron" size={12} />}
      <Icon name={folder ? "folder" : "file"} size={14} />
      <span>{name}</span>
    </div>
  )
}

function Workspace({
  onExit,
  requestedRepository,
}: {
  onExit: () => void
  requestedRepository: string
}) {
  const [tab, setTab] = useState<"code" | "map">("code")
  const [answer, setAnswer] = useState<string | null>(null)
  return (
    <main className="workspace">
      <header className="work-header">
        <div className="work-brand" onClick={onExit}>
          <Logo compact />
        </div>
        <div className="case-title">
          <span>DEMO_CASE_0042</span>
          <b>vercel / ms</b>
          <i>PUBLIC</i>
        </div>
        <div className="work-meta">
          <span>
            <i className="live-dot" /> SAMPLE CASE
          </span>
          <span>
            XP <b>240</b>
          </span>
          <div className="avatar">RD</div>
        </div>
      </header>
      <div className="prototype-banner">
        PROTOTYPE MODE{" "}
        <span>
          Requested: {requestedRepository || "a GitHub repository"}. You&apos;re
          exploring a preloaded sample case.
        </span>
      </div>
      <div className="work-body">
        <aside className="file-panel panel">
          <div className="panel-title">
            <span>
              <Icon name="folder" size={15} /> REPOSITORY
            </span>
            <small>14 FILES</small>
          </div>
          <div className="branch-select">
            <Icon name="branch" size={14} /> main{" "}
            <Icon name="chevron" size={12} />
          </div>
          <div className="file-tree">
            <TreeItem folder name=".github" />
            <TreeItem folder name="test" />
            <TreeItem folder name="source" />
            <TreeItem depth={1} active name="index.js" />
            <TreeItem depth={1} name="index.d.ts" />
            <TreeItem name=".editorconfig" />
            <TreeItem name="license" />
            <TreeItem name="package.json" />
            <TreeItem name="readme.md" />
          </div>
          <div className="intel">
            <div className="intel-label">
              <Icon name="spark" size={14} /> REPO INTEL
            </div>
            <div>
              <span>LANGUAGE</span>
              <b>
                <i /> JavaScript
              </b>
            </div>
            <div>
              <span>SIZE</span>
              <b>19.2 KB</b>
            </div>
            <div>
              <span>DIFFICULTY</span>
              <b className="cyan">BEGINNER</b>
            </div>
          </div>
        </aside>

        <section className="source-panel panel">
          <div className="source-tabs">
            <Button
              className={tab === "code" ? "tab active" : "tab"}
              onClick={() => setTab("code")}
            >
              <Icon name="terminal" size={14} /> SOURCE CODE
            </Button>
            <Button
              className={tab === "map" ? "tab active" : "tab"}
              onClick={() => setTab("map")}
            >
              <Icon name="map" size={14} /> CONNECTION MAP
            </Button>
            <div className="source-actions">
              <Icon name="search" size={16} />
              <span>⌘ K</span>
            </div>
          </div>
          {tab === "code" ? (
            <>
              <div className="breadcrumb">
                <span>source</span>
                <i>/</i>
                <b>index.js</b>
                <small>18 LINES</small>
              </div>
              <div className="code-view">
                {codeLines.map((line, index) => (
                  <div
                    className={
                      index === 8 ? "code-line highlighted" : "code-line"
                    }
                    key={index}
                  >
                    <span className="line-no">{index + 1}</span>
                    <code>{line}</code>
                  </div>
                ))}
                <div className="code-pin">
                  <span>!</span> MISSION CLUE
                </div>
              </div>
              <div className="code-status">
                <span>UTF-8</span>
                <span>JavaScript</span>
                <span>Ln 9, Col 1</span>
              </div>
            </>
          ) : (
            <div className="map-view">
              <div className="map-grid" />
              <svg viewBox="0 0 700 420" preserveAspectRatio="none">
                <path d="M155 95 C260 95 250 205 350 205 S445 315 555 315" />
                <path d="M155 315 C260 315 250 205 350 205 S445 95 555 95" />
              </svg>
              <div className="map-node node-a">
                <Icon name="file" />
                <b>index.js</b>
                <small>ENTRY</small>
              </div>
              <div className="map-node node-b">
                <Icon name="file" />
                <b>pretty-ms</b>
                <small>IMPORT</small>
              </div>
              <div className="map-node node-c">
                <Icon name="file" />
                <b>parse-ms</b>
                <small>IMPORT</small>
              </div>
              <div className="map-node node-d">
                <Icon name="file" />
                <b>index.test.js</b>
                <small>TESTS</small>
              </div>
              <div className="map-node node-center">
                <Icon name="spark" />
                <b>ms()</b>
                <small>CORE FUNCTION</small>
              </div>
            </div>
          )}
        </section>

        <aside className="mission-panel panel">
          <div className="mission-head">
            <div className="mission-kicker">
              ACTIVE MISSION <span>02 / 05</span>
            </div>
            <div className="mission-title">
              FIND THE
              <br />
              <span>ENTRY POINT</span>
            </div>
            <div className="mission-progress">
              <i>
                <b />
              </i>
              <span>40%</span>
            </div>
          </div>
          <div className="mission-body">
            <div className="objective-label">OBJECTIVE</div>
            <p>
              Which exported function acts as the main entry point of this
              package?
            </p>
            <div className="hint">
              <Detective className="hint-detective" />
              <span>
                <Icon name="spark" size={15} /> FIELD HINT
              </span>
              Look for the <code>export default</code> keyword in the active
              file.
            </div>
            <div className="answers">
              {["parseMilliseconds()", "ms()", "prettyMilliseconds()"].map(
                (item, index) => (
                  <Button
                    className={`answer ${
                      answer === item ? (index === 1 ? "correct" : "wrong") : ""
                    }`}
                    key={item}
                    onClick={() => setAnswer(item)}
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    {item}
                    {answer === item && (
                      <Icon name={index === 1 ? "check" : "search"} size={15} />
                    )}
                  </Button>
                ),
              )}
            </div>
            {answer && (
              <div
                className={answer === "ms()" ? "feedback success" : "feedback"}
              >
                <b>
                  {answer === "ms()"
                    ? "CLUE CONFIRMED +60 XP"
                    : "NOT QUITE — TRACE AGAIN"}
                </b>
                <span>
                  {answer === "ms()"
                    ? "ms() is exported as the package default on line 9."
                    : "Check the function declaration highlighted in the source."}
                </span>
              </div>
            )}
          </div>
          <div className="mission-footer">
            <span>CASE PROGRESS</span>
            <div className="pips">
              <i className="done" />
              <i className="done" />
              <i />
              <i />
              <i />
            </div>
            <b>2 / 5</b>
          </div>
        </aside>
      </div>
    </main>
  )
}

type Screen = "landing" | "intro" | "briefing" | "workspace"

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing")
  const [requestedRepository, setRequestedRepository] = useState("https://github.com/vercel/ms")
  const [parsedRepo, setParsedRepo] = useState<{ owner: string; repo: string }>({
    owner: "vercel",
    repo: "ms",
  })

  const startInvestigation = (repository: string) => {
    const parsed = parseGitHubUrl(repository)
    if (parsed) {
      setRequestedRepository(parsed.fullUrl)
      setParsedRepo({ owner: parsed.owner, repo: parsed.repo })
      setScreen("intro")
    }
  }

  const handleBackToHq = () => {
    setScreen("landing")
  }

  const handleEnterDashboard = (repoUrl: string) => {
    setRequestedRepository(repoUrl)
    setScreen("workspace")
  }

  if (screen === "workspace" || screen === "intro" || screen === "briefing") {
    return (
      <Workspace
        onExit={() => setScreen("landing")}
        requestedRepository={requestedRepository}
      />
    )
  }

  return <Landing onStart={startInvestigation} />
}
