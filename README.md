# FALCONS AI

Futuristic JARVIS-inspired AI assistant.

## Current build

### Stages 1–5 — Core platform
- Futuristic command center
- Animated AI core
- Responsive desktop/mobile UI
- Quick actions and browser voice input
- Node.js + Express backend
- OpenAI Responses API integration framework
- SQLite conversations and message memory

### Stage 6 — File workspace foundation
- Frontend file selection interface
- File processing architecture ready for PDF/image/document modules

### Stage 8 — Web + external tools
- Server-side calculator
- Live weather through Open-Meteo geocoding + forecast APIs
- Web search through Tavily when `TAVILY_API_KEY` is configured
- Current time by IANA timezone
- Unit conversion
- HTTPS JSON GET for a small allow-listed set of API hosts
- Authenticated tool execution endpoint
- Chat tool commands:
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
- User profiles with name and bio
- Private conversations tied to the signed-in user
- Legacy ownerless conversations are claimed by the first registered account
- Protected tool execution
- Password hashing with bcrypt

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
│   ├── routes/auth.js
│   ├── routes/chat.js
│   ├── routes/conversations.js
│   ├── routes/tools.js
│   ├── services/aiService.js
│   ├── services/toolService.js
│   └── data/
├── .gitignore
└── README.md
```

## Run backend in VS Code

Open the repository folder in VS Code and use the integrated terminal:

```
cd backend
npm install
copy .env.example .env
```

Edit `backend/.env` and set at least:

```
HOST=127.0.0.1
PORT=3000
JWT_SECRET=replace_with_a_long_random_secret
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

Start the backend:

```
npm start
```

Expected:

```
FALCONS backend listening on http://127.0.0.1:3000
```

Health check:

```
http://127.0.0.1:3000/api/health
```

The root URL also returns backend status:

```
http://127.0.0.1:3000/
```

## Frontend

Use VS Code Live Server and open:

```
frontend/index.html
```

The frontend talks to:

```
http://127.0.0.1:3000/api
```

Authentication uses an HTTP-only cookie, so the frontend must be served from one of the configured CORS origins.

## Security notes

- API keys stay on the backend.
- Authentication cookies are HTTP-only.
- Passwords are stored as bcrypt hashes.
- Conversations are filtered by user ID.
- The API tool only permits HTTPS URLs on configured allow-listed hosts.
- Calculator input uses a dedicated parser rather than JavaScript `eval`.
- Do not expose arbitrary shell execution from the web UI.

## External services

Weather uses Open-Meteo geocoding and forecast endpoints. Web search requires a configured Tavily API key.

## Next stages

10. Advanced assistant capabilities and long-term memory
11. Android application
12. Production deployment
