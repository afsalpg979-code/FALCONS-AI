const API_BASE = localStorage.getItem("falcons_api_base") || "http://localhost:3000/api";

const messages = document.getElementById("messages");
const composer = document.getElementById("composer");
const promptInput = document.getElementById("prompt");
const typing = document.getElementById("typing");
const clock = document.getElementById("clock");
const sidebar = document.getElementById("sidebar");
const workspace = document.getElementById("workspace");
const workspaceTitle = document.getElementById("workspaceTitle");
const workspaceBody = document.getElementById("workspaceBody");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");

let currentConversationId = localStorage.getItem("falcons_conversation_id") || null;

function updateClock() {
  clock.textContent = new Date().toLocaleTimeString([], { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

function addMessage(text, type = "ai", time = "JUST NOW") {
  const wrap = document.createElement("div");
  wrap.className = "message " + type;
  wrap.innerHTML = `
    <div class="msg-avatar">${type === "ai" ? "F" : "YOU"}</div>
    <div class="bubble">
      <div class="msg-meta">${type === "ai" ? "FALCONS" : "USER"} <span>${time}</span></div>
      <p></p>
    </div>`;
  wrap.querySelector("p").textContent = text;
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}

function clearMessages() {
  messages.innerHTML = "";
}

function localDemoResponse(input) {
  const q = input.toLowerCase();
  if (q.includes("what can you do")) return "FALCONS is ready for chat, memory, files, voice, and tools. Connect the backend and AI key to activate real intelligence.";
  if (q.includes("analyze")) return "Analysis channel initialized. The real AI engine will process your request once the backend is configured.";
  if (q.includes("write") || q.includes("create")) return "Creation module ready. The backend will connect this interface to the AI model.";
  if (q.includes("plan")) return "Planning module ready. Give me a goal and FALCONS can turn it into a structured plan.";
  return "Command received. The FALCONS interface is operational. Configure the backend for a real AI response.";
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `API error ${response.status}`);
  return data;
}

async function createConversation() {
  const data = await api("/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "New FALCONS Session" })
  });
  currentConversationId = data.conversation.id;
  localStorage.setItem("falcons_conversation_id", currentConversationId);
  return data.conversation;
}

async function loadConversations() {
  const list = document.getElementById("conversationList");
  if (!list) return;
  try {
    const data = await api("/conversations");
    list.innerHTML = "";
    if (!data.conversations.length) {
      list.innerHTML = '<div class="empty-state">No saved conversations yet.</div>';
      return;
    }
    data.conversations.forEach((conversation) => {
      const button = document.createElement("button");
      button.className = "conversation-item" + (conversation.id === currentConversationId ? " active" : "");
      button.textContent = conversation.title || "Untitled session";
      button.addEventListener("click", () => loadConversation(conversation.id));
      list.appendChild(button);
    });
  } catch (_) {
    list.innerHTML = '<div class="empty-state">Backend offline. Start the Node server.</div>';
  }
}

async function loadConversation(id) {
  try {
    const data = await api(`/conversations/${id}/messages`);
    currentConversationId = id;
    localStorage.setItem("falcons_conversation_id", id);
    clearMessages();
    data.messages.forEach((m) => addMessage(
      m.content,
      m.role === "user" ? "user" : "ai",
      new Date(m.created_at).toLocaleTimeString([], { hour12: false })
    ));
    closeWorkspace();
  } catch (error) {
    addMessage(error.message, "ai");
  }
}

async function sendMessage(text) {
  if (!currentConversationId) await createConversation();
  typing.classList.add("show");
  try {
    const data = await api("/chat", {
      method: "POST",
      body: JSON.stringify({ conversationId: currentConversationId, message: text })
    });
    typing.classList.remove("show");
    addMessage(data.message.content, "ai");
    await loadConversations();
  } catch (error) {
    typing.classList.remove("show");
    if (error.message.includes("Failed to fetch")) {
      addMessage(localDemoResponse(text), "ai");
    } else {
      addMessage(`FALCONS backend: ${error.message}`, "ai");
    }
  }
}

composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = promptInput.value.trim();
  if (!text) return;
  addMessage(text, "user");
  promptInput.value = "";
  await sendMessage(text);
});

document.querySelectorAll(".quick-card").forEach((card) => {
  card.addEventListener("click", () => {
    promptInput.value = card.dataset.prompt || "";
    promptInput.focus();
  });
});

document.getElementById("newChat").addEventListener("click", async () => {
  try {
    await createConversation();
    clearMessages();
    addMessage("New session initialized. FALCONS is ready for your command.", "ai");
  } catch (_) {
    currentConversationId = null;
    localStorage.removeItem("falcons_conversation_id");
    clearMessages();
    addMessage("New local session initialized. Start the backend to save conversations.", "ai");
  }
});

document.getElementById("menuBtn").addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

function openWorkspace(title, html) {
  workspaceTitle.textContent = title;
  workspaceBody.innerHTML = html;
  workspace.classList.add("open");
}
function closeWorkspace() {
  workspace.classList.remove("open");
}
document.getElementById("workspaceClose").addEventListener("click", closeWorkspace);

const sideActions = {
  Conversations: () => openWorkspace("CONVERSATIONS", '<div id="conversationList" class="conversation-list"></div>'),
  Files: () => openWorkspace("FILES", '<div class="file-panel"><p>File workspace is ready for the next file-processing stage.</p><label class="file-select"><input id="panelFileInput" type="file" multiple> SELECT FILES</label><div id="panelFileList" class="file-list"></div></div>'),
  Settings: () => openWorkspace("SETTINGS", `<div class="settings-panel"><label><span>API endpoint</span><input id="apiEndpoint" value="${API_BASE}"></label><label class="switch-row"><span>Voice input</span><input id="voiceEnabled" type="checkbox" checked></label><button id="saveSettings" class="settings-save">SAVE SETTINGS</button></div>`)
};

document.querySelectorAll(".side-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".side-item").forEach((x) => x.classList.remove("active"));
    item.classList.add("active");
    const label = item.textContent.trim().split(/\s+/).slice(1).join(" ");
    const action = sideActions[label];
    if (action) {
      action();
      if (label === "Conversations") loadConversations();
    }
    sidebar.classList.remove("open");
  });
});

document.getElementById("notificationBtn").addEventListener("click", () => {
  openWorkspace("SYSTEM STATUS", '<div class="system-panel"><div class="system-line"><span>Frontend</span><b>ONLINE</b></div><div class="system-line"><span>Backend</span><b id="backendStatus">CHECKING...</b></div><div class="system-line"><span>AI Engine</span><b id="aiStatus">CHECKING...</b></div><p>FALCONS keeps secrets server-side. Never place API keys in frontend JavaScript.</p></div>');
  api("/health").then((data) => {
    document.getElementById("backendStatus").textContent = "ONLINE";
    document.getElementById("aiStatus").textContent = data.aiConfigured ? "CONFIGURED" : "WAITING FOR KEY";
  }).catch(() => {
    document.getElementById("backendStatus").textContent = "OFFLINE";
    document.getElementById("aiStatus").textContent = "OFFLINE";
  });
});

document.getElementById("attachBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) {
    fileName.textContent = `${fileInput.files.length} file(s) selected — file processing arrives in Stage 6.`;
  }
});

document.getElementById("voiceBtn").addEventListener("click", () => {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    addMessage("Voice input is not supported by this browser.", "ai");
    return;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onstart = () => { promptInput.placeholder = "Listening..."; };
  recognition.onresult = (e) => { promptInput.value = e.results[0][0].transcript; };
  recognition.onerror = () => addMessage("Voice capture stopped. Please try again.", "ai");
  recognition.onend = () => { promptInput.placeholder = "Enter command or ask FALCONS anything..."; };
  recognition.start();
});

document.addEventListener("click", (e) => {
  if (e.target.id === "saveSettings") {
    const endpoint = document.getElementById("apiEndpoint").value.trim().replace(//$/, "");
    localStorage.setItem("falcons_api_base", endpoint || "http://localhost:3000/api");
    closeWorkspace();
    addMessage("Settings saved. Reload the page to apply the new API endpoint.", "ai");
  }
  if (e.target.id === "panelFileInput") {
    e.target.addEventListener("change", () => {
      const list = document.getElementById("panelFileList");
      list.innerHTML = Array.from(e.target.files).map(f => `<div>${f.name}</div>`).join("");
    }, { once: true });
  }
});

loadConversations();