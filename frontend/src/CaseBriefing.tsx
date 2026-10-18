import { useState, useEffect } from "react"
import { Icon, Button, Logo, Detective } from "./App"
import { fetchRepoBriefing, type RepoBriefingData, type StructureItem } from "./repoService"

interface CaseBriefingProps {
  owner: string
  repo: string
  onBack: () => void
  onBeginLearning: () => void
}

export function CaseBriefing({ owner, repo, onBack, onBeginLearning }: CaseBriefingProps) {
  const [data, setData] = useState<RepoBriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<{
    name: string
    term: string
    meaning: string
  } | null>(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    fetchRepoBriefing(owner, repo)
      .then((res) => {
        if (isMounted) {
          setData(res)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || "Failed to load case briefing")
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [owner, repo])

  return (
    <main className="briefing-page">
      <nav className="briefing-nav shell">
        <div className="briefing-nav-left">
          <button className="logo-btn" onClick={onBack} type="button">
            <Logo compact />
          </button>
          <div className="briefing-breadcrumb">
            <span>HQ</span>
            <span className="crumb-divider">/</span>
            <span className="crumb-active">CASE DOSSIER</span>
          </div>
        </div>
        <Button className="button--quiet briefing-back-btn" onClick={onBack}>
          <Icon name="arrow" /> RETURN TO HQ
        </Button>
      </nav>

      <div className="briefing-container shell">
        {loading && (
          <section className="briefing-status-panel">
            <div className="scanner-badge">
              <span className="status-dot" /> RETRIEVING REPO DOSSIER
            </div>
            <h1 className="scanner-title">SCANNING TARGET REPOSITORY...</h1>
            <p className="scanner-sub">
              Decrypting file tree, license clearances, entry points, and mission intel for{" "}
              <b>
                {owner}/{repo}
              </b>
            </p>
            <div className="scanner-bar">
              <div className="scanner-bar-fill" />
            </div>
            <div className="scanner-clues">
              <span>SCANNING COMMITS</span>
              <span>PARSING MANIFESTS</span>
              <span>INDEXING ENTRY POINTS</span>
            </div>
          </section>
        )}

        {error && (
          <section className="briefing-status-panel briefing-error">
            <span className="error-stamp">CASE FILE ACCESS ERROR</span>
            <h1 className="error-title">INVESTIGATION STALLED</h1>
            <p className="error-description">{error}</p>
            <div className="error-actions">
              <Button className="button--secondary" onClick={onBack}>
                TRY ANOTHER REPOSITORY
              </Button>
              <Button
                className="button--primary"
                onClick={() => {
                  setLoading(true)
                  setError(null)
                  fetchRepoBriefing(owner, repo)
                    .then(setData)
                    .catch((e) => setError(e?.message || "Failed to load"))
                    .finally(() => setLoading(false))
                }}
              >
                RE-SCAN CASE
              </Button>
            </div>
          </section>
        )}

        {!loading && !error && data && (
          <>
            {/* Identity Card */}
            <article className="case-identity-card">
              <div className="case-identity-top">
                <div className="case-file-badge">
                  <span className="case-number">CASE_FILE_0042</span>
                  <span className={`source-tag ${data.isSample ? "sample" : "live"}`}>
                    {data.isSample ? "PRELOADED SAMPLE CASE" : "LIVE GITHUB INTEL"}
                  </span>
                </div>
                <div className="case-status-indicator">
                  <span className="status-dot" /> DOSSIER VERIFIED
                </div>
              </div>

              <div className="case-title-row">
                <h1 className="case-repo-title">
                  <span className="repo-owner">{data.owner}</span>
                  <span className="repo-slash">/</span>
                  <span className="repo-name">{data.repo}</span>
                </h1>
                <a
                  className="github-link-btn"
                  href={data.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Icon name="github" size={16} /> VIEW ON GITHUB
                </a>
              </div>

              <div className="case-description-box">
                <div className="box-label">FIELD BRIEFING SUMMARY</div>
                <p className="case-description-text">
                  {data.description || "No public description was provided for this repository."}
                </p>
              </div>

              <div className="case-metadata-row">
                <div className="meta-item">
                  <span className="meta-label">PRIMARY LANGUAGE</span>
                  <span className="meta-value cyan">
                    <i className="lang-pip" />
                    {data.primaryLanguage || "Markdown/Text"}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">LICENSE</span>
                  <span className="meta-value mono">{data.license || "Unspecified"}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">COMMUNITY STARS</span>
                  <span className="meta-value mono">{data.stars.toLocaleString()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">FORKS</span>
                  <span className="meta-value mono">{data.forks.toLocaleString()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">DEFAULT BRANCH</span>
                  <span className="meta-value mono">{data.defaultBranch}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">VISIBILITY</span>
                  <span className="meta-value uppercase">{data.visibility}</span>
                </div>
              </div>
            </article>

            {/* What is this project section */}
            <section className="briefing-section">
              <div className="section-dossier-header">
                <div className="eyebrow">CASE DECONSTRUCTION</div>
                <h2 className="briefing-h2">WHAT IS THIS PROJECT?</h2>
                <p className="briefing-subtext">
                  Three foundational deductions synthesized from repository code, structure, and documentation.
                </p>
              </div>

              <div className="dossier-grid">
                <article className="dossier-card">
                  <div className="card-top">
                    <span className="card-tag">PURPOSE</span>
                    <span className="intel-pill confirmed">CONFIRMED</span>
                  </div>
                  <div className="card-title">WHAT IT DOES</div>
                  <p className="card-body">{data.whatItDoes}</p>
                </article>

                <article className="dossier-card">
                  <div className="card-top">
                    <span className="card-tag">PROBLEM</span>
                    <span className="intel-pill confirmed">SOLVED</span>
                  </div>
                  <div className="card-title">THE PROBLEM IT SOLVES</div>
                  <p className="card-body">{data.problemSolved}</p>
                </article>

                <article className="dossier-card">
                  <div className="card-top">
                    <span className="card-tag">AUDIENCE</span>
                    <span className="intel-pill assessment">TARGET</span>
                  </div>
                  <div className="card-title">WHO USES IT</div>
                  <p className="card-body">{data.targetAudience}</p>
                </article>

                <article className="dossier-card">
                  <div className="card-top">
                    <span className="card-tag">ARCHITECTURE</span>
                    <span className="intel-pill confirmed">VERIFIED</span>
                  </div>
                  <div className="card-title">REPOSITORY OVERVIEW</div>
                  <p className="card-body">{data.repositoryOverview}</p>
                </article>
              </div>
            </section>

            {/* Investigation Map */}
            <section className="briefing-section">
              <div className="section-dossier-header">
                <div className="eyebrow">FIELD RECONNAISSANCE</div>
                <h2 className="briefing-h2">KEY FILES & STRUCTURE</h2>
                <p className="briefing-subtext">
                  Essential files identified in this investigation. Click beginner glossary tags to learn what each role means.
                </p>
              </div>

              <div className="investigation-tree-card">
                <div className="tree-card-header">
                  <span>
                    <Icon name="folder" size={15} /> KEY ARTIFACTS
                  </span>
                  <small>{data.structureMap.length} ITEMS IDENTIFIED</small>
                </div>

                {data.structureMap.map((item: StructureItem) => {
                  const isExplaining = activeGlossaryTerm?.name === item.name
                  return (
                    <div className="tree-row-wrapper" key={item.name}>
                      <div className="tree-row">
                        <div className="tree-row-left">
                          <span className="tree-icon">
                            <Icon name={item.type === "dir" ? "folder" : "file"} size={16} />
                          </span>
                          <span className="tree-name">{item.name}</span>
                          <span className="tree-role">{item.role}</span>
                        </div>
                        <div className="tree-row-desc">
                          <span>{item.description}</span>
                          {item.glossaryTerm && (
                            <button
                              className={`glossary-btn ${isExplaining ? "active" : ""}`}
                              onClick={() => {
                                if (isExplaining) {
                                  setActiveGlossaryTerm(null)
                                } else {
                                  setActiveGlossaryTerm({
                                    name: item.name,
                                    term: item.glossaryTerm!.term,
                                    meaning: item.glossaryTerm!.meaning,
                                  })
                                }
                              }}
                              type="button"
                            >
                              <Icon name="spark" size={12} /> {item.glossaryTerm.term}?
                            </button>
                          )}
                        </div>
                      </div>
                      {isExplaining && (
                        <div className="glossary-explainer-box">
                          <div className="explainer-header">
                            <Icon name="spark" size={12} />
                            <span>BEGINNER FIELD NOTE: {activeGlossaryTerm.term}</span>
                          </div>
                          <p>{activeGlossaryTerm.meaning}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Detective Guide Panel */}
            <section className="detective-guide-panel">
              <div className="detective-guide-art">
                <Detective className="briefing-detective-svg" />
              </div>
              <div className="detective-guide-body">
                <div className="dialogue-kicker">
                  <span className="kicker-badge">DETECTIVE DISPATCH</span>
                  <span className="kicker-case">TRANSCRIPTION #0042</span>
                </div>
                <blockquote className="detective-dialogue">
                  &ldquo;Every complex codebase is just a set of simple clues linked together. We&apos;ve cleared the perimeter and identified the entry point. Next step: step into the interactive dashboard and trace the connections yourself.&rdquo;
                </blockquote>
                <div className="detective-status-line">
                  <span className="status-dot" />
                  <span>READY TO ENTER REPOSITORY DASHBOARD</span>
                </div>
              </div>
            </section>

            {/* Action CTA */}
            <footer className="briefing-action-footer">
              <div className="action-cta-wrap">
                <button
                  className="begin-learning-btn"
                  onClick={onBeginLearning}
                  type="button"
                >
                  ENTER REPOSITORY DASHBOARD <Icon name="arrow" />
                </button>
                <div className="action-hint">
                  <span className="hint-arrow">&gt;</span> Proceed to overview, code visualizer &amp; active missions
                </div>
              </div>
            </footer>
          </>
        )}
      </div>
    </main>
  )
}
