import { useState, useEffect } from "react"
import { Icon, Logo } from "./App"
import {
  fetchRepoBriefing,
  fetchGitHubTree,
  fetchFileContent,
  askQuestionAboutRepo,
  getSavedNotes,
  saveNote,
  deleteNote,
  parseGitHubUrl,
  type RepoBriefingData,
  type TreeEntry,
  type Note,
} from "./repoService"
import { PixelDetectiveSprite } from "./PixelDetectiveSprite"
import { RepositoryGameMap } from "./RepositoryGameMap"
import { DetectiveChatPage } from "./DetectiveChatPage"

interface DetectiveDashboardProps {
  initialRepo?: string
  onBackToLanding: () => void
  onOpenExplorer?: () => void
  onOpenQuestions?: () => void
}

export function DetectiveDashboard({
  initialRepo = "vercel/ms",
  onBackToLanding,
}: DetectiveDashboardProps) {
  const [currentRepo, setCurrentRepo] = useState(initialRepo)
  const [activeNav, setActiveNav] = useState<"overview" | "map" | "questions" | "explorer" | "insights" | "notes">("overview")
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined)
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false)
  const [repoInputVal, setRepoInputVal] = useState(initialRepo)
  const [repoData, setRepoData] = useState<RepoBriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTabModal, setActiveTabModal] = useState<string | null>(null)

  // Real Tree & File Explorer State
  const [treeEntries, setTreeEntries] = useState<TreeEntry[]>([])
  const [selectedFilePath, setSelectedFilePath] = useState<string>("source/index.js")
  const [fileContentText, setFileContentText] = useState<string>("")
  const [loadingFile, setLoadingFile] = useState<boolean>(false)
  const [fileSearchTerm, setFileSearchTerm] = useState<string>("")

  // Real Chat State (Ask Questions)
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "detective"; text: string; references?: string[] }>>([
    {
      role: "detective",
      text: `Detective on duty. I have reviewed ${currentRepo}. Ask me about functions, imports, setup, or architecture clues.`,
      references: ["source/index.js", "package.json"],
    },
  ])
  const [questionInput, setQuestionInput] = useState<string>("")
  const [askingAi, setAskingAi] = useState<boolean>(false)

  // Real Notes State
  const [notesList, setNotesList] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [noteEditTitle, setNoteEditTitle] = useState<string>("")
  const [noteEditContent, setNoteEditContent] = useState<string>("")
  const [savingNote, setSavingNote] = useState<boolean>(false)

  // Recent activity logs (real user actions)
  const [activities, setActivities] = useState([
    { id: "1", icon: "star", text: `Loaded ${currentRepo} case dossier`, time: "Just now" },
    { id: "2", icon: "file", text: "Scanned folder tree & manifests", time: "1m ago" },
    { id: "3", icon: "chart", text: "Generated architectural insights", time: "1m ago" },
    { id: "4", icon: "chat", text: "Investigative assistant standby", time: "Now" },
  ])

  // Key insights (dynamically generated from actual repo data)
  const [insights, setInsights] = useState([
    { id: "1", type: "success", text: "Verified primary entry points & exports" },
    { id: "2", type: "success", text: "Lightweight modular architecture" },
    { id: "3", type: "success", text: "Test coverage scripts discovered" },
    { id: "4", type: "warning", text: "Public open-source license clearance" },
  ])

  // Collapsible Tree state for sidebar/mini tree
  const [treeExpanded, setTreeExpanded] = useState<Record<string, boolean>>({
    root: true,
    src: true,
    source: true,
  })

  const toggleFolder = (key: string) => {
    setTreeExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Upload file state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  // 1. Fetch Repository Dossier & Tree when repo changes
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setLoadError(null)

    const parsed = parseGitHubUrl(currentRepo) || { owner: "vercel", repo: "ms" }

    // Fetch briefing
    fetchRepoBriefing(parsed.owner, parsed.repo)
      .then((data) => {
        if (!isMounted) return
        setRepoData(data)
        setLoading(false)

        // Generate dynamic insights
        const newInsights = [
          {
            id: "1",
            type: "success",
            text: `Primary Language: ${data.primaryLanguage || "Identified"}`,
          },
          {
            id: "2",
            type: "success",
            text: data.license ? `License: ${data.license}` : "Open Source Community Project",
          },
          {
            id: "3",
            type: "success",
            text: `Popularity: ${data.stars.toLocaleString()} Stars & ${data.forks.toLocaleString()} Forks`,
          },
          {
            id: "4",
            type: data.stars > 1000 ? "success" : "warning",
            text: data.whatItDoes.slice(0, 70) + "...",
          },
        ]
        setInsights(newInsights)
      })
      .catch((err) => {
        if (!isMounted) return
        setLoadError(err?.message || "Failed to load repository.")
        setLoading(false)
      })

    // Fetch live Tree
    fetchGitHubTree(parsed.owner, parsed.repo)
      .then((entries) => {
        if (!isMounted) return
        setTreeEntries(entries)
        // Select first meaningful file
        const firstFile = entries.find((e) => e.type === "blob" && (e.path.endsWith(".js") || e.path.endsWith(".ts") || e.path.endsWith(".json") || e.path.endsWith(".md")))
        if (firstFile) {
          setSelectedFilePath(firstFile.path)
        }
      })
      .catch(() => {
        // Fallback default entries
      })

    // Fetch notes
    getSavedNotes(currentRepo).then((notes) => {
      if (!isMounted) return
      setNotesList(notes)
      if (notes.length > 0) {
        setActiveNoteId(notes[0].id)
        setNoteEditTitle(notes[0].title)
        setNoteEditContent(notes[0].content)
      }
    })

    return () => {
      isMounted = false
    }
  }, [currentRepo])

  // 2. Fetch File Content when selected file changes
  useEffect(() => {
    let isMounted = true
    if (!selectedFilePath) return

    setLoadingFile(true)
    const parsed = parseGitHubUrl(currentRepo) || { owner: "vercel", repo: "ms" }

    fetchFileContent(parsed.owner, parsed.repo, selectedFilePath)
      .then((code) => {
        if (isMounted) {
          setFileContentText(code)
          setLoadingFile(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFileContentText(`// Error loading file contents: ${err.message}`)
          setLoadingFile(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedFilePath, currentRepo])

  const handleSelectRepo = (repoSlug: string) => {
    setCurrentRepo(repoSlug)
    setRepoInputVal(repoSlug)
    setRepoDropdownOpen(false)
    setActivities((prev) => [
      { id: Date.now().toString(), icon: "star", text: `Switched case to ${repoSlug}`, time: "Just now" },
      ...prev.slice(0, 4),
    ])
  }

  const handleCustomRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!repoInputVal.trim()) return
    const parsed = parseGitHubUrl(repoInputVal)
    if (parsed) {
      handleSelectRepo(`${parsed.owner}/${parsed.repo}`)
    } else {
      handleSelectRepo(repoInputVal.trim())
    }
  }

  // Handle Ask Question Submission
  const handleSendQuestion = async (qText?: string) => {
    const textToSend = qText || questionInput
    if (!textToSend.trim() || askingAi) return

    const userMsg = { role: "user" as const, text: textToSend.trim() }
    setChatMessages((prev) => [...prev, userMsg])
    setQuestionInput("")
    setAskingAi(true)

    setActivities((prev) => [
      { id: Date.now().toString(), icon: "chat", text: `Asked: "${textToSend.slice(0, 24)}..."`, time: "Just now" },
      ...prev.slice(0, 4),
    ])

    const parsed = parseGitHubUrl(currentRepo) || { owner: "vercel", repo: "ms" }
    try {
      const res = await askQuestionAboutRepo(parsed.owner, parsed.repo, textToSend.trim(), chatMessages)
      setChatMessages((prev) => [
        ...prev,
        {
          role: "detective",
          text: res.answer,
          references: res.references,
        },
      ])
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "detective",
          text: "I was unable to consult the evidence library at this moment. Please verify your connection or check repository files directly.",
        },
      ])
    } finally {
      setAskingAi(false)
    }
  }

  // Notes Functions
  const handleCreateNewNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      repository: currentRepo,
      title: "New Field Note",
      content: "- Observation:\n- Evidence found:\n- Next steps:",
      created_at: new Date().toLocaleDateString(),
      updated_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    const updated = [newNote, ...notesList]
    setNotesList(updated)
    setActiveNoteId(newNote.id)
    setNoteEditTitle(newNote.title)
    setNoteEditContent(newNote.content)
    saveNote(newNote)
    setActivities((prev) => [
      { id: Date.now().toString(), icon: "file", text: `Created note: "${newNote.title}"`, time: "Just now" },
      ...prev.slice(0, 4),
    ])
  }

  const handleSaveCurrentNote = async () => {
    if (!activeNoteId) return
    setSavingNote(true)
    const target = notesList.find((n) => n.id === activeNoteId)
    if (target) {
      const updatedNote: Note = {
        ...target,
        title: noteEditTitle.trim() || "Untitled Note",
        content: noteEditContent,
        updated_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      await saveNote(updatedNote)
      setNotesList((prev) => prev.map((n) => (n.id === activeNoteId ? updatedNote : n)))
      setActivities((prev) => [
        { id: Date.now().toString(), icon: "file", text: `Saved note "${updatedNote.title}"`, time: "Just now" },
        ...prev.slice(0, 4),
      ])
    }
    setSavingNote(false)
  }

  const handleDeleteCurrentNote = async () => {
    if (!activeNoteId) return
    if (!window.confirm("Are you sure you want to delete this case note?")) return
    await deleteNote(currentRepo, activeNoteId)
    const remaining = notesList.filter((n) => n.id !== activeNoteId)
    setNotesList(remaining)
    if (remaining.length > 0) {
      setActiveNoteId(remaining[0].id)
      setNoteEditTitle(remaining[0].title)
      setNoteEditContent(remaining[0].content)
    } else {
      setActiveNoteId(null)
      setNoteEditTitle("")
      setNoteEditContent("")
    }
    setActivities((prev) => [
      { id: Date.now().toString(), icon: "file", text: "Deleted note entry", time: "Just now" },
      ...prev.slice(0, 4),
    ])
  }

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".zip") && !file.name.endsWith(".json") && !file.name.endsWith(".js") && !file.name.endsWith(".ts")) {
      setUploadStatus("Only .zip, .json, .js, and .ts files are supported for local analysis.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus("File exceeds maximum allowed size (10 MB).")
      return
    }
    setUploadFile(file)
    setUploadStatus(`Uploaded ${file.name} (${(file.size / 1024).toFixed(1)} KB). Local analysis initialized.`)
    setActivities((prev) => [
      { id: Date.now().toString(), icon: "file", text: `Uploaded local file ${file.name}`, time: "Just now" },
      ...prev.slice(0, 4),
    ])
  }

  // Filtered files for explorer
  const filteredTree = treeEntries.filter((e) =>
    !fileSearchTerm ? true : e.path.toLowerCase().includes(fileSearchTerm.toLowerCase())
  )

  return (
    <div className="cyber-dash-root">
      {/* ========================================================
          TOP HEADER
          Branding, Repo Selector, Settings, Help, Profile Avatar
         ======================================================== */}
      <header className="cyber-dash-header">
        <div className="cyber-dash-brand" onClick={onBackToLanding} role="button" tabIndex={0}>
          <div className="cyber-dash-mascot">
            <img
              src="/images/repodetective_logo_trans.png"
              alt="RepoDetective Logo"
              className="cyber-robot-icon-img"
              draggable={false}
            />
          </div>
          <span className="cyber-dash-title">
            REPO<span className="cyan-glow">DETECTIVE</span>
          </span>
        </div>

        {/* Center Repository Selector Dropdown */}
        <div className="cyber-repo-selector-wrap">
          <button
            className="cyber-repo-pill"
            onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
            type="button"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="github-cat-icon">
              <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
            </svg>
            <span className="cyber-repo-name">{currentRepo}</span>
            <svg
              className={`cyber-chevron ${repoDropdownOpen ? "open" : ""}`}
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Repo dropdown menu */}
          {repoDropdownOpen && (
            <div className="cyber-repo-dropdown-menu">
              <form onSubmit={handleCustomRepoSubmit} className="cyber-repo-search-form">
                <input
                  type="text"
                  placeholder="owner/repo or GitHub URL..."
                  value={repoInputVal}
                  onChange={(e) => setRepoInputVal(e.target.value)}
                  className="cyber-repo-input"
                  autoFocus
                />
                <button type="submit" className="cyber-repo-submit-btn">
                  SWITCH
                </button>
              </form>
              <div className="cyber-repo-preset-title">RECENT CASES</div>
              <div
                className="cyber-repo-preset-item"
                onClick={() => handleSelectRepo("vercel/ms")}
              >
                <span>vercel/ms</span>
                <small>JS MICRO-UTILITY</small>
              </div>
              <div
                className="cyber-repo-preset-item"
                onClick={() => handleSelectRepo("facebook/react")}
              >
                <span>facebook/react</span>
                <small>UI LIBRARY</small>
              </div>
              <div
                className="cyber-repo-preset-item"
                onClick={() => handleSelectRepo("expressjs/express")}
              >
                <span>expressjs/express</span>
                <small>HTTP ENGINE</small>
              </div>
            </div>
          )}
        </div>

        {/* Right Header Navigation */}
        <div className="cyber-header-actions">
          <button
            className="cyber-header-btn"
            onClick={() => setActiveTabModal("settings")}
            type="button"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </button>

          <button
            className="cyber-header-btn"
            onClick={() => setActiveTabModal("help")}
            type="button"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Help</span>
          </button>

          {/* Pixel Detective Profile Avatar Matching Reference */}
          <div className="cyber-profile-badge">
            <img
              src="/images/detective_avatar_trans.png"
              alt="Detective Avatar"
              className="cyber-detective-avatar-img"
              draggable={false}
            />
          </div>
        </div>
      </header>

      {/* ========================================================
          BODY: LEFT SIDEBAR + WORKSPACE CANVAS
         ======================================================== */}
      <div className="cyber-dash-body">
        {/* Left Vertical Navigation Sidebar */}
        <aside className="cyber-dash-sidebar">
          <nav className="cyber-nav-list">
            <button
              className={`cyber-nav-item ${activeNav === "overview" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("overview")
                setActiveTabModal(null)
              }}
              type="button"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Overview</span>
            </button>

            <button
              className={`cyber-nav-item ${activeNav === "map" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("map")
                setActiveTabModal(null)
              }}
              type="button"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Repository Map</span>
            </button>

            <button
              className={`cyber-nav-item ${activeNav === "questions" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("questions")
                setActiveTabModal(null)
                setChatInitialPrompt(undefined)
              }}
              type="button"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="9" y1="10" x2="9.01" y2="10" strokeWidth="3" />
                <line x1="12" y1="10" x2="12.01" y2="10" strokeWidth="3" />
                <line x1="15" y1="10" x2="15.01" y2="10" strokeWidth="3" />
              </svg>
              <span>Ask Questions</span>
            </button>

            <button
              className={`cyber-nav-item ${activeNav === "explorer" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("explorer")
                setActiveTabModal("explorer")
              }}
              type="button"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>File Explorer</span>
            </button>

            <button
              className={`cyber-nav-item ${activeNav === "insights" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("insights")
                setActiveTabModal("insights")
              }}
              type="button"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Summary &amp; Insights</span>
            </button>

            <button
              className={`cyber-nav-item ${activeNav === "notes" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("notes")
                setActiveTabModal("notes")
              }}
              type="button"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              <span>Notes</span>
            </button>
          </nav>
        </aside>

        {/* ========================================================
            CENTRAL CANVAS
            Pixel Detective Office Scene Background + Overlay Panels,
            Interactive Candy Crush Game Map, or Dedicated AI Detective Chat
           ======================================================== */}
        {activeNav === "map" ? (
          <RepositoryGameMap
            currentRepo={currentRepo}
            repoData={repoData}
            treeEntries={treeEntries}
            onOpenAskQuestions={(prompt) => {
              setActiveNav("questions")
              setChatInitialPrompt(prompt)
            }}
          />
        ) : activeNav === "questions" ? (
          <DetectiveChatPage
            currentRepo={currentRepo}
            repoData={repoData}
            treeEntries={treeEntries}
            initialPrompt={chatInitialPrompt}
            onBackToOverview={() => setActiveNav("overview")}
          />
        ) : (
          <main className="cyber-dash-content">
            <div className="cyber-workspace-grid">
              {/* 1. TOP CENTER PANEL: REPOSITORY OVERVIEW */}
              <section className="cyber-panel cyber-repo-overview-panel">
              <div className="cyber-panel-header-title">REPOSITORY OVERVIEW</div>
              <div className="cyber-repo-overview-body">
                <div className="cyber-repo-lead-row">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" className="github-cat-large">
                    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
                  </svg>
                  <span className="cyber-repo-title-big">{currentRepo}</span>
                </div>
                {loading ? (
                  <p className="cyber-repo-desc-text" style={{ opacity: 0.7 }}>
                    Connecting to GitHub trace intel and scanning manifests...
                  </p>
                ) : loadError ? (
                  <p className="cyber-repo-desc-text" style={{ color: "#ff465a" }}>
                    {loadError}
                  </p>
                ) : (
                  <p className="cyber-repo-desc-text">
                    {repoData?.description || "Modular open-source repository loaded."}
                  </p>
                )}
                <div className="cyber-repo-chips-row">
                  <span className="cyber-chip chip-lang">
                    <span className="chip-color-dot" />
                    {repoData?.primaryLanguage || "General Code"}
                  </span>
                  <span className="cyber-chip chip-stat">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {repoData?.stars ? `${(repoData.stars / 1000).toFixed(1)}k` : "0"}
                  </span>
                  <span className="cyber-chip chip-stat">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="6" cy="5" r="2" />
                      <circle cx="18" cy="6" r="2" />
                      <circle cx="6" cy="19" r="2" />
                      <path d="M6 7v10M8 7c5 0 3 8 8 8h2M18 8v7" />
                    </svg>
                    {repoData?.forks || "0"}
                  </span>
                </div>
              </div>
            </section>

            {/* 2. TOP RIGHT PANEL: QUICK ACTIONS */}
            <section className="cyber-panel cyber-quick-actions-panel">
              <div className="cyber-panel-header-title">QUICK ACTIONS</div>
              <div className="cyber-quick-actions-list">
                <button
                  className="cyber-action-button"
                  onClick={() => {
                    setActiveNav("questions")
                    setActiveTabModal(null)
                    setChatInitialPrompt(undefined)
                  }}
                  type="button"
                >
                  <div className="cyber-action-btn-left">
                    <div className="cyber-action-icon-box">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <span>Ask Questions</span>
                  </div>
                  <span className="cyber-action-arrow">&gt;</span>
                </button>

                <button
                  className="cyber-action-button"
                  onClick={() => setActiveTabModal("upload")}
                  type="button"
                >
                  <div className="cyber-action-btn-left">
                    <div className="cyber-action-icon-box">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="12" y2="12" />
                        <line x1="15" y1="15" x2="12" y2="12" />
                      </svg>
                    </div>
                    <span>Upload &amp; Analyze</span>
                  </div>
                  <span className="cyber-action-arrow">&gt;</span>
                </button>

                <button
                  className="cyber-action-button"
                  onClick={() => {
                    const url = repoData?.url || `https://github.com/${currentRepo}`
                    window.open(url, "_blank", "noopener,noreferrer")
                  }}
                  type="button"
                >
                  <div className="cyber-action-btn-left">
                    <div className="cyber-action-icon-box">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <span>Open Repository</span>
                  </div>
                  <span className="cyber-action-arrow">&gt;</span>
                </button>
              </div>
            </section>

            {/* 3. CENTER DETECTIVE OFFICE RETRO SCENE ILLUSTRATION */}
            <div className="cyber-center-stage" aria-hidden="true">
              {/* Rain Streaks & Neon Glint over the window */}
              <div className="ambient-rain-overlay" aria-hidden="true">
                <span className="rain-drop d1" />
                <span className="rain-drop d2" />
                <span className="rain-drop d3" />
                <span className="rain-drop d4" />
                <span className="rain-drop d5" />
              </div>

              {/* Ambient Warm Desk Lamp Glow */}
              <div className="ambient-lamp-warmth" aria-hidden="true" />

              {/* Living Pixel-Art Detective Character Sprite */}
              <PixelDetectiveSprite className="stage-detective-sprite" />

              {/* CRT Interactive Screen Overlay in Center Desk Terminal */}
              <div
                className="cyber-crt-interactive-overlay"
                onClick={() => setActiveTabModal("explorer")}
                style={{ cursor: "pointer" }}
                title="Click to open File Explorer"
                role="button"
                tabIndex={0}
              >
                <div className="cyber-crt-titlebar">
                  <span className="crt-github-icon">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="#00e5ff">
                      <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
                    </svg>
                  </span>
                  <span className="crt-title-text">{currentRepo}</span>
                </div>
                <div className="cyber-crt-content-split">
                  <div className="cyber-crt-tree-preview">
                    <div className="crt-tree-line">▸ <span className="crt-folder-color">src/</span></div>
                    <div className="crt-tree-sub">📄 index.js</div>
                    <div className="crt-tree-sub">📄 license</div>
                    <div className="crt-tree-sub crt-highlight">📄 package.json<span className="crt-cursor-blink">_</span></div>
                    <div className="crt-tree-sub">📄 readme.md</div>
                  </div>
                  <div className="cyber-crt-right-viz">
                    <div className="crt-code-lines-preview">
                      <span className="c-line cl-1" />
                      <span className="c-line cl-2" />
                      <span className="c-line cl-3" />
                      <span className="c-line cl-4" />
                    </div>
                    <div className="cyber-crt-stats">
                      <span className="crt-stat-bar b1" />
                      <span className="crt-stat-bar b2" />
                      <span className="crt-stat-bar b3" />
                      <span className="crt-stat-bar b4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. BOTTOM LEFT PANEL: REPOSITORY STRUCTURE */}
            <section className="cyber-panel cyber-repo-structure-panel">
              <div className="cyber-panel-header-title">REPOSITORY STRUCTURE</div>
              <div className="cyber-tree-view">
                {/* Root Repo item */}
                <div
                  className="cyber-tree-node root-node"
                  onClick={() => toggleFolder("root")}
                >
                  <span className="cyber-tree-icon yellow-folder">📁</span>
                  <span className="cyber-tree-name">{currentRepo}</span>
                </div>

                {treeExpanded.root !== false && (
                  <div className="cyber-tree-children">
                    {/* Render top structure items from actual repository data */}
                    {repoData?.structureMap && repoData.structureMap.length > 0 ? (
                      repoData.structureMap.map((item) => (
                        <div
                          className="cyber-tree-node file-node"
                          key={item.name}
                          onClick={() => {
                            setSelectedFilePath(item.name.replace(/\/$/, ""))
                            setActiveTabModal("explorer")
                          }}
                        >
                          <span className="cyber-tree-icon blue-file">
                            {item.type === "dir" ? "📁" : "📄"}
                          </span>
                          <span className="cyber-tree-name">{item.name}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div
                          className="cyber-tree-node folder-node"
                          onClick={() => toggleFolder("source")}
                        >
                          <span className="cyber-tree-icon yellow-folder">📁</span>
                          <span className="cyber-tree-name">source/</span>
                        </div>
                        {treeExpanded.source !== false && (
                          <div className="cyber-tree-children indent">
                            <div
                              className="cyber-tree-node file-node"
                              onClick={() => {
                                setSelectedFilePath("source/index.js")
                                setActiveTabModal("explorer")
                              }}
                            >
                              <span className="cyber-tree-icon blue-file">📄</span>
                              <span className="cyber-tree-name">index.js</span>
                            </div>
                          </div>
                        )}
                        <div
                          className="cyber-tree-node file-node"
                          onClick={() => {
                            setSelectedFilePath("package.json")
                            setActiveTabModal("explorer")
                          }}
                        >
                          <span className="cyber-tree-icon blue-file">📄</span>
                          <span className="cyber-tree-name">package.json</span>
                        </div>
                        <div
                          className="cyber-tree-node file-node"
                          onClick={() => {
                            setSelectedFilePath("readme.md")
                            setActiveTabModal("explorer")
                          }}
                        >
                          <span className="cyber-tree-icon blue-file">📄</span>
                          <span className="cyber-tree-name">readme.md</span>
                        </div>
                        <div
                          className="cyber-tree-node file-node"
                          onClick={() => {
                            setSelectedFilePath("license")
                            setActiveTabModal("explorer")
                          }}
                        >
                          <span className="cyber-tree-icon blue-file">📄</span>
                          <span className="cyber-tree-name">license</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* 5. BOTTOM CENTER PANEL: KEY INSIGHTS */}
            <section className="cyber-panel cyber-key-insights-panel">
              <div className="cyber-panel-header-title">KEY INSIGHTS</div>
              <div className="cyber-insights-list">
                {insights.map((item) => (
                  <div className="cyber-insight-row" key={item.id}>
                    {item.type === "success" ? (
                      <span className="insight-badge success">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    ) : (
                      <span className="insight-badge warning">!</span>
                    )}
                    <span className="insight-text">{item.text}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. BOTTOM RIGHT PANEL: RECENT ACTIVITY */}
            <section className="cyber-panel cyber-recent-activity-panel">
              <div className="cyber-panel-header-title">RECENT ACTIVITY</div>
              <div className="cyber-activity-list">
                {activities.map((act) => (
                  <div className="cyber-activity-row" key={act.id}>
                    <div className="activity-left">
                      <span className="activity-icon">
                        {act.icon === "star" && "★"}
                        {act.icon === "file" && "🗎"}
                        {act.icon === "chart" && "📊"}
                        {act.icon === "chat" && "💬"}
                      </span>
                      <span className="activity-text">{act.text}</span>
                    </div>
                    <span className="activity-time">{act.time}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
        )}
      </div>

      {/* ========================================================
          DEDICATED FUNCTIONAL MODALS & PAGES
          Map, Ask Questions, File Explorer, Insights, Notes, Upload, Settings, Help
         ======================================================== */}
      {activeTabModal && (
        <div className="cyber-modal-overlay" onClick={() => setActiveTabModal(null)}>
          <div
            className={`cyber-modal-box ${
              ["explorer", "map", "questions", "insights", "notes"].includes(activeTabModal)
                ? "modal-large"
                : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cyber-modal-header">
              <span className="cyber-modal-title">
                {activeTabModal === "map" && "REPOSITORY MAP — ARCHITECTURE HIERARCHY"}
                {activeTabModal === "questions" && "ASK QUESTIONS — INVESTIGATIVE AGENT"}
                {activeTabModal === "explorer" && `FILE EXPLORER — ${currentRepo}`}
                {activeTabModal === "insights" && `SUMMARY & INSIGHTS — ${currentRepo}`}
                {activeTabModal === "notes" && `CASE FIELD NOTES — ${currentRepo}`}
                {activeTabModal === "upload" && "UPLOAD & ANALYZE LOCAL REPO"}
                {activeTabModal === "settings" && "SYSTEM SETTINGS"}
                {activeTabModal === "help" && "DETECTIVE FIELD MANUAL"}
              </span>
              <button
                className="cyber-modal-close"
                onClick={() => setActiveTabModal(null)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="cyber-modal-body">
              {/* 1. REPOSITORY MAP */}
              {activeTabModal === "map" && (
                <div className="modal-map-view">
                  <p style={{ margin: "0 0 14px", color: "#a4b6da" }}>
                    Visual architectural breakdown of <b>{currentRepo}</b> entry points, dependencies, and structure:
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "14px",
                    }}
                  >
                    {repoData?.structureMap.map((item) => (
                      <div
                        key={item.name}
                        style={{
                          background: "#050e24",
                          border: "1px solid #1a3264",
                          borderRadius: "4px",
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ font: "600 13px var(--mono)", color: "#00e5ff" }}>
                            {item.type === "dir" ? "📁 " : "📄 "}
                            {item.name}
                          </span>
                          <span
                            style={{
                              font: "7px var(--pixel)",
                              padding: "2px 6px",
                              background: "#091738",
                              border: "1px solid #00e5ff",
                              color: "#00e5ff",
                            }}
                          >
                            {item.role}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#b8cbe8", lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                        {item.glossaryTerm && (
                          <div
                            style={{
                              marginTop: "4px",
                              paddingTop: "6px",
                              borderTop: "1px dashed #142852",
                              fontSize: "11px",
                              color: "#7d91b8",
                            }}
                          >
                            <b style={{ color: "#ffd875" }}>{item.glossaryTerm.term}:</b> {item.glossaryTerm.meaning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. ASK QUESTIONS */}
              {activeTabModal === "questions" && (
                <div className="modal-questions-content">
                  <div className="cyber-chat-log">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`chat-bubble ${msg.role}`}>
                        <span className="chat-bubble-author">
                          {msg.role === "user" ? "YOU (INVESTIGATOR)" : "DETECTIVE AI"}
                        </span>
                        <div>{msg.text}</div>
                        {msg.references && msg.references.length > 0 && (
                          <div className="chat-ref-tags">
                            {msg.references.map((ref) => (
                              <span key={ref} className="chat-ref-tag">
                                📄 {ref}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {askingAi && (
                      <div className="chat-bubble detective">
                        <span className="chat-bubble-author">DETECTIVE AI</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#00e5ff" }}>
                          <span>Investigating files and analyzing clues</span>
                          <span className="crt-cursor-blink">...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="modal-suggested-prompts">
                    <button
                      className="suggested-prompt-chip"
                      onClick={() => handleSendQuestion("What is the primary entry point and main function?")}
                      type="button"
                    >
                      "What is the primary entry point and main function?"
                    </button>
                    <button
                      className="suggested-prompt-chip"
                      onClick={() => handleSendQuestion("How does duration conversion parsing work?")}
                      type="button"
                    >
                      "How does duration conversion parsing work?"
                    </button>
                    <button
                      className="suggested-prompt-chip"
                      onClick={() => handleSendQuestion("What dependencies or test suites are included in package.json?")}
                      type="button"
                    >
                      "What dependencies or test suites are included in package.json?"
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSendQuestion()
                    }}
                    className="modal-input-row"
                  >
                    <input
                      type="text"
                      placeholder="Type your question for the detective..."
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      className="cyber-modal-input"
                      disabled={askingAi}
                    />
                    <button
                      className="cyber-modal-send-btn"
                      type="submit"
                      disabled={askingAi || !questionInput.trim()}
                    >
                      SEND
                    </button>
                  </form>
                </div>
              )}

              {/* 3. FILE EXPLORER */}
              {activeTabModal === "explorer" && (
                <div className="cyber-explorer-split">
                  <div className="cyber-explorer-sidebar">
                    <input
                      type="text"
                      placeholder="Search files in repository..."
                      value={fileSearchTerm}
                      onChange={(e) => setFileSearchTerm(e.target.value)}
                      className="cyber-explorer-search"
                    />
                    <div className="cyber-explorer-tree">
                      {filteredTree.length > 0 ? (
                        filteredTree.map((item) => (
                          <div
                            key={item.path}
                            className={`explorer-tree-row ${selectedFilePath === item.path ? "active" : ""}`}
                            onClick={() => {
                              if (item.type === "blob") {
                                setSelectedFilePath(item.path)
                              }
                            }}
                          >
                            <span>{item.type === "tree" ? "📁" : "📄"}</span>
                            <span>{item.path}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "12px", color: "#6a7da2", fontSize: "11px" }}>
                          No files found matching search.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="cyber-code-viewer">
                    <div className="cyber-code-header">
                      <span>📄 {selectedFilePath}</span>
                      <span>
                        {loadingFile ? "Loading..." : `${fileContentText.split("\n").length} lines`}
                      </span>
                    </div>
                    {loadingFile ? (
                      <div style={{ padding: "30px", color: "#00e5ff", font: "12px var(--mono)" }}>
                        Retrieving file source...
                      </div>
                    ) : (
                      <pre className="cyber-code-content">{fileContentText}</pre>
                    )}
                  </div>
                </div>
              )}

              {/* 4. SUMMARY & INSIGHTS */}
              {activeTabModal === "insights" && (
                <div className="modal-insights-full">
                  <div style={{ marginBottom: "16px", padding: "14px", background: "#050f26", border: "1px solid #1a356a", borderRadius: "4px" }}>
                    <h4 style={{ margin: "0 0 8px", font: "8px var(--pixel)", color: "#00e5ff" }}>PROJECT PURPOSE</h4>
                    <p style={{ margin: 0, fontSize: "13.5px", color: "#dbe7fa", lineHeight: 1.5 }}>
                      {repoData?.whatItDoes}
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                    <div style={{ padding: "14px", background: "#050f26", border: "1px solid #1a356a", borderRadius: "4px" }}>
                      <h4 style={{ margin: "0 0 8px", font: "8px var(--pixel)", color: "#ffd875" }}>PROBLEM SOLVED</h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#b8cbe8", lineHeight: 1.5 }}>
                        {repoData?.problemSolved}
                      </p>
                    </div>

                    <div style={{ padding: "14px", background: "#050f26", border: "1px solid #1a356a", borderRadius: "4px" }}>
                      <h4 style={{ margin: "0 0 8px", font: "8px var(--pixel)", color: "#00e676" }}>TARGET AUDIENCE</h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#b8cbe8", lineHeight: 1.5 }}>
                        {repoData?.targetAudience}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: "14px", background: "#050f26", border: "1px solid #1a356a", borderRadius: "4px" }}>
                    <h4 style={{ margin: "0 0 8px", font: "8px var(--pixel)", color: "#00e5ff" }}>ARCHITECTURAL OVERVIEW</h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "#b8cbe8", lineHeight: 1.5 }}>
                      {repoData?.repositoryOverview}
                    </p>
                  </div>
                </div>
              )}

              {/* 5. NOTES */}
              {activeTabModal === "notes" && (
                <div className="cyber-notes-manager">
                  <div className="cyber-notes-sidebar">
                    <button className="cyber-new-note-btn" onClick={handleCreateNewNote} type="button">
                      + NEW CASE NOTE
                    </button>
                    <div className="notes-list">
                      {notesList.map((note) => (
                        <div
                          key={note.id}
                          className={`note-tab-item ${activeNoteId === note.id ? "active" : ""}`}
                          onClick={() => {
                            setActiveNoteId(note.id)
                            setNoteEditTitle(note.title)
                            setNoteEditContent(note.content)
                          }}
                        >
                          <span className="note-tab-title">{note.title || "Untitled"}</span>
                          <span className="note-tab-time">{note.updated_at}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="cyber-note-editor">
                    {activeNoteId ? (
                      <>
                        <input
                          type="text"
                          value={noteEditTitle}
                          onChange={(e) => setNoteEditTitle(e.target.value)}
                          placeholder="Note Title..."
                          className="note-title-input"
                        />
                        <textarea
                          className="cyber-notes-textarea"
                          value={noteEditContent}
                          onChange={(e) => setNoteEditContent(e.target.value)}
                          rows={12}
                          placeholder="Write case observations, code snippets, or ideas here..."
                        />
                        <div className="note-editor-actions">
                          <button
                            className="btn-cyber-danger"
                            onClick={handleDeleteCurrentNote}
                            type="button"
                          >
                            DELETE NOTE
                          </button>
                          <button
                            className="btn-cyber-primary"
                            onClick={handleSaveCurrentNote}
                            type="button"
                            disabled={savingNote}
                          >
                            {savingNote ? "SAVING..." : "SAVE NOTE"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: "40px 20px", textAlign: "center", color: "#6a7da2" }}>
                        Select a note from the left or create a new note.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. UPLOAD & ANALYZE */}
              {activeTabModal === "upload" && (
                <div className="modal-upload-content">
                  <p>Upload a local repository file (.zip, .json, .js, .ts) for client &amp; backend investigation:</p>
                  <label className="cyber-dropzone">
                    <span className="dropzone-icon">📁</span>
                    <span>DRAG ZIP HERE OR CLICK TO BROWSE</span>
                    <input
                      type="file"
                      accept=".zip,.json,.js,.ts"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                  {uploadStatus && (
                    <div style={{ marginTop: "14px", padding: "10px", background: "#050e24", border: "1px solid #00e5ff", borderRadius: "3px", font: "12px var(--mono)", color: "#00e5ff" }}>
                      {uploadStatus}
                    </div>
                  )}
                </div>
              )}

              {/* 7. SETTINGS */}
              {activeTabModal === "settings" && (
                <div className="modal-settings-content">
                  <div className="setting-row">
                    <span>AESTHETIC THEME</span>
                    <b className="cyan-text">CYBER DETECTIVE 16-BIT (ACTIVE)</b>
                  </div>
                  <div className="setting-row">
                    <span>ANIMATIONS</span>
                    <b>IDLE SPRITE + AMBIENT RAIN (ENABLED)</b>
                  </div>
                  <div className="setting-row">
                    <span>BACKEND API ENDPOINT</span>
                    <code>http://localhost:8000/api/repositories</code>
                  </div>
                  <div className="setting-row">
                    <span>AI REASONING PROVIDER</span>
                    <b className="cyan-text">GEMMA 3 / LOCAL DETECTIVE INFERENCE</b>
                  </div>
                </div>
              )}

              {/* 8. HELP */}
              {activeTabModal === "help" && (
                <div className="modal-help-content">
                  <p>
                    <b>RepoDetective Field Manual:</b>
                  </p>
                  <ul style={{ paddingLeft: "18px", lineHeight: "1.7" }}>
                    <li><b>Overview:</b> Real-time statistics, description, and primary language directly from GitHub.</li>
                    <li><b>Repository Map:</b> Folder hierarchy with identified roles (Entry Point, Manifest, Test Suite).</li>
                    <li><b>Ask Questions:</b> AI detective answering architectural questions with file citations.</li>
                    <li><b>File Explorer:</b> Browse files, expand directories, and inspect syntax-highlighted source code.</li>
                    <li><b>Summary &amp; Insights:</b> Structured breakdown of project purpose, problems solved, and tech stack.</li>
                    <li><b>Notes:</b> Create, edit, and persist case notes associated with each repository.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
