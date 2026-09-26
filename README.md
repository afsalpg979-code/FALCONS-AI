# FALCONS AI

Futuristic JARVIS-inspired AI assistant.

## Current build

### Stages 1–5 — Core platform
- Futuristic command center
- Animated AI core
- Responsive desktop/mobile UI
- Quick actions and browser voice input
- Node.js + Express backend
- OpenAI Responses API integration
- SQLite conversations and message memory

### Stage 6 — PDF / image / document intelligence
- Authenticated file uploads
- PDF analysis
- DOCX analysis
- PPTX analysis
- XLSX analysis
- TXT / Markdown / CSV / JSON analysis
- Image understanding for PNG / JPG / WEBP / GIF
- Custom question per uploaded file
- File-analysis history stored per user
- Upload size controls and extension/MIME validation
- Private file processing through the backend

OpenAI Responses API file and image inputs are used for multimodal analysis.

### Stage 8 — Web + external tools
- Server-side calculator
- Live weather through Open-Meteo
- Web search through Tavily when `TAVILY_API_KEY` is configured
- Current time by IANA timezone
- Unit conversion
- HTTPS JSON GET for configured API hosts
- Authenticated tool execution
- Chat commands:
  - `/calc 12*(5+2)`
  - `/weather Kochi`
  - `/search latest technology news`
  - `/time Asia/Kolkata`
  - `/convert 10 km m`
  - `/api https://api.github.com/repos/afsalpg979-code/FALCONS-AI`

### Stage 9 — User system
- Signup
- Login
- Logout
- HTTP-only authentication cookie
- User profile with name and bio
- Private conversations
- User-owned conversation memory
- bcrypt password hashing
- Protected tools

### Stage 10 — Advanced long-term assistant
- Persistent user memories with importance
- Memory search
- Memory create/delete management
- Memory context injected into AI conversations
- Conversation summaries stored per user
- Chat commands:
  - `/remember <fact>`
  - `/memories`
  - `/forget <memory_id>`
  - `/summarize`
- Dedicated Memory workspace in the frontend
- Dedicated Files workspace in the frontend

## Structure

```
FALCONS-AI/
├── frontend/
│   ├── index.html
│   └── assets/
│       ├── css/style.css
│       └── js/app.js
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── database/database.js
│   ├── middleware/auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── conversations.js
│   │   ├── files.js
│   │   ├── memory.js
│   │   └── tools.js
│   ├── services/
│   │   ├── aiService.js
│   │   ├── fileService.js
│   │   └── toolService.js
│   └── data/
├── .gitignore
└── README.md
```

## Run backend in VS Code

```
cd backend
npm install
copy .env.example .env
```

Edit `backend/.env`:

```
HOST=127.0.0.1
PORT=3000
JWT_SECRET=replace_with_a_long_random_secret
MAX_UPLOAD_MB=8
MEMORY_LIMIT=50
```

To enable real AI:

```
OPENAI_API_KEY=your_real_key
OPENAI_MODEL=gpt-5.6-luna
```

To enable web search:

```
TAVILY_API_KEY=your_tavily_key
```

Never commit `.env`, API keys, or database files.

Start:

```
npm start
```

Expected:

```
FALCONS backend listening on http://127.0.0.1:3000
```

Health:

```
http://127.0.0.1:3000/api/health
```

## Frontend

Use VS Code Live Server and open:

```
frontend/index.html
```

The frontend uses:

```
http://127.0.0.1:3000/api
```

Authentication uses an HTTP-only cookie, so serve the frontend from one of the configured CORS origins.

## File processing

Open the **Files** workspace or use the attachment button.

Supported:

```
PDF
DOCX
PPTX
XLSX
TXT
MD
CSV
JSON
PNG
JPG / JPEG
WEBP
GIF
```

FALCONS processes file contents through the backend and stores analysis history, not the original uploaded bytes.

## Long-term memory

Use the **Memory** workspace or chat commands:

```
/remember I prefer concise answers.
/memories
/forget 3
/summarize
```

Saved memories are attached only to the signed-in user and are supplied as private context to the AI.

## Security notes

- API keys remain server-side.
- Authentication cookies are HTTP-only.
- Passwords are stored as bcrypt hashes.
- Conversations and memories are filtered by user ID.
- Uploaded files are held in memory for processing and are not written to the repository.
- Uploads require an allowed extension and matching MIME type.
- The API tool only permits HTTPS URLs on configured hosts.
- The calculator uses a dedicated parser rather than JavaScript `eval`.
- Do not expose arbitrary shell execution from the web UI.

## Next stages

7. Advanced voice
10. More autonomous assistant workflows
11. Android application
12. Production deployment
