import { useState, useEffect, useRef } from "react"
import {
  fetchSarvamStatus,
  fetchSarvamSessionUrl,
  sendSarvamVoiceQuery,
  synthesizeSarvamSpeech,
  type SarvamStatus,
  type RepoBriefingData,
  type TreeEntry,
} from "./repoService"
import { BrowserAudioInterface } from "sarvam-conv-ai-sdk/browser"

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
  const [liveSessionActive, setLiveSessionActive] = useState<boolean>(false)
  const [connectionState, setConnectionState] = useState<"unconfigured" | "ready" | "connecting" | "connected" | "failed">("ready")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
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
  const activeWsRef = useRef<WebSocket | null>(null)
  const audioInterfaceRef = useRef<BrowserAudioInterface | null>(null)

  // Fetch Sarvam Agent configuration status from backend on mount
  useEffect(() => {
    let isMounted = true
    async function loadStatus() {
      const status = await fetchSarvamStatus()
      if (isMounted) {
        setAgentConfig(status)
        if (!status.has_api_key) {
          setConnectionState("unconfigured")
        } else {
          setConnectionState("ready")
        }
      }
    }
    loadStatus()
    return () => {
      isMounted = false
      if (audioInterfaceRef.current) {
        audioInterfaceRef.current.stop().catch(() => {})
        audioInterfaceRef.current = null
      }
      if (activeWsRef.current) {
        try {
          if (activeWsRef.current.readyState === WebSocket.OPEN) {
            activeWsRef.current.close()
          }
        } catch {}
        activeWsRef.current = null
      }
    }
  }, [])


  // Scroll to bottom of transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcripts, interimText])

  // Initialize SpeechRecognition as complementary speech transcription
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
          if (!activeWsRef.current) {
            setIsListening(false)
            setSarvamStatus("idle")
          }
        }
      }

      recognition.onend = () => {
        if (!liveSessionActive) {
          setIsListening(false)
          if (sarvamStatus === "listening") {
            setSarvamStatus("idle")
          }
        }
      }

      recognitionRef.current = recognition
    }

    return () => {
      try {
        recognitionRef.current?.stop()
      } catch {}
      stopSpeaking()
      stopLiveSession()
    }
  }, [selectedLanguage, currentRepo])

  // Helper to cleanly terminate the live Sarvam Indus Voice AI session
  const stopLiveSession = async () => {
    if (audioInterfaceRef.current) {
      try {
        await audioInterfaceRef.current.stop()
      } catch {}
      audioInterfaceRef.current = null
    }

    if (activeWsRef.current) {
      try {
        if (activeWsRef.current.readyState === WebSocket.OPEN) {
          const endMsg = {
            type: "client.action.interaction_end",
            origin: "client",
            timestamp: Date.now() / 1000,
          }
          activeWsRef.current.send(JSON.stringify(endMsg))
          activeWsRef.current.close()
        }
      } catch {}
      activeWsRef.current = null
    }
    setLiveSessionActive(false)
  }

  // Toggle voice recognition & Sarvam Voice AI Agent connection
  const toggleListening = async () => {
    if (isListening || liveSessionActive) {
      // User tapped mic to stop session
      try {
        recognitionRef.current?.stop()
      } catch {}
      await stopLiveSession()
      stopSpeaking()
      setIsListening(false)
      setSarvamStatus("idle")
      setConnectionState(agentConfig?.has_api_key ? "ready" : "unconfigured")
    } else {
      try {
        stopSpeaking()

        // 1. If backend has Sarvam credentials, initiate real Sarvam Voice session
        if (agentConfig?.has_api_key) {
          setConnectionState("connecting")
          setSarvamStatus("processing")

          const sessionData = await fetchSarvamSessionUrl({
            user_identifier: "detective-user",
            user_identifier_type: "custom",
            interaction_type: "call",
          })

          if (sessionData?.url) {
            try {
              // Construct full WebSocket URL as expected by Sarvam Indus
              const sep = sessionData.url.includes("?") ? "&" : "?"
              const wsUrl = `${sessionData.url}${sep}user_identifier=detective-user&user_identifier_type=custom&input_sample_rate=16000&output_sample_rate=16000&interaction_type=call`

              const ws = new WebSocket(wsUrl)
              activeWsRef.current = ws

              // Instantiate Sarvam BrowserAudioInterface for live microphone input & streaming output
              const audioInterface = new BrowserAudioInterface(16000)
              audioInterfaceRef.current = audioInterface

              ws.onopen = async () => {
                setLiveSessionActive(true)
                setConnectionState("connected")
                setIsListening(true)
                setSarvamStatus("listening")

                // Send interaction_start message according to Sarvam Voice AI protocol
                const startMsg = {
                  type: "client.action.interaction_start",
                  origin: "client",
                  timestamp: Date.now() / 1000,
                  user_identifier: "detective-user",
                  user_identifier_type: "custom",
                  org_id: agentConfig.org_id,
                  workspace_id: agentConfig.workspace_id,
                  app_id: agentConfig.app_id || "Conversatio-6103dad4-f01f",
                  input_sample_rate: 16000,
                  output_sample_rate: 16000,
                  agent_variables: {
                    repository: currentRepo,
                    description: repoData?.description || "",
                    language: repoData?.primaryLanguage || "",
                  },
                }
                ws.send(JSON.stringify(startMsg))

                // Start microphone capture via BrowserAudioInterface and stream raw PCM audio to Sarvam agent
                try {
                  await audioInterface.start(async (audioData) => {
                    if (ws.readyState === WebSocket.OPEN) {
                      // Convert Uint8Array to base64
                      let binary = ""
                      const bytes = audioData
                      const len = bytes.byteLength
                      for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(bytes[i])
                      }
                      const b64 = btoa(binary)
                      const audioMsg = {
                        type: "client.media.audio_chunk",
                        origin: "client",
                        timestamp: Date.now() / 1000,
                        audio_base64: b64,
                        format: "linear16",
                        sample_rate: 16000,
                      }
                      ws.send(JSON.stringify(audioMsg))
                    }
                  })
                } catch (micErr) {
                  console.warn("BrowserAudioInterface microphone start error:", micErr)
                }
              }

              ws.onmessage = async (event) => {
                try {
                  const data = JSON.parse(event.data)

                  // Handle audio chunk responses directly through BrowserAudioInterface
                  if (data?.type === "server.media.audio_chunk" && data.audio_base64) {
                    setIsSpeaking(true)
                    setSarvamStatus("speaking")
                    // Convert base64 to Uint8Array for BrowserAudioInterface output
                    const binStr = atob(data.audio_base64)
                    const u8 = new Uint8Array(binStr.length)
                    for (let i = 0; i < binStr.length; i++) {
                      u8[i] = binStr.charCodeAt(i)
                    }
                    if (audioInterfaceRef.current) {
                      await audioInterfaceRef.current.output(u8, 16000)
                    }
                  }

                  // Handle transcription and text updates
                  if (data?.type === "server.transcription" && data.content) {
                    const isBot = data.role === "agent" || data.role === "bot"
                    setTranscripts((prev) => [
                      ...prev,
                      {
                        id: "sarvam-live-" + Date.now() + Math.random().toString(36).substring(2, 6),
                        speaker: isBot ? "sarvam" : "investigator",
                        text: data.content,
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      },
                    ])
                    if (isBot) {
                      setIsSpeaking(true)
                      setSarvamStatus("speaking")
                    }
                  } else if (data?.type === "server.text" || (data?.text && !data.audio_base64)) {
                    const txt = data.text || data.payload?.text
                    if (txt) {
                      setTranscripts((prev) => [
                        ...prev,
                        {
                          id: "sarvam-live-text-" + Date.now(),
                          speaker: "sarvam",
                          text: txt,
                          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        },
                      ])
                    }
                  }

                  // Handle user interrupt or utterance completion
                  if (data?.type === "server.event.user_interrupt") {
                    audioInterfaceRef.current?.interrupt()
                    setIsSpeaking(false)
                    setSarvamStatus("listening")
                  } else if (data?.status === "completed") {
                    setIsSpeaking(false)
                    setSarvamStatus("listening")
                  } else if (data?.type === "server.action.interaction_end") {
                    await stopLiveSession()
                    setIsListening(false)
                    setSarvamStatus("idle")
                  }
                } catch (e) {
                  console.warn("Sarvam WS message processing:", e)
                }
              }

              ws.onclose = () => {
                setLiveSessionActive(false)
                setConnectionState("ready")
                activeWsRef.current = null
                if (audioInterfaceRef.current) {
                  audioInterfaceRef.current.stop().catch(() => {})
                  audioInterfaceRef.current = null
                }
                setIsListening(false)
                setSarvamStatus("idle")
              }

              ws.onerror = (err) => {
                console.warn("Sarvam Live Voice AI notice:", err)
                setLiveSessionActive(false)
                setConnectionState("ready")
              }
            } catch (err) {
              console.warn("Could not establish Sarvam live voice connection:", err)
              setConnectionState("ready")
            }
          }
        }

        // 2. Also start speech recognition if available for local transcription UI
        if (recognitionRef.current) {
          try {
            recognitionRef.current.lang = selectedLanguage
            recognitionRef.current.start()
          } catch {}
        }
        setIsListening(true)
        setSarvamStatus("listening")
      } catch (err: any) {
        console.error("Failed to start voice interrogation:", err)
        setConnectionState("failed")
        setIsListening(false)
        setSarvamStatus("idle")
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
        language: repoData?.primaryLanguage,
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

  // Handle Starting Over Speech and Conversation
  const handleStartOver = () => {
    stopSpeaking()
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    stopLiveSession().catch(() => {})
    setIsListening(false)
    setInterimText("")
    setLiveSessionActive(false)
    setSarvamStatus("idle")
    setTextQueryInput("")
    setTranscripts([
      {
        id: "init-" + Date.now(),
        speaker: "sarvam",
        text: `Sarvam Voice AI Agent online for repository "${currentRepo}". Tap the microphone to speak your question or instruction.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ])
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

          <button
            className="sarvam-start-over-btn"
            onClick={handleStartOver}
            type="button"
            title="Start Over Speech & Reset Transcripts"
          >
            🔄 Start Over
          </button>

          <div className="sarvam-engine-status">
            <span className="sarvam-engine-label">Engine:</span>
            <span
              className={`sarvam-engine-badge ${connectionState === "connected" ? "connected-pulse" : ""}`}
              title={
                connectionState === "connected"
                  ? "Live Sarvam Indus WebSocket Stream Active"
                  : connectionState === "connecting"
                  ? "Connecting to Sarvam Indus Session..."
                  : connectionState === "ready"
                  ? "Sarvam Indus Configured & Ready"
                  : connectionState === "unconfigured"
                  ? "Sarvam API Key Unconfigured in backend/.env"
                  : "Sarvam Voice Connection Error"
              }
            >
              {connectionState === "connected"
                ? "🟢 Sarvam Indus Live"
                : connectionState === "connecting"
                ? "🟡 Connecting..."
                : connectionState === "ready"
                ? "Sarvam Indus Connected"
                : connectionState === "unconfigured"
                ? "Sarvam Unconfigured"
                : "🔴 Connection Failed"}
            </span>
          </div>
        </div>
      </header>

      {/* Audio Permission / Connection Error Banner */}
      {errorMessage && (
        <div className="chat-speech-error-banner" style={{ margin: "0 24px 16px 24px", borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.15)" }}>
          <span style={{ color: "#fca5a5" }}>?? {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} type="button">?</button>
        </div>
      )}

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
