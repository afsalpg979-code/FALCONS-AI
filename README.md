# FALCONS AI

Futuristic JARVIS-inspired AI assistant.

## Current build

### Stage 1 — Frontend foundation
- Futuristic command center
- Animated AI core
- Responsive desktop/mobile UI
- Quick actions
- Browser voice input

### Stage 2 — Frontend functionality
- Conversation workspace
- Session creation
- Settings workspace
- Backend/system status panel
- File-selection interface
- Persistent selected conversation ID

### Stage 3 — Node.js backend
- Express API
- Health endpoint
- Conversation endpoints
- Chat endpoint
- CORS and JSON handling

### Stage 4 — Real AI integration
- Server-side OpenAI SDK integration
- Responses API
- Model configurable through environment variables
- API key stays on the backend

### Stage 5 — Database + memory
- SQLite database
- Conversations table
- Messages table
- Conversation history
- Persistent chat sessions

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
│   ├── routes/chat.js
│   ├── routes/conversations.js
│   ├── services/aiService.js
│   └── data/
├── .gitignore
└── README.md
```

## Run backend

```
cd backend
npm install
copy .env.example .env
npm start
```

Then open `frontend/index.html` with VS Code Live Server.

The frontend expects the backend at `http://localhost:3000/api` by default.

## AI setup

Put your API key only in `backend/.env`:

```
OPENAI_API_KEY=your_real_key
OPENAI_MODEL=gpt-5.6-luna
```

Never commit `.env` or real secrets to GitHub.

## Next stages

6. File/PDF/image processing
7. Advanced voice
8. Web/API tools
9. Authentication and user profiles
10. Advanced assistant features
11. Android application
12. Production deployment
