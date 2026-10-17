import { useState, useEffect, useRef } from "react"
import { Icon } from "./App"
import {
  askQuestionAboutRepo,
  type RepoBriefingData,
  type TreeEntry,
} from "./repoService"
import { PixelDetectiveSprite } from "./PixelDetectiveSprite"

interface ChatMessage {
  id: string
  role: "user" | "detective"
  text: string
  references?: string[]
  mode?: string
  timestamp: string
}

interface DetectiveChatPageProps {
  currentRepo: string
  repoData: RepoBriefingData | null
  treeEntries: TreeEntry[]
  initialPrompt?: string
  onBackToOverview: () => void
  onOpenExplorerWithFile?: (file: string) => void
}

export function DetectiveChatPage({
  currentRepo,
  repoData,
  treeEntries,
  initialPrompt,
  onBackToOverview,
}: DetectiveChatPageProps) {
  // Chat History
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Speech Recognition (Voice Input)
  const [isRecording, setIsRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  // Speech Synthesis (Text to Speech)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  const [speechPaused, setSpeechPaused] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0)
  const [speechRate, setSpeechRate] = useState<number>(1.0)
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Suggested Prompts
  const suggestedPrompts = [
    "Explain this repository.",
    "Find the main entry point.",
    "Explain a specific function.",
    "Identify dependencies.",
    "Help me understand this file.",
  ]

  // Setup Voices for Speech Synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => {
        const v = window.speechSynthesis.getVoices()
        if (v && v.length > 0) {
          setAvailableVoices(v)
          // Default to an English voice if available
          const enIdx = v.findIndex((voice) => voice.lang.startsWith("en") || voice.name.includes("English"))
          if (enIdx !== -1) setSelectedVoiceIndex(enIdx)
        }
      }
      updateVoices()
      window.speechSynthesis.onvoiceschanged = updateVoices
    }

    return () => {
      // Stop speech when leaving page
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Initial prompt handling
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim())
    }
  }, [initialPrompt])

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onstart = () => {
        setIsRecording(true)
        setSpeechError(null)
      }

      recognition.onresult = (event: any) => {
        let transcript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        if (transcript) {
          setInputText((prev) => {
            const trimmed = prev.trim()
            return trimmed ? `${trimmed} ${transcript}` : transcript
          })
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setSpeechError("Microphone permission denied. Please allow microphone access.")
        } else if (event.error !== "no-speech") {
          setSpeechError(`Speech recognition notice: ${event.error}`)
        }
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    } catch (err: any) {
      setSpeechSupported(false)
      setSpeechError("Speech recognition could not be initialized in this browser.")
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
      }
    }
  }, [])

  // Toggle Voice Input Recording
  const handleToggleVoiceInput = () => {
    if (!speechSupported) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.")
      return
    }

    if (isRecording) {
      try {
        recognitionRef.current?.stop()
      } catch {}
      setIsRecording(false)
    } else {
      setSpeechError(null)
      try {
        recognitionRef.current?.start()
      } catch (err: any) {
        setSpeechError("Could not start recording: " + err.message)
      }
    }
  }

  // Text-To-Speech Controls (Read Aloud)
  const handleReadAloud = (msg: ChatMessage) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.")
      return
    }

    // If currently speaking this message and paused, resume
    if (speakingMsgId === msg.id && speechPaused) {
      window.speechSynthesis.resume()
      setSpeechPaused(false)
      return
    }

    // If currently speaking this message and active, pause
    if (speakingMsgId === msg.id && !speechPaused) {
      window.speechSynthesis.pause()
      setSpeechPaused(true)
      return
    }

    // Otherwise stop any existing speech and start new utterance
    window.speechSynthesis.cancel()

    // Clean markdown formatting before speaking
    const cleanText = msg.text
      .replace(/```[\s\S]*?```/g, "Code block omitted.")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*#_~]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

    const utterance = new SpeechSynthesisUtterance(cleanText)
    if (availableVoices[selectedVoiceIndex]) {
      utterance.voice = availableVoices[selectedVoiceIndex]
    }
    utterance.rate = speechRate

    utterance.onstart = () => {
      setSpeakingMsgId(msg.id)
      setSpeechPaused(false)
    }

    utterance.onend = () => {
      setSpeakingMsgId(null)
      setSpeechPaused(false)
    }

    utterance.onerror = () => {
      setSpeakingMsgId(null)
      setSpeechPaused(false)
    }

    window.speechSynthesis.speak(utterance)
  }

  const handleStopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    setSpeakingMsgId(null)
    setSpeechPaused(false)
  }

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend !== undefined ? textToSend : inputText).trim()
    if (!prompt || loading) return

    // Stop recording if active
    if (isRecording) {
      try {
        recognitionRef.current?.stop()
      } catch {}
      setIsRecording(false)
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText("")
    setLoading(true)
    setErrorMsg(null)

    const parts = currentRepo.split("/")
    const owner = parts[0] || "vercel"
    const repo = parts[1] || "ms"

    const historyForApi = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }))

    try {
      const res = await askQuestionAboutRepo(owner, repo, prompt, historyForApi)
      const detectiveMsg: ChatMessage = {
        id: `detective-${Date.now()}`,
        role: "detective",
        text: res.answer,
        references: res.references,
        mode: res.mode,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, detectiveMsg])
    } catch (err: any) {
      setErrorMsg("Failed to communicate with the detective intelligence backend. Please try again.")
      const errorMsgObj: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "detective",
        text: `⚠️ **Forensic Analysis Warning**: Could not connect to the remote investigation agent.
${err?.message || "Verify the local backend server is running at http://127.0.0.1:8000."}`,
        references: ["package.json"],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, errorMsgObj])
    } finally {
      setLoading(false)
    }
  }

  // Handle keydown for Enter (send) vs Shift+Enter (new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Clear conversation / New chat
  const handleClearConversation = () => {
    handleStopSpeech()
    setMessages([])
    setErrorMsg(null)
  }

  // Markdown Formatter for rendering bold, backticks, code blocks, bullet points
  const renderFormattedMarkdown = (content: string) => {
    // Split into code blocks vs text blocks
    const parts = content.split(/(```[\s\S]*?```)/g)

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        // Code Block
        const lines = part.slice(3, -3).trim().split("\n")
        const firstLine = lines[0].trim()
        const isLang = /^[a-zA-Z0-9_-]+$/.test(firstLine)
        const lang = isLang ? firstLine : ""
        const code = isLang ? lines.slice(1).join("\n") : lines.join("\n")

        return (
          <div key={index} className="chat-markdown-codeblock">
            {lang && <div className="codeblock-header">{lang.toUpperCase()}</div>}
            <pre className="codeblock-pre">
              <code>{code}</code>
            </pre>
          </div>
        )
      }

      // Regular text block: format bold (**text**), inline code (`code`), linebreaks
      const textLines = part.split("\n")
      return (
        <span key={index} className="chat-markdown-text">
          {textLines.map((line, lIdx) => {
            // Parse inline bold and backticks
            const inlineTokens = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
            const renderedLine = inlineTokens.map((tok, tIdx) => {
              if (tok.startsWith("`") && tok.endsWith("`")) {
                return (
                  <code key={tIdx} className="chat-inline-code">
                    {tok.slice(1, -1)}
                  </code>
                )
              }
              if (tok.startsWith("**") && tok.endsWith("**")) {
                return (
                  <strong key={tIdx} className="chat-bold-text">
                    {tok.slice(2, -2)}
                  </strong>
                )
              }
              return tok
            })

            return (
              <span key={lIdx}>
                {renderedLine}
                {lIdx < textLines.length - 1 && <br />}
              </span>
            )
          })}
        </span>
      )
    })
  }

  return (
    <div className="detective-chat-page">
      {/* Top Controls Bar */}
      <div className="chat-page-topbar">
        <div className="chat-topbar-left">
          <button
            className="chat-back-btn"
            onClick={onBackToOverview}
            type="button"
            title="Return to Dashboard Office"
          >
            <Icon name="arrow" size={14} />
            <span>Dashboard</span>
          </button>
          <div className="chat-case-badge">
            <span className="case-pulse-dot" />
            <span>CASE AGENT: <b>{currentRepo}</b></span>
          </div>
        </div>

        <div className="chat-topbar-right">
          {/* Voice Settings dropdown toggle */}
          <button
            className={`chat-topbar-action-btn ${showVoiceSettings ? "active" : ""}`}
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            type="button"
            title="Voice & Audio Settings"
          >
            <span>🎙️ Audio Settings</span>
          </button>

          <button
            className="chat-topbar-action-btn"
            onClick={handleClearConversation}
            type="button"
            title="Start New Chat Session"
          >
            <span>✨ New Chat</span>
          </button>
        </div>
      </div>

      {/* Optional Voice Settings Drawer */}
      {showVoiceSettings && (
        <div className="chat-voice-settings-drawer">
          <div className="voice-settings-row">
            <div className="voice-setting-field">
              <label>Select Detective Voice:</label>
              <select
                value={selectedVoiceIndex}
                onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
                className="voice-select"
              >
                {availableVoices.map((v, i) => (
                  <option key={i} value={i}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="voice-setting-field">
              <label>Speech Rate: {speechRate}x</label>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="voice-slider"
              />
            </div>

            {speakingMsgId && (
              <button
                className="voice-stop-all-btn"
                onClick={handleStopSpeech}
                type="button"
              >
                ⏹️ Stop Speaking
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Conversation Column */}
      <div className="chat-conversation-container">
        {/* Welcome Screen when no messages */}
        {messages.length === 0 ? (
          <div className="chat-welcome-screen">
            <div className="welcome-avatar-wrap">
              <PixelDetectiveSprite className="welcome-detective-sprite" />
            </div>

            <h1 className="welcome-title">Detective on Duty!</h1>
            <p className="welcome-subtitle">
              I've reviewed your repository <b>{currentRepo}</b>. What mystery shall we solve?
            </p>

            <div className="welcome-meta-chips">
              <span className="meta-chip">
                Language: <b>{repoData?.primaryLanguage || "Identified"}</b>
              </span>
              <span className="meta-chip">
                Manifest: <b>package.json</b>
              </span>
              <span className="meta-chip">
                Indexed Files: <b>{treeEntries.length || 18} files</b>
              </span>
            </div>

            {/* Suggested Prompts */}
            <div className="welcome-prompts-section">
              <span className="prompts-heading">SUGGESTED FORENSIC INQUIRIES:</span>
              <div className="suggested-prompts-grid">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="suggested-prompt-button"
                    onClick={() => handleSendMessage(prompt)}
                    type="button"
                  >
                    <span className="prompt-spark">⚡</span>
                    <span className="prompt-text">{prompt}</span>
                    <span className="prompt-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Log */
          <div className="chat-messages-log">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message-row ${msg.role === "user" ? "user-row" : "detective-row"}`}
              >
                {/* Avatar */}
                <div className="chat-avatar-box">
                  {msg.role === "user" ? (
                    <div className="user-initials">YOU</div>
                  ) : (
                    <div className="detective-mini-avatar">
                      <PixelDetectiveSprite />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`chat-message-bubble ${msg.role}`}>
                  <div className="message-header-bar">
                    <span className="message-author-tag">
                      {msg.role === "user" ? "INVESTIGATOR" : "REPO DETECTIVE AI"}
                    </span>
                    <span className="message-time">{msg.timestamp}</span>

                    {/* Voice Output (SpeechSynthesis) on Detective Responses */}
                    {msg.role === "detective" && (
                      <div className="message-voice-controls">
                        <button
                          className={`voice-read-btn ${speakingMsgId === msg.id ? "speaking" : ""}`}
                          onClick={() => handleReadAloud(msg)}
                          title={
                            speakingMsgId === msg.id && !speechPaused
                              ? "Pause Read Aloud"
                              : speakingMsgId === msg.id && speechPaused
                              ? "Resume Read Aloud"
                              : "Read Aloud (Voice)"
                          }
                          type="button"
                        >
                          {speakingMsgId === msg.id ? (
                            speechPaused ? (
                              <span>▶ Resume</span>
                            ) : (
                              <span className="voice-wave-active">
                                <span className="wave-bar wb1" />
                                <span className="wave-bar wb2" />
                                <span className="wave-bar wb3" />
                                <span>Pause</span>
                              </span>
                            )
                          ) : (
                            <span>🔊 Read Aloud</span>
                          )}
                        </button>

                        {speakingMsgId === msg.id && (
                          <button
                            className="voice-stop-btn"
                            onClick={handleStopSpeech}
                            title="Stop Speaking"
                            type="button"
                          >
                            ⏹
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Body Text */}
                  <div className="message-body-content">
                    {renderFormattedMarkdown(msg.text)}
                  </div>

                  {/* File references / Clue tags */}
                  {msg.references && msg.references.length > 0 && (
                    <div className="message-references-row">
                      <span className="ref-label">CLUE REFERENCES:</span>
                      {msg.references.map((ref) => (
                        <span key={ref} className="ref-file-tag">
                          📄 {ref}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="chat-message-row detective-row">
                <div className="chat-avatar-box">
                  <div className="detective-mini-avatar">
                    <PixelDetectiveSprite />
                  </div>
                </div>
                <div className="chat-message-bubble detective loading-bubble">
                  <div className="loading-detective-state">
                    <span className="loading-search-icon">🔍</span>
                    <span>Detective interrogating repository files and analyzing AST patterns...</span>
                    <span className="typing-cursor">_</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Recording Status Banner */}
      {isRecording && (
        <div className="chat-recording-banner">
          <div className="recording-wave-indicator">
            <span className="pulse-circle" />
            <span className="rec-text">Listening... Speak clearly into your microphone</span>
          </div>
          <button
            className="rec-stop-button"
            onClick={handleToggleVoiceInput}
            type="button"
          >
            Stop Recording
          </button>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="chat-speech-error-banner">
          <span>⚠️ {speechError}</span>
          <button onClick={() => setSpeechError(null)} type="button">✕</button>
        </div>
      )}

      {/* Bottom Message Input Bar */}
      <div className="chat-bottom-input-wrap">
        <div className="chat-input-box">
          {/* Voice Input (Microphone Button) */}
          <button
            className={`chat-mic-btn ${isRecording ? "recording" : ""}`}
            onClick={handleToggleVoiceInput}
            title={isRecording ? "Stop voice recording" : "Speak to Detective (Voice Recognition)"}
            type="button"
          >
            {isRecording ? (
              <span className="mic-rec-active">⏹️</span>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this repository (Enter to send, Shift+Enter for newline)..."
            className="chat-textarea"
            disabled={loading}
          />

          {/* Send Button */}
          <button
            className="chat-send-btn"
            onClick={() => handleSendMessage()}
            disabled={loading || !inputText.trim()}
            type="button"
            title="Send Message"
          >
            <Icon name="arrow" size={16} />
            <span>SEND</span>
          </button>
        </div>

        <div className="chat-input-footer-hint">
          <span>REPO DETECTIVE AI • REAL REPOSITORY FORENSICS • WEB SPEECH ENABLED</span>
        </div>
      </div>
    </div>
  )
}
