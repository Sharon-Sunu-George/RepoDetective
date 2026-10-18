import React, { useState } from "react"
import { parseGitHubUrl } from "./repoService"
import "./LandingExact.css"

interface LandingExactProps {
  onStart: (repository: string) => void
}

export function LandingExact({ onStart }: LandingExactProps) {
  const [repoInput, setRepoInput] = useState("https://github.com/vercel/ms")
  const [showRepoModal, setShowRepoModal] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)

  const handleStartInvestigation = () => {
    const parsed = parseGitHubUrl(repoInput)
    if (!parsed) {
      onStart("https://github.com/vercel/ms")
      return
    }
    onStart(parsed.fullUrl)
  }

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseGitHubUrl(repoInput)
    if (!parsed) {
      setInputError("Please enter a valid GitHub repository URL or owner/repo")
      return
    }
    setInputError(null)
    setShowRepoModal(false)
    onStart(parsed.fullUrl)
  }

  const scrollToProtocol = () => {
    const target = document.getElementById("protocol-section")
    if (target) {
      target.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="landing-exact-container">
      {/* 1. TOP HEADER */}
      <header className="landing-exact-header">
        {/* Brand Logo */}
        <div className="landing-exact-brand">
          <div className="landing-exact-avatar-box">
            <img
              src="/images/detective_avatar_trans.png"
              alt="Detective Logo"
              className="landing-exact-avatar-img"
            />
          </div>
          <div className="landing-exact-brand-text">
            <div className="landing-exact-brand-title">
              <span className="brand-repo">REPO</span>
              <span className="brand-detective">DETECTIVE</span>
            </div>
            <div className="landing-exact-brand-tagline">
              EXPLORE &middot; UNDERSTAND &middot; CONTRIBUTE
            </div>
          </div>
        </div>

        {/* Right Navigation */}
        <nav className="landing-exact-nav">
          <div className="landing-nav-group">
            <button className="landing-nav-btn nav-btn-home active" type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span>Home</span>
            </button>
            <button
              className="landing-nav-btn nav-btn-link"
              onClick={scrollToProtocol}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>How It Works</span>
            </button>
            <button
              className="landing-nav-btn nav-btn-link"
              onClick={scrollToProtocol}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>Field Notes</span>
            </button>
          </div>

          <a
            href="https://github.com/Sharon-Sunu-George/RepoDetective"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-nav-github-btn"
            aria-label="GitHub Repository"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>

          <button
            className="landing-nav-demo-btn"
            onClick={() => onStart("https://github.com/vercel/ms")}
            type="button"
          >
            <span>Open Demo</span>
            <span className="demo-arrow">&rarr;</span>
          </button>
        </nav>
      </header>

      {/* 2. MAIN HERO VIEWPORT (1024x640 Scene Composition) */}
      <div className="landing-exact-viewport">
        {/* Background Artwork Layer */}
        <div className="landing-exact-bg" />

        {/* Atmosphere Vignette & Lighting */}
        <div className="landing-ambient-lighting" />

        {/* Content Wrapper */}
        <div className="landing-hero-content-grid">
          {/* LEFT SIDE: Hero copy + CTA + Badges */}
          <div className="landing-hero-left-col">
            {/* Small outlined cyan label */}
            <div className="hero-eyebrow-pill">
              <span className="prompt-prefix">&gt;_</span> OPEN SOURCE CASE FILES
            </div>

            {/* Main Heading in bold blocky pixel font */}
            <h1 className="hero-pixel-headline">
              EVERY<br />
              REPOSITORY<br />
              HAS A <span className="headline-cyan">STORY.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="hero-supporting-copy">
              Enter a GitHub repository, let Gemma analyze it, and turn complex code
              into interactive challenges. Explore, learn, and make your first contribution
              with RepoDetective.
            </p>

            {/* START INVESTIGATION CTA BUTTON */}
            <div className="hero-cta-wrapper">
              <button
                className="hero-cta-button"
                onClick={handleStartInvestigation}
                type="button"
                id="start-investigation-cta"
              >
                <div className="cta-icon-box">
                  <img
                    src="/images/detective_avatar_trans.png"
                    alt="Detective Icon"
                    className="cta-avatar-img"
                  />
                </div>
                <span className="cta-label-text">START INVESTIGATION</span>
                <span className="cta-arrow-symbol">&rarr;</span>
              </button>
            </div>

            {/* 4 FEATURE BADGES */}
            <div className="hero-feature-badges-row">
              {/* Badge 1 */}
              <div className="feature-badge-box">
                <div className="badge-icon purple-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <div className="badge-text-lines">
                  <span>No Setup</span>
                  <span>Required</span>
                </div>
              </div>

              {/* Badge 2 */}
              <div className="feature-badge-box">
                <div className="badge-icon green-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <div className="badge-text-lines">
                  <span>Real</span>
                  <span>Open-Source Code</span>
                </div>
              </div>

              {/* Badge 3 */}
              <div className="feature-badge-box">
                <div className="badge-icon amber-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div className="badge-text-lines">
                  <span>Beginner</span>
                  <span>Friendly</span>
                </div>
              </div>

              {/* Badge 4 */}
              <div className="feature-badge-box">
                <div className="badge-icon blue-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="14" width="4" height="7" rx="1" />
                    <rect x="10" y="8" width="4" height="13" rx="1" />
                    <rect x="17" y="3" width="4" height="18" rx="1" />
                  </svg>
                </div>
                <div className="badge-text-lines">
                  <span>Guided</span>
                  <span>Learning Path</span>
                </div>
              </div>
            </div>

            {/* Subtle change repository prompt */}
            <button
              className="change-repo-hint"
              onClick={() => setShowRepoModal(true)}
              type="button"
              style={{ marginTop: "10px" }}
            >
              Target: {repoInput.replace("https://github.com/", "")} &middot; <u>Change Repo</u>
            </button>
          </div>

          {/* RIGHT SIDE: REPOSITORY TRACE VISUALIZATION */}
          <div className="landing-trace-wrapper">
            <div className="landing-trace-card">
              {/* Card Header */}
              <div className="trace-card-header">
                <div className="trace-title-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="trace-github-icon">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span className="trace-heading-label">REPOSITORY TRACE</span>
                </div>
                <div className="trace-case-id">CASE_0017</div>
              </div>

              {/* Inner Layout Diagram */}
              <div className="trace-diagram-area">
                {/* SVG Trace Lines */}
                <svg className="trace-connector-lines" viewBox="0 0 356 242" preserveAspectRatio="none">
                  {/* Cyan dotted line from README.md to bus */}
                  <path d="M 142 28 L 175 28 L 175 58 L 205 58" fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="3,3" />
                  {/* Blue dotted line from src/ to bus */}
                  <path d="M 204 46 L 204 58" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,3" />
                  {/* Purple dotted line from package.json to bus */}
                  <path d="M 142 84 L 180 84 L 180 72 L 205 72" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3,3" />
                  {/* Yellow dotted line from utils/ to bus */}
                  <path d="M 112 142 L 142 142 L 142 165 L 156 165" fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="3,3" />
                  {/* Vertical red connector from DISCOVER to insights.py */}
                  <path d="M 270 98 L 270 114" fill="none" stroke="#ff2a6d" strokeWidth="2" />
                </svg>


                {/* Left Column File Cards */}
                <div className="trace-files-column">
                  {/* README.md */}
                  <div className="trace-file-card border-teal">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="file-info-text">
                      <span className="file-name">README.md</span>
                      <span className="file-sub sub-teal">PROJECT OVERVIEW</span>
                    </div>
                  </div>

                  {/* package.json */}
                  <div className="trace-file-card border-purple">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="file-info-text">
                      <span className="file-name">package.json</span>
                      <span className="file-sub sub-purple">DEPENDENCIES</span>
                    </div>
                  </div>

                  {/* utils/ */}
                  <div className="trace-file-card border-amber">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="file-info-text">
                      <span className="file-name">utils/</span>
                      <span className="file-sub sub-amber">HELPERS</span>
                    </div>
                  </div>
                </div>

                {/* Right Area: src/ card + DISCOVER card + Code Editor */}
                <div className="trace-right-column">
                  {/* Top-Right: src/ */}
                  <div className="trace-file-card border-blue src-card">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="file-info-text">
                      <span className="file-name">src/</span>
                      <span className="file-sub sub-blue">CORE LOGIC</span>
                    </div>
                  </div>

                  {/* Mid-Right: DISCOVER Card */}
                  <div className="trace-discover-card">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff2a6d" className="discover-star">
                      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                    </svg>
                    <div className="discover-content">
                      <span className="discover-title">DISCOVER</span>
                      <span className="discover-sub">Key files, concepts<br />and contribution ideas</span>
                    </div>
                  </div>

                  {/* Bottom-Right: Code Editor */}
                  <div className="trace-code-editor">
                    <div className="code-editor-top">
                      <div className="window-dots">
                        <span className="dot red" />
                        <span className="dot yellow" />
                        <span className="dot green" />
                      </div>
                      <span className="editor-filename">insights.py</span>
                    </div>
                    <div className="code-editor-body">
                      <div className="code-row">
                        <span className="ln">01</span>
                        <span className="code-text"><span className="kw-cyan">import</span> repo_analyzer</span>
                      </div>
                      <div className="code-row">
                        <span className="ln">02</span>
                        <span className="code-text"><span className="kw-cyan">from</span> gemma <span className="kw-cyan">import</span> generate_insights</span>
                      </div>
                      <div className="code-row">
                        <span className="ln">03</span>
                        <span className="code-text comment-green"># Find the story behind the code</span>
                      </div>
                      <div className="code-row">
                        <span className="ln">04</span>
                        <span className="code-text"><span className="kw-red">def</span> <span className="fn-cyan">explain_repo</span>():</span>
                      </div>
                      <div className="code-row">
                        <span className="ln">05</span>
                        <span className="code-text">&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw-red">return</span> <span className="str-orange">&quot;Simplified insights&quot;</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. BOTTOM-CENTER SCROLL INDICATOR */}
        <div
          className="landing-scroll-indicator"
          onClick={scrollToProtocol}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && scrollToProtocol()}
        >
          <div className="scroll-mouse-icon">
            <span className="mouse-wheel-tick" />
          </div>
          <span className="scroll-label-text">SCROLL TO EXPLORE</span>
          <span className="scroll-chevron-symbol">&or;</span>
        </div>
      </div>

      {/* Target Repo Modal (Optional interactive customize) */}
      {showRepoModal && (
        <div className="repo-modal-backdrop" onClick={() => setShowRepoModal(false)}>
          <div className="repo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="repo-modal-header">
              <span>TARGET CASE REPOSITORY</span>
              <button className="modal-close-btn" onClick={() => setShowRepoModal(false)}>✕</button>
            </div>
            <form onSubmit={handleModalSubmit} className="repo-modal-form">
              <label htmlFor="modal-repo-input">Enter GitHub Repository URL or owner/name:</label>
              <input
                id="modal-repo-input"
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="https://github.com/owner/repository"
                autoFocus
              />
              {inputError && <div className="modal-error-msg">{inputError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowRepoModal(false)}>Cancel</button>
                <button type="submit" className="btn-modal-confirm">Confirm & Investigate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
