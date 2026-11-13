<div align="center">

# 🕵️ RepoDetective

**Investigate GitHub repositories like a pixel-art detective.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://repodetective.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://repodetective-backend.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

RepoDetective is a retro pixel-art detective-themed GitHub repository investigation application. Drop in any public GitHub repository URL and let your pixel-art detective analyse it — exploring the codebase, generating AI-powered insights, teaching you how the code works, and letting you interact with an AI assistant in a fully immersive detective office environment.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Repository Analysis** | Paste a GitHub URL to automatically fetch and analyse repo structure, activity, and insights |
| 🤖 **AI Teaching Agent** | Gemini-powered chat that explains how the codebase works and answers your questions |
| 🗺️ **Repository Game Map** | Scrollable pixel-art map visualising the repository's file/module network |
| 🎙️ **Voice AI Agent** | Sarvam AI-powered voice assistant (speech-to-text + text-to-speech) for hands-free investigation |
| 📁 **File Explorer** | Browse and read individual files from the repository directly in the app |
| 📊 **Repository Insights** | High-level summaries covering language breakdown, contributors, commits, and architecture |
| 📝 **Case Field Notes** | Save your investigation notes per repository |
| ⚙️ **Settings** | Configure API tokens, preferences, and display options |
| 📤 **Local Repo Upload** | Upload and analyse a local repository archive |
| 📱 **Responsive Design** | Full mobile and tablet support with touch-friendly interactions |

---

## 🎨 Visual Identity

RepoDetective features a hand-crafted **pixel-art detective office** environment:

- **Page 1 — Landing:** Animated CRT code-editor preview with a pixel-art detective scene
- **Page 2 — Office Introduction:** An RPG-style dialogue scene with the Rainy Neon Detective Office background, animated detective sprite, rain overlay, lantern, and desk lamp
- **Page 3 — Dashboard:** A 3-column investigation hub with a live CRT monitor, side panels, and quick-action controls

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| [React 19](https://react.dev/) | UI framework |
| [TypeScript 5](https://www.typescriptlang.org/) | Type safety |
| [Vite 8](https://vite.dev/) | Build tool & dev server |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility classes |
| Custom CSS (~6 300 lines) | Pixel-art & CRT aesthetics, animations, responsive layout |

### Backend
| Technology | Purpose |
|---|---|
| [FastAPI](https://fastapi.tiangolo.com/) | Python REST API framework |
| [Uvicorn](https://www.uvicorn.org/) | ASGI server |
| [Pydantic / Pydantic-Settings](https://docs.pydantic.dev/) | Data validation & configuration |
| [HTTPX](https://www.python-httpx.org/) | Async HTTP client for GitHub API |
| [google-genai](https://ai.google.dev/) | Google Gemini AI SDK |

### AI & External Services
| Service | Purpose |
|---|---|
| [Google Gemini API](https://ai.google.dev/) | AI Teaching Agent, repository analysis, lesson generation |
| [Sarvam AI](https://sarvam.ai/) | Voice agent — speech-to-text (`saaras:v4`) & TTS (`bulbul:v4-flash`) |
| [GitHub REST API](https://docs.github.com/en/rest) | Repository data fetching |

### Deployment
| Service | Role |
|---|---|
| [Vercel](https://vercel.com/) | Frontend hosting |
| [Render](https://render.com/) | Backend hosting (`repodetective-backend.onrender.com`) |

---

## 🏗️ Project Architecture

```
RepoDetective/
├── frontend/                    # React + Vite application
│   ├── public/
│   │   └── images/              # Pixel-art assets (backgrounds, sprites)
│   ├── src/
│   │   ├── App.tsx              # Route / screen switching
│   │   ├── LandingExact.tsx     # Page 1 — Landing
│   │   ├── DetectiveOfficeIntro.tsx  # Page 2 — Office intro scene
│   │   ├── DetectiveDashboard.tsx    # Page 3 — Investigation dashboard
│   │   ├── DetectiveChatPage.tsx     # AI Teaching Agent chat
│   │   ├── RepositoryGameMap.tsx     # Pixel-art game map
│   │   ├── SarvamVoiceAgent.tsx      # Voice AI interface
│   │   ├── CaseBriefing.tsx          # Case briefing / repo overview
│   │   ├── PixelDetectiveSprite.tsx  # Animated detective character
│   │   ├── repoService.ts       # GitHub API integration
│   │   ├── apiConfig.ts         # Central API base URL config
│   │   ├── index.css            # Main stylesheet (global + responsive)
│   │   └── LandingExact.css     # Landing-specific styles
│   ├── .env.example             # Frontend env template
│   ├── vite.config.ts
│   └── package.json
│
└── backend/                     # FastAPI application
    ├── app/
    │   ├── main.py              # App entry point & CORS config
    │   ├── agents/              # AI agent logic
    │   │   ├── ai_teacher.py
    │   │   ├── repository_analyst.py
    │   │   └── verification_agent.py
    │   ├── api/routes/          # API route handlers
    │   │   ├── repositories.py  # Repo analysis endpoints
    │   │   ├── agents.py        # AI agent endpoints
    │   │   ├── lessons.py       # Lesson generation
    │   │   ├── sarvam.py        # Voice AI endpoints
    │   │   └── health.py        # Health check
    │   ├── services/            # Business logic & external API clients
    │   │   ├── github_service.py
    │   │   ├── gemma_service.py
    │   │   ├── lesson_service.py
    │   │   └── repository_parser.py
    │   ├── schemas/             # Pydantic request/response models
    │   └── core/
    │       ├── config.py        # App settings (pydantic-settings)
    │       └── security.py
    ├── tests/
    ├── .env.example             # Backend env template
    └── requirements.txt
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.11
- A **Google Gemini API key** — [Get one here](https://aistudio.google.com/app/apikey)
- A **GitHub Personal Access Token** — [Create one here](https://github.com/settings/tokens) *(read-only repo scope)*
- *(Optional)* **Sarvam AI** credentials for the voice agent — [sarvam.ai](https://sarvam.ai/)

---

### 1. Clone the repository

```bash
git clone https://github.com/SharonSunuGeorge/RepoDetective.git
cd RepoDetective
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env   # Windows
cp .env.example .env     # macOS / Linux
```

Edit `backend/.env`:

```env
GITHUB_TOKEN=ghp_your_token_here
GEMMA_API_KEY=your_gemini_api_key_here

# Sarvam AI Voice Agent (optional)
SARVAM_API_KEY=
SARVAM_APP_ID=
SARVAM_WORKSPACE_ID=
SARVAM_ORG_ID=
SARVAM_TTS_MODEL=bulbul:v4-flash
SARVAM_STT_MODEL=saaras:v4
SARVAM_API_BASE=https://api.sarvam.ai
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at `http://127.0.0.1:8000`.  
Interactive API docs: `http://127.0.0.1:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
copy .env.example .env   # Windows
cp .env.example .env     # macOS / Linux
```

Edit `frontend/.env`:

```env
# Point to your local backend during development
VITE_API_BASE_URL=http://127.0.0.1:8000
```

> [!NOTE]
> In production (Vercel), set `VITE_API_BASE_URL=https://repodetective-backend.onrender.com` as a Vercel environment variable. The app automatically falls back to `http://127.0.0.1:8000` if the variable is not set.

Start the dev server:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🌐 Deployment

### Frontend — Vercel

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com/) and set **Root Directory** to `frontend`.
3. Add the environment variable:
   ```
   VITE_API_BASE_URL = https://repodetective-backend.onrender.com
   ```
4. Deploy.

### Backend — Render

1. Create a new **Web Service** on [Render](https://render.com/).
2. Set **Root Directory** to `backend`.
3. Set the **Start Command** to:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
4. Add all environment variables from `backend/.env.example`.

---

## 🔌 API Reference

The backend exposes a REST API at `/api`. Full interactive docs are available at `/docs` (Swagger UI).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/repositories/analyse` | Analyse a GitHub repository |
| `GET` | `/api/repositories/file-content` | Fetch file content from a repo |
| `POST` | `/api/repositories/notes` | Save case notes |
| `POST` | `/api/repositories/ask` | Ask questions about a repository |
| `POST` | `/api/agents/teach` | AI Teaching Agent conversation |
| `POST` | `/api/lessons/generate` | Generate a learning lesson from a repo |
| `POST` | `/api/sarvam/tts` | Text-to-speech (Sarvam AI) |
| `POST` | `/api/sarvam/stt` | Speech-to-text (Sarvam AI) |

---

## 📱 Responsive Support

RepoDetective is fully responsive across all device sizes:

| Breakpoint | Range | Layout |
|---|---|---|
| Small phones | 320 – 375 px | Single-column, stacked panels, compact nav |
| Standard phones | 376 – 430 px | Single-column, mobile nav tabs |
| Large phones | 431 – 767 px | Single-column, optimised CRT view |
| Tablets | 768 – 1023 px | Adaptive multi-section layout |
| Desktop | 1024 px + | Full 3-column detective office layout |

---

## 🗂️ Image Assets

| Asset | Path | Dimensions |
|---|---|---|
| Office Background (Page 2) | `public/images/Rainy Neon Detective Office.png` | 1670 × 941 px |
| Workspace Background (Page 3) | `public/images/rainy_neon_detective_workspace.png` | 1670 × 941 px |
| Detective Idle Sprite | `public/images/repodetective_char_idle.png` | 250 × 240 px |
| Detective Blink Sprite | `public/images/repodetective_char_idle_blink.png` | 250 × 240 px |
| Standing Sprite Frames | `public/images/detective-idle-1.png` … `-4.png` | 95 × 100 px each |
| Dialogue Portrait | `public/images/detective-portrait.png` | — |

---

## 🧪 Running Tests

### Backend

```bash
cd backend
pytest
```

Test files cover: health, repositories, agents, lessons, services, and security.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please maintain the pixel-art detective visual identity and do not modify the original artwork assets.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Copyright © 2026 Sharon Sunu George

---

<div align="center">
  Made with ☕, pixels, and a whole lot of detective instinct.
</div>
