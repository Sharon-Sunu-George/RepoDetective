import { useState, useEffect, useRef } from "react"
import {
  fetchSarvamStatus,
  sendSarvamVoiceQuery,
  synthesizeSarvamSpeech,
  type SarvamStatus,
  type RepoBriefingData,
  type TreeEntry,
} from "./repoService"

interface SarvamVoiceAgentProps {
  currentRepo: string
  repoData: RepoBriefingData | null
  treeEntries: TreeEntry[]
  onBackToOverview: () => void
}

interface VoiceTranscriptItem {
  id: string
  speaker: "investigator" | "sarvam"
  text: string
  timestamp: string
  audioBase64?: string | null
}

export function SarvamVoiceAgent({
  currentRepo,
  repoData,
  treeEntries,
  onBackToOverview,
}: SarvamVoiceAgentProps) {
  // Voice Recording / Speech Recognition State
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en-IN")
  const [sarvamStatus, setSarvamStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle")
  const [agentConfig, setAgentConfig] = useState<SarvamStatus | null>(null)
  const [textQueryInput, setTextQueryInput] = useState<string>("")
  
  // Transcripts history
  const [transcripts, setTranscripts] = useState<VoiceTranscriptItem[]>([
    {
      id: "init-1",
      speaker: "sarvam",
      text: `Sarvam Voice AI Agent online for repository "${currentRepo}". Tap the microphone to speak your question or instruction.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])

  const recognitionRef = useRef<any>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch Sarvam Agent configuration status from backend on mount
  useEffect(() => {
    let isMounted = true
    async function loadStatus() {
      const status = await fetchSarvamStatus()
      if (isMounted) {
        setAgentConfig(status)
      }
    }
    loadStatus()
    return () => {
      isMounted = false
    }
  }, [])

  // Scroll to bottom of transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcripts, interimText])

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = selectedLanguage

      recognition.onstart = () => {
        setIsListening(true)
        setSarvamStatus("listening")
      }

      recognition.onresult = (event: any) => {
        let currentInterim = ""
        let finalPhrase = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i]
          if (item.isFinal) {
            finalPhrase += item[0].transcript
          } else {
            currentInterim += item[0].transcript
          }
        }

        if (currentInterim) {
          setInterimText(currentInterim)
        }

        if (finalPhrase.trim()) {
          setInterimText("")
          handleUserUtterance(finalPhrase.trim())
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          console.warn("Speech recognition notice:", event.error)
          setIsListening(false)
          setSarvamStatus("idle")
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        if (sarvamStatus === "listening") {
          setSarvamStatus("idle")
        }
      }

      recognitionRef.current = recognition
    }

    return () => {
      try {
        recognitionRef.current?.stop()
      } catch {}
      stopSpeaking()
    }
  }, [selectedLanguage, currentRepo])

  // Toggle voice recognition
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.")
      return
    }

    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch {}
      setIsListening(false)
      setSarvamStatus("idle")
    } else {
      try {
        stopSpeaking()
        recognitionRef.current.lang = selectedLanguage
        recognitionRef.current.start()
      } catch (err: any) {
        console.error("Failed to start speech recognition:", err)
      }
    }
  }

  // Handle incoming user spoken text and query the backend Sarvam Voice Agent
  const handleUserUtterance = async (spokenQuery: string) => {
    const userItem: VoiceTranscriptItem = {
      id: "user-" + Date.now(),
      speaker: "investigator",
      text: spokenQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setTranscripts((prev) => [...prev, userItem])
    setSarvamStatus("processing")

    // Send to secure backend Sarvam agent proxy with full repository context
    try {
      const repoContext = {
        repository: currentRepo,
        language: repoData?.language,
        description: repoData?.description,
        fileCount: treeEntries.length,
        primaryFiles: treeEntries.slice(0, 8).map((f) => f.path),
      }

      const historyContext = transcripts.slice(-6).map((t) => ({
        speaker: t.speaker,
        text: t.text,
      }))

      const result = await sendSarvamVoiceQuery(
        currentRepo,
        spokenQuery,
        selectedLanguage,
        repoContext,
        historyContext
      )

      const sarvamItem: VoiceTranscriptItem = {
        id: "sarvam-" + Date.now(),
        speaker: "sarvam",
        text: result.response_text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        audioBase64: result.audio_base64,
      }

      setTranscripts((prev) => [...prev, sarvamItem])
      setSarvamStatus("speaking")

      // Play audio either from Sarvam Bulbul TTS base64 or browser SpeechSynthesis
      if (result.audio_base64) {
        playBase64Audio(result.audio_base64)
      } else {
        speakUtterance(result.response_text)
      }
    } catch (err) {
      console.error("Voice query failed:", err)
      setSarvamStatus("idle")
    }
  }

  // Play audio returned by Sarvam Bulbul TTS
  const playBase64Audio = (b64Audio: string) => {
    try {
      stopSpeaking()
      const audioUrl = `data:audio/wav;base64,${b64Audio}`
      const audio = new Audio(audioUrl)
      currentAudioRef.current = audio

      audio.onplay = () => {
        setIsSpeaking(true)
        setSarvamStatus("speaking")
      }

      audio.onended = () => {
        setIsSpeaking(false)
        setSarvamStatus("idle")
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        setSarvamStatus("idle")
      }

      audio.play().catch((e) => {
        console.warn("Audio play prevented:", e)
        setIsSpeaking(false)
        setSarvamStatus("idle")
      })
    } catch {
      setIsSpeaking(false)
      setSarvamStatus("idle")
    }
  }

  // Fallback: Speak response out loud using Web Speech Synthesis
  const speakUtterance = (textToSpeak: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return

    stopSpeaking()
    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.rate = 1.05
    utterance.pitch = 1.0

    const voices = window.speechSynthesis.getVoices()
    const matchingVoice = voices.find((v) =>
      selectedLanguage === "hi-IN" ? v.lang.includes("hi") : (v.lang === "en-IN" || v.lang.includes("en-US"))
    )
    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
      setSarvamStatus("speaking")
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setSarvamStatus("idle")
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      setSarvamStatus("idle")
    }

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
      } catch {}
      currentAudioRef.current = null
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }

    setIsSpeaking(false)
    if (sarvamStatus === "speaking") {
      setSarvamStatus("idle")
    }
  }

  // Handle replaying audio for a message
  const handleReplayMessage = async (item: VoiceTranscriptItem) => {
    if (item.audioBase64) {
      playBase64Audio(item.audioBase64)
    } else {
      // Try on-demand TTS via Sarvam backend proxy
      setSarvamStatus("processing")
      const newAudioB64 = await synthesizeSarvamSpeech(item.text, selectedLanguage)
      if (newAudioB64) {
        item.audioBase64 = newAudioB64
        playBase64Audio(newAudioB64)
      } else {
        speakUtterance(item.text)
      }
    }
  }

  return (
    <main className="sarvam-voice-agent-container">
      {/* Top Header Bar */}
      <header className="sarvam-voice-header">
        <div className="sarvam-header-left">
          <button
            className="sarvam-back-btn"
            onClick={onBackToOverview}
            type="button"
            title="Back to Dashboard"
          >
            ← Back to Dashboard
          </button>
          <div className="sarvam-title-wrap">
            <div className="sarvam-badge-tag">
              <span className="sarvam-pulse-dot" />
              SARVAM VOICE AI AGENT
            </div>
            <h1 className="sarvam-heading">
              Case Audio Interrogation &bull; <span className="sarvam-repo-highlight">{currentRepo}</span>
            </h1>
          </div>
        </div>

        <div className="sarvam-header-right">
          {/* Language Selector */}
          <div className="sarvam-lang-select-wrap">
            <label htmlFor="sarvam-lang-select" className="sarvam-label">Voice Language:</label>
            <select
              id="sarvam-lang-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="sarvam-lang-select"
            >
              {agentConfig?.supported_languages && agentConfig.supported_languages.length > 0 ? (
                agentConfig.supported_languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="en-IN">English (India - Sarvam Voice)</option>
                  <option value="hi-IN">Hindi (Sarvam AI)</option>
                  <option value="bn-IN">Bengali (বাংলা)</option>
                  <option value="ta-IN">Tamil (தமிழ்)</option>
                  <option value="te-IN">Telugu (తెలుగు)</option>
                  <option value="en-US">English (US)</option>
                </>
              )}
            </select>
          </div>

          <div className="sarvam-engine-status">
            <span className="sarvam-engine-label">Engine:</span>
            <span className="sarvam-engine-badge" title={agentConfig?.has_api_key ? "Live Sarvam Agent Proxy Connected" : "Local Proxy Mode"}>
              {agentConfig?.has_api_key ? "Sarvam Indus Connected" : "Sarvam Audio Core"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Voice Interactive Arena */}
      <div className="sarvam-voice-stage">
        {/* Left / Center: Interactive Microphone & Waveform Radar */}
        <section className="sarvam-audio-console cyber-panel">
          <div className="cyber-panel-header-title">VOICE INTERROGATION TERMINAL</div>

          <div className="sarvam-visualizer-box">
            {/* Ambient Circular Radar rings */}
            <div className={`sarvam-radar-ring r1 ${isListening ? "active" : ""}`} />
            <div className={`sarvam-radar-ring r2 ${isListening ? "active" : ""}`} />
            <div className={`sarvam-radar-ring r3 ${isListening ? "active" : ""}`} />

            {/* Central Big Microphone Button */}
            <button
              className={`sarvam-mic-orb-btn ${isListening ? "listening" : ""} ${isSpeaking ? "speaking" : ""}`}
              onClick={toggleListening}
              type="button"
              aria-label={isListening ? "Stop listening" : "Start speaking"}
            >
              <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

            {/* Status Text Indicator */}
            <div className="sarvam-status-readout">
              {sarvamStatus === "listening" && <span className="status-neon listening">LISTENING... SPEAK YOUR QUESTION</span>}
              {sarvamStatus === "processing" && <span className="status-neon processing">CONSULTING CASE EVIDENCE...</span>}
              {sarvamStatus === "speaking" && <span className="status-neon speaking">SARVAM VOICE TRANSMITTING...</span>}
              {sarvamStatus === "idle" && <span className="status-neon idle">CLICK MICROPHONE TO TALK</span>}
            </div>

            {/* Live Audio Visualizer Bars */}
            <div className="sarvam-audio-bars-container">
              {[...Array(16)].map((_, i) => (
                <span
                  key={i}
                  className={`audio-bar-stick b-${(i % 5) + 1} ${(isListening || isSpeaking) ? "animated" : ""}`}
                />
              ))}
            </div>

            {/* Quick Stop Audio Button if currently speaking */}
            {isSpeaking && (
              <button
                className="sarvam-stop-speech-btn"
                onClick={stopSpeaking}
                type="button"
              >
                ⏹ Stop Spoken Response
              </button>
            )}
          </div>

          {/* Spoken Prompt Suggestions */}
          <div className="sarvam-prompt-shortcuts">
            <span className="sarvam-shortcuts-title">Spoken Inquiry Presets:</span>
            <div className="sarvam-chips-wrap">
              <button
                className="sarvam-preset-chip"
                onClick={() => handleUserUtterance("What is the primary entry point of this codebase?")}
                type="button"
              >
                🎙️ "What is the primary entry point?"
              </button>
              <button
                className="sarvam-preset-chip"
                onClick={() => handleUserUtterance("Explain the architecture and tech stack.")}
                type="button"
              >
                🎙️ "Explain the architecture and tech stack."
              </button>
              <button
                className="sarvam-preset-chip"
                onClick={() => handleUserUtterance("Summarize this repository and key problems solved.")}
                type="button"
              >
                🎙️ "Summarize this repository."
              </button>
            </div>
          </div>

          {/* Interactive Text Query Fallback Bar */}
          <form
            className="sarvam-text-fallback-row"
            onSubmit={(e) => {
              e.preventDefault()
              if (textQueryInput.trim() && sarvamStatus !== "processing") {
                const query = textQueryInput.trim()
                setTextQueryInput("")
                handleUserUtterance(query)
              }
            }}
          >
            <input
              type="text"
              placeholder="Or type an investigation question..."
              value={textQueryInput}
              onChange={(e) => setTextQueryInput(e.target.value)}
              className="sarvam-text-input"
              disabled={sarvamStatus === "processing"}
            />
            <button
              type="submit"
              className="sarvam-text-send-btn"
              disabled={!textQueryInput.trim() || sarvamStatus === "processing"}
            >
              Ask Agent
            </button>
          </form>
        </section>

        {/* Right: Live Transcript Stream */}
        <section className="sarvam-transcripts-panel cyber-panel">
          <div className="cyber-panel-header-title">LIVE AUDIO TRANSCRIPT STREAM</div>

          <div className="sarvam-transcripts-scroll">
            {transcripts.map((item) => (
              <div key={item.id} className={`sarvam-transcript-card ${item.speaker}`}>
                <div className="sarvam-card-header">
                  <span className="sarvam-speaker-badge">
                    {item.speaker === "investigator" ? "👤 YOU (SPOKEN QUERY)" : "🎙️ SARVAM VOICE AI"}
                  </span>
                  <span className="sarvam-card-time">{item.timestamp}</span>
                </div>
                <div className="sarvam-card-body">{item.text}</div>
                {item.speaker === "sarvam" && (
                  <button
                    className="sarvam-replay-btn"
                    onClick={() => handleReplayMessage(item)}
                    type="button"
                    title="Replay Voice Audio"
                  >
                    🔊 Listen Again
                  </button>
                )}
              </div>
            ))}

            {/* Interim live speech recognition feedback */}
            {interimText && (
              <div className="sarvam-transcript-card investigator interim">
                <div className="sarvam-card-header">
                  <span className="sarvam-speaker-badge">👤 TRANSCRIBING...</span>
                </div>
                <div className="sarvam-card-body italic">"{interimText}"</div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>
        </section>
      </div>
    </main>
  )
}
