const API_BASE = localStorage.getItem("falcons_api_base") || "http://127.0.0.1:3000/api";

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
let currentUser = null;
let authMode = "login";

injectEnhancements();

function injectEnhancements() {
  const style = document.createElement("style");
  style.textContent =
    ".auth-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);z-index:100;display:none;align-items:center;justify-content:center;padding:18px}" +
    ".auth-overlay.open{display:flex}.auth-card{width:min(440px,100%);border:1px solid rgba(67,255,155,.3);background:#07100b;box-shadow:0 30px 100px rgba(0,0,0,.75);padding:24px}" +
    ".auth-mark{font-size:10px;letter-spacing:3px;color:#43ff9b;margin-bottom:9px}.auth-title{font-size:23px;margin-bottom:7px}.auth-subtitle{color:#62786b;font-size:10px;line-height:1.6;margin-bottom:18px}" +
    ".auth-tabs{display:grid;grid-template-columns:1fr 1fr;border:1px solid rgba(83,255,163,.15);margin-bottom:15px}.auth-tab{padding:10px;background:none;border:0;color:#60766a;font-size:9px;letter-spacing:1px;cursor:pointer}.auth-tab.active{color:#43ff9b;background:rgba(67,255,155,.06)}" +
    ".auth-form,.tool-form,.profile-form{display:grid;gap:10px}.auth-field{display:grid;gap:6px}.auth-field span,.profile-form label{font-size:8px;letter-spacing:1px;color:#6e8579}.auth-field input,.tool-form input,.profile-form input,.profile-form textarea{width:100%;background:#050b08;border:1px solid rgba(83,255,163,.18);color:#d9eee1;padding:11px;outline:none}" +
    ".profile-form textarea{min-height:90px;resize:vertical}.auth-submit,.tool-run,.profile-save{padding:11px 14px;border:1px solid rgba(67,255,155,.38);background:rgba(67,255,155,.07);color:#43ff9b;font-size:9px;letter-spacing:1px;cursor:pointer}.auth-status{min-height:17px;color:#e3b36c;font-size:9px;line-height:1.5}.auth-status.success{color:#43ff9b}" +
    ".auth-close{display:flex;justify-content:flex-end}.auth-close button{background:none;border:0;color:#71877b;font-size:22px;cursor:pointer}.auth-badge{border:1px solid rgba(83,255,163,.15);background:none;padding:7px 9px;color:#81968b;font-size:8px;letter-spacing:1px;cursor:pointer}" +
    ".tool-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tool-card{border:1px solid rgba(83,255,163,.15);background:#09130e;padding:13px}.tool-card h3{font-size:10px;color:#43ff9b;margin-bottom:5px}.tool-card p{font-size:8px;line-height:1.5;color:#60766a;margin-bottom:10px}.tool-result{margin-top:9px;white-space:pre-wrap;word-break:break-word;color:#b9cfc2;font-size:8px;line-height:1.55;max-height:180px;overflow:auto}" +
    ".profile-head{display:flex;gap:12px;align-items:center;margin-bottom:14px}.profile-avatar{width:46px;height:46px;border:1px solid #43ff9b;display:grid;place-items:center;color:#43ff9b;font-weight:900}.profile-head strong{display:block;font-size:12px}.profile-head span{display:block;color:#62786b;font-size:8px;margin-top:4px}.status-panel{display:grid;gap:8px}.status-line{display:flex;justify-content:space-between;border-bottom:1px solid rgba(83,255,163,.12);padding:9px 0;color:#71877b;font-size:8px}.status-line b{color:#43ff9b}" +
    "@media(max-width:600px){.tool-grid{grid-template-columns:1fr}.auth-card{padding:18px}}";
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "authOverlay";
  overlay.className = "auth-overlay";
  overlay.innerHTML =
    '<div class="auth-card"><div class="auth-close"><button id="authClose">×</button></div>' +
    '<div class="auth-mark">FALCONS IDENTITY CORE</div><div class="auth-title" id="authTitle">Sign in</div>' +
    '<div class="auth-subtitle" id="authSubtitle">Sign in to activate private conversations, memory, profiles, and protected tools.</div>' +
    '<div class="auth-tabs"><button class="auth-tab active" id="loginTab">SIGN IN</button><button class="auth-tab" id="registerTab">CREATE ACCOUNT</button></div>' +
    '<form class="auth-form" id="authForm"><div class="auth-field" id="authNameWrap" style="display:none"><span>NAME</span><input id="authName" maxlength="80" autocomplete="name"></div>' +
    '<div class="auth-field"><span>EMAIL</span><input id="authEmail" type="email" maxlength="160" autocomplete="email" required></div>' +
    '<div class="auth-field"><span>PASSWORD</span><input id="authPassword" type="password" minlength="8" maxlength="128" autocomplete="current-password" required></div>' +
    '<button class="auth-submit" type="submit" id="authSubmit">SIGN IN</button><div class="auth-status" id="authStatus"></div></form></div>';
  document.body.appendChild(overlay);

  const authTop = document.createElement("button");
  authTop.id = "authBadge";
  authTop.className = "auth-badge";
  authTop.textContent = "SIGN IN";
  document.querySelector(".top-actions")?.prepend(authTop);

  const toolsNav = document.createElement("button");
  toolsNav.className = "side-item";
  toolsNav.innerHTML = "<span>⚡</span> Tools";
  const nav = document.querySelector(".sidebar nav");
  const memoryNav = document.createElement("button");
  memoryNav.className = "side-item";
  memoryNav.innerHTML = "<span>◈</span> Memory";

  const settingsItem = Array.from(document.querySelectorAll(".side-item")).find(function(item) {
    return item.textContent.includes("Settings");
  });

  if (nav && settingsItem) {
    nav.insertBefore(toolsNav, settingsItem);
    nav.insertBefore(memoryNav, settingsItem);
  }

  bindAuthUI(authTop, toolsNav, memoryNav);
}

function bindAuthUI(authTop, toolsNav, memoryNav) {
  const overlay = document.getElementById("authOverlay");
  document.getElementById("authClose").addEventListener("click", function() {
    overlay.classList.remove("open");
  });
  document.getElementById("loginTab").addEventListener("click", function() { setAuthMode("login"); });
  document.getElementById("registerTab").addEventListener("click", function() { setAuthMode("register"); });

  authTop.addEventListener("click", function() {
    if (currentUser) logout();
    else openAuth("login");
  });

  document.getElementById("authForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    const status = document.getElementById("authStatus");
    status.classList.remove("success");
    status.textContent = "PROCESSING...";

    try {
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const body = {
        email: document.getElementById("authEmail").value.trim(),
        password: document.getElementById("authPassword").value
      };
      if (authMode === "register") body.name = document.getElementById("authName").value.trim();

      const data = await api(path, { method: "POST", body: JSON.stringify(body) });
      currentUser = data.user;
      status.textContent = "IDENTITY VERIFIED.";
      status.classList.add("success");
      updateUserUI();
      currentConversationId = null;
      localStorage.removeItem("falcons_conversation_id");
      clearMessages();
      addMessage("Identity verified. Private FALCONS memory is now active.", "ai");
      await loadConversations();
      setTimeout(function() { overlay.classList.remove("open"); }, 250);
    } catch (error) {
      status.textContent = error.message;
    }
  });

  toolsNav.addEventListener("click", function() {
    document.querySelectorAll(".side-item").forEach(function(x) { x.classList.remove("active"); });
    toolsNav.classList.add("active");
    sidebar.classList.remove("open");
    if (!currentUser) return openAuth("login");
    openToolsWorkspace();
  });

  memoryNav.addEventListener("click", function() {
    document.querySelectorAll(".side-item").forEach(function(x) { x.classList.remove("active"); });
    memoryNav.classList.add("active");
    sidebar.classList.remove("open");
    if (!currentUser) return openAuth("login");
    openMemoryWorkspace();
  });
}

function setAuthMode(mode) {
  authMode = mode;
  const register = mode === "register";
  document.getElementById("loginTab").classList.toggle("active", !register);
  document.getElementById("registerTab").classList.toggle("active", register);
  document.getElementById("authNameWrap").style.display = register ? "grid" : "none";
  document.getElementById("authTitle").textContent = register ? "Create account" : "Sign in";
  document.getElementById("authSubtitle").textContent = register
    ? "Create a private FALCONS identity for conversations, memory, profiles, and protected tools."
    : "Sign in to activate private conversations, memory, profiles, and protected tools.";
  document.getElementById("authSubmit").textContent = register ? "CREATE ACCOUNT" : "SIGN IN";
  document.getElementById("authPassword").setAttribute("autocomplete", register ? "new-password" : "current-password");
  document.getElementById("authStatus").textContent = "";
}

function openAuth(mode) {
  setAuthMode(mode || "login");
  document.getElementById("authOverlay").classList.add("open");
}

function updateUserUI() {
  const badge = document.getElementById("authBadge");
  if (!badge) return;
  badge.textContent = currentUser ? String(currentUser.name || "ACCOUNT").toUpperCase().slice(0, 18) : "SIGN IN";
  badge.title = currentUser ? "Sign out" : "Sign in";
}

async function logout() {
  try {
    await api("/auth/logout", { method: "POST", body: JSON.stringify({}) });
  } catch (_) {}
  currentUser = null;
  currentConversationId = null;
  localStorage.removeItem("falcons_conversation_id");
  updateUserUI();
  clearMessages();
  addMessage("Signed out. Private memory is locked until the next sign-in.", "ai");
}

async function loadCurrentUser() {
  try {
    const data = await api("/auth/me");
    currentUser = data.user;
    updateUserUI();
    await loadConversations();
  } catch (_) {
    currentUser = null;
    updateUserUI();
  }
}

function updateClock() {
  clock.textContent = new Date().toLocaleTimeString([], { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

function addMessage(text, type, time) {
  const wrap = document.createElement("div");
  const messageType = type || "ai";
  wrap.className = "message " + messageType;
  wrap.innerHTML =
    '<div class="msg-avatar">' + (messageType === "ai" ? "F" : "YOU") + '</div>' +
    '<div class="bubble"><div class="msg-meta">' + (messageType === "ai" ? "FALCONS" : "USER") +
    " <span>" + (time || "JUST NOW") + '</span></div><p></p></div>';
  wrap.querySelector("p").textContent = text;
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}

function clearMessages() {
  messages.innerHTML = "";
}

async function api(path, options) {
  const opts = options || {};
  const request = Object.assign({}, opts, { credentials: "include" });

  if (opts.body instanceof FormData) {
    request.headers = opts.headers || {};
  } else {
    request.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  }

  const response = await fetch(API_BASE + path, request);
  const data = await response.json().catch(function() { return {}; });
  if (!response.ok) {
    const error = new Error(data.error || ("API error " + response.status));
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

async function createConversation() {
  if (!currentUser) throw Object.assign(new Error("Sign in to create a private conversation."), { code: "AUTH_REQUIRED" });
  const data = await api("/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "New FALCONS Session" })
  });
  currentConversationId = data.conversation.id;
  localStorage.setItem("falcons_conversation_id", String(currentConversationId));
  return data.conversation;
}

async function loadConversations() {
  const list = document.getElementById("conversationList");
  if (!list || !currentUser) return;

  try {
    const data = await api("/conversations");
    list.innerHTML = "";
    if (!data.conversations.length) {
      list.innerHTML = '<div class="empty-state">No private conversations yet.</div>';
      return;
    }

    data.conversations.forEach(function(conversation) {
      const button = document.createElement("button");
      button.className = "conversation-item" + (String(conversation.id) === String(currentConversationId) ? " active" : "");
      button.textContent = conversation.title || "Untitled session";
      button.addEventListener("click", function() { loadConversation(conversation.id); });
      list.appendChild(button);
    });
  } catch (error) {
    list.innerHTML = '<div class="empty-state"></div>';
    list.querySelector(".empty-state").textContent = error.message;
  }
}

async function loadConversation(id) {
  try {
    if (!currentUser) return openAuth("login");
    const data = await api("/conversations/" + id + "/messages");
    currentConversationId = id;
    localStorage.setItem("falcons_conversation_id", String(id));
    clearMessages();

    data.messages.forEach(function(message) {
      addMessage(
        message.content,
        message.role === "user" ? "user" : "ai",
        new Date(message.created_at).toLocaleTimeString([], { hour12: false })
      );
    });
    closeWorkspace();
  } catch (error) {
    if (error.status === 401) openAuth("login");
    else addMessage(error.message, "ai");
  }
}

async function sendMessage(text) {
  if (!currentUser) {
    openAuth("login");
    return;
  }

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
    if (error.status === 401) {
      currentUser = null;
      updateUserUI();
      openAuth("login");
    } else {
      addMessage("FALCONS: " + error.message, "ai");
    }
  }
}

composer.addEventListener("submit", async function(event) {
  event.preventDefault();
  const text = promptInput.value.trim();
  if (!text) return;
  addMessage(text, "user");
  promptInput.value = "";
  await sendMessage(text);
});

document.querySelectorAll(".quick-card").forEach(function(card) {
  card.addEventListener("click", function() {
    promptInput.value = card.dataset.prompt || "";
    promptInput.focus();
  });
});

document.getElementById("newChat").addEventListener("click", async function() {
  try {
    await createConversation();
    clearMessages();
    addMessage("New private session initialized. FALCONS is ready for your command.", "ai");
  } catch (error) {
    if (error.code === "AUTH_REQUIRED") openAuth("login");
    else addMessage(error.message, "ai");
  }
});

document.getElementById("menuBtn").addEventListener("click", function() {
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
  Conversations: function() {
    openWorkspace("CONVERSATIONS", '<div id="conversationList" class="conversation-list"></div>');
  },
  Files: function() {
    openFilesWorkspace();
  },
  Settings: function() {
    openSettingsWorkspace();
  }
};

document.querySelectorAll(".side-item").forEach(function(item) {
  item.addEventListener("click", function() {
    document.querySelectorAll(".side-item").forEach(function(x) { x.classList.remove("active"); });
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

function openSettingsWorkspace() {
  if (!currentUser) return openAuth("login");

  openWorkspace("PROFILE + SETTINGS",
    '<div class="profile-head"><div class="profile-avatar" id="profileAvatar"></div><div><strong id="profileHeadName"></strong><span id="profileHeadEmail"></span></div></div>' +
    '<div class="profile-form"><label>NAME<input id="profileName" maxlength="80"></label><label>BIO<textarea id="profileBio" maxlength="400"></textarea></label><button id="profileSave" class="profile-save">SAVE PROFILE</button></div>' +
    '<div class="profile-form" style="margin-top:14px"><label>API ENDPOINT<input id="apiEndpoint"></label><button id="settingsSave" class="profile-save">SAVE API SETTINGS</button></div>' +
    '<div class="status-panel" style="margin-top:14px"><div class="status-line"><span>IDENTITY</span><b>VERIFIED</b></div><div class="status-line"><span>PRIVATE MEMORY</span><b>ACTIVE</b></div></div>' +
    '<button id="logoutFromSettings" class="auth-submit" style="margin-top:14px">SIGN OUT</button>'
  );

  document.getElementById("profileAvatar").textContent = String(currentUser.name || "F").charAt(0).toUpperCase();
  document.getElementById("profileHeadName").textContent = currentUser.name || "";
  document.getElementById("profileHeadEmail").textContent = currentUser.email || "";
  document.getElementById("profileName").value = currentUser.name || "";
  document.getElementById("profileBio").value = currentUser.bio || "";
  document.getElementById("apiEndpoint").value = API_BASE;
}

async function openMemoryWorkspace() {
  openWorkspace(
    "LONG-TERM MEMORY",
    '<div class="profile-form">' +
      '<label>MEMORY / FACT<input id="memoryContent" maxlength="1000" placeholder="Example: I prefer concise answers."></label>' +
      '<label>IMPORTANCE<select id="memoryImportance"><option value="1">1 — Low</option><option value="2">2</option><option value="3" selected>3 — Normal</option><option value="4">4</option><option value="5">5 — High</option></select></label>' +
      '<button id="memorySave" class="profile-save">SAVE MEMORY</button>' +
    '</div>' +
    '<div class="status-panel" style="margin-top:14px"><div class="status-line"><span>CURRENT CHAT SUMMARY</span><b>' +
      (currentConversationId ? "AVAILABLE" : "START A CHAT") +
    '</b></div></div>' +
    '<button id="summarySave" class="profile-save" style="margin-top:10px">SUMMARIZE CURRENT CHAT</button>' +
    '<div id="memoryList" class="conversation-list" style="margin-top:14px"></div>'
  );

  await loadMemoryList();
}

async function loadMemoryList() {
  const list = document.getElementById("memoryList");
  if (!list) return;

  try {
    const data = await api("/memory");
    list.innerHTML = "";

    if (!data.memories.length) {
      list.textContent = "No long-term memories saved.";
      return;
    }

    data.memories.forEach(function(memory) {
      const item = document.createElement("div");
      item.className = "conversation-item";
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.gap = "10px";

      const text = document.createElement("span");
      text.textContent = "#" + memory.id + " [" + memory.memory_type + "] " + memory.content;
      item.appendChild(text);

      const remove = document.createElement("button");
      remove.className = "auth-badge";
      remove.textContent = "DELETE";
      remove.addEventListener("click", async function() {
        try {
          await api("/memory/" + memory.id, { method: "DELETE" });
          await loadMemoryList();
        } catch (error) {
          addMessage(error.message, "ai");
        }
      });

      item.appendChild(remove);
      list.appendChild(item);
    });
  } catch (error) {
    list.textContent = error.message;
  }
}

function openToolsWorkspace() {
  openWorkspace("FALCONS TOOLS",
    '<div class="tool-grid">' +
    '<div class="tool-card"><h3>CALCULATOR</h3><p>Safe arithmetic.</p><form class="tool-form" id="calculatorForm"><input id="calcExpression" placeholder="(12 + 8) * 3"><button class="tool-run">RUN</button></form><div class="tool-result" id="calculatorResult"></div></div>' +
    '<div class="tool-card"><h3>WEATHER</h3><p>Current conditions from Open-Meteo.</p><form class="tool-form" id="weatherForm"><input id="weatherLocation" placeholder="Kochi"><button class="tool-run">RUN</button></form><div class="tool-result" id="weatherResult"></div></div>' +
    '<div class="tool-card"><h3>WEB SEARCH</h3><p>Server-side web search.</p><form class="tool-form" id="searchForm"><input id="searchQuery" placeholder="Latest technology news"><button class="tool-run">RUN</button></form><div class="tool-result" id="searchResult"></div></div>' +
    '<div class="tool-card"><h3>CURRENT TIME</h3><p>IANA timezone.</p><form class="tool-form" id="timeForm"><input id="timeZone" value="Asia/Kolkata"><button class="tool-run">RUN</button></form><div class="tool-result" id="timeResult"></div></div>' +
    '<div class="tool-card"><h3>UNIT CONVERTER</h3><p>Length, weight, temperature.</p><form class="tool-form" id="convertForm"><input id="convertValue" placeholder="10"><input id="convertFrom" placeholder="km"><input id="convertTo" placeholder="m"><button class="tool-run">RUN</button></form><div class="tool-result" id="convertResult"></div></div>' +
    '<div class="tool-card"><h3>PUBLIC API</h3><p>Allow-listed HTTPS JSON APIs.</p><form class="tool-form" id="apiGetForm"><input id="apiGetUrl" placeholder="https://api.github.com/repos/..."><button class="tool-run">RUN</button></form><div class="tool-result" id="apiGetResult"></div></div>' +
    '</div>'
  );

  bindToolForm("calculatorForm", "calculator", function() {
    return { expression: document.getElementById("calcExpression").value };
  }, "calculatorResult");

  bindToolForm("weatherForm", "weather", function() {
    return { location: document.getElementById("weatherLocation").value };
  }, "weatherResult");

  bindToolForm("searchForm", "web_search", function() {
    return { query: document.getElementById("searchQuery").value };
  }, "searchResult");

  bindToolForm("timeForm", "current_time", function() {
    return { timeZone: document.getElementById("timeZone").value };
  }, "timeResult");

  bindToolForm("convertForm", "unit_convert", function() {
    return {
      value: document.getElementById("convertValue").value,
      from: document.getElementById("convertFrom").value,
      to: document.getElementById("convertTo").value
    };
  }, "convertResult");

  bindToolForm("apiGetForm", "api_get", function() {
    return { url: document.getElementById("apiGetUrl").value };
  }, "apiGetResult");
}

async function analyzeFile(file) {
  typing.classList.add("show");
  try {
    const form = new FormData();
    form.append("file", file);
    form.append(
      "question",
      promptInput.value.trim() || "Analyze this file and provide a clear summary, important details, and useful next steps."
    );

    const data = await api("/files/analyze", {
      method: "POST",
      body: form
    });

    addMessage("FILE: " + file.name + "\n\n" + data.analysis.result, "ai");
    fileName.textContent = file.name + " analyzed successfully.";
  } catch (error) {
    addMessage("FILE PROCESSING: " + error.message, "ai");
  } finally {
    typing.classList.remove("show");
  }
}

function openFilesWorkspace() {
  openWorkspace(
    "FILES + DOCUMENT INTELLIGENCE",
    '<div class="file-panel">' +
      '<p>Upload PDF, DOCX, TXT, Markdown, CSV, JSON, PNG, JPG, WEBP, or GIF files. FALCONS sends the selected file to the backend for AI analysis.</p>' +
      '<label class="file-select"><input id="panelFileInput" type="file" accept=".pdf,.docx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,.gif" multiple> SELECT FILES</label>' +
      '<div id="panelFileList" class="file-list"></div>' +
    '</div>'
  );

  const input = document.getElementById("panelFileInput");
  input.addEventListener("change", async function() {
    if (!currentUser || !input.files.length) return;
    const list = document.getElementById("panelFileList");
    list.textContent = "PROCESSING " + input.files.length + " FILE(S)...";

    for (const file of Array.from(input.files)) {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("question", promptInput.value.trim() || "Analyze this file and provide a clear summary, important details, and useful next steps.");
        const data = await api("/files/analyze", { method: "POST", body: form });

        const item = document.createElement("div");
        item.textContent = file.name + " — COMPLETE";
        list.appendChild(item);
        addMessage("FILE: " + file.name + "\n\n" + data.analysis.result, "ai");
      } catch (error) {
        const item = document.createElement("div");
        item.textContent = file.name + " — " + error.message;
        list.appendChild(item);
      }
    }
  });
}

async function loadFileHistory() {
  const list = document.getElementById("fileHistory");
  if (!list) return;

  try {
    const data = await api("/files/history");
    list.innerHTML = "";

    if (!data.analyses.length) {
      list.textContent = "No previous file analyses.";
      return;
    }

    data.analyses.forEach(function(analysis) {
      const item = document.createElement("div");
      item.className = "conversation-item";
      item.textContent = analysis.filename + " — " + new Date(analysis.created_at).toLocaleString();
      item.addEventListener("click", function() {
        addMessage("Previous file analysis: " + analysis.filename + "\n\n" + analysis.result, "ai");
        closeWorkspace();
      });
      list.appendChild(item);
    });
  } catch (error) {
    list.textContent = error.message;
  }
}

function bindToolForm(formId, name, getInput, resultId) {
  document.getElementById(formId).addEventListener("submit", async function(event) {
    event.preventDefault();
    const result = document.getElementById(resultId);
    result.textContent = "RUNNING...";

    try {
      const data = await api("/tools/run", {
        method: "POST",
        body: JSON.stringify({ name: name, input: getInput() })
      });
      result.textContent = formatToolDisplay(name, data.result);
    } catch (error) {
      if (error.status === 401) openAuth("login");
      result.textContent = error.message;
    }
  });
}

function formatToolDisplay(name, result) {
  if (name === "calculator") return String(result.result);
  if (name === "current_time") return result.timeZone + "\n" + result.local;
  if (name === "unit_convert") return result.value + " " + result.from + " = " + result.result + " " + result.to;
  if (name === "weather") {
    const current = result.current || {};
    const units = result.units || {};
    return [
      result.location,
      "Temperature: " + current.temperature_2m + " " + (units.temperature_2m || "°C"),
      "Feels like: " + current.apparent_temperature + " " + (units.apparent_temperature || "°C"),
      "Humidity: " + current.relative_humidity_2m + "%",
      "Wind: " + current.wind_speed_10m + " " + (units.wind_speed_10m || "km/h")
    ].join("\n");
  }
  if (name === "web_search") {
    const lines = result.answer ? ["Answer: " + result.answer] : [];
    (result.results || []).forEach(function(item, index) {
      lines.push((index + 1) + ". " + item.title + "\n" + item.url);
    });
    return lines.join("\n\n") || "No results.";
  }
  return JSON.stringify(result, null, 2);
}

document.getElementById("notificationBtn").addEventListener("click", async function() {
  openWorkspace("SYSTEM STATUS",
    '<div class="status-panel"><div class="status-line"><span>Frontend</span><b>ONLINE</b></div>' +
    '<div class="status-line"><span>Backend</span><b id="backendStatus">CHECKING...</b></div>' +
    '<div class="status-line"><span>AI Engine</span><b id="aiStatus">CHECKING...</b></div>' +
    '<div class="status-line"><span>Authentication</span><b id="authStatusPanel">CHECKING...</b></div></div>'
  );

  try {
    const data = await api("/health");
    document.getElementById("backendStatus").textContent = "ONLINE";
    document.getElementById("aiStatus").textContent = data.aiConfigured ? "CONFIGURED" : "WAITING";
    document.getElementById("authStatusPanel").textContent = data.authConfigured ? "CONFIGURED" : "SETUP REQUIRED";
  } catch (_) {
    document.getElementById("backendStatus").textContent = "OFFLINE";
    document.getElementById("aiStatus").textContent = "OFFLINE";
    document.getElementById("authStatusPanel").textContent = "OFFLINE";
  }
});

document.getElementById("attachBtn").addEventListener("click", function() {
  fileInput.click();
});

fileInput.addEventListener("change", async function() {
  if (!fileInput.files.length) return;
  fileName.textContent = fileInput.files.length + " file(s) selected.";
  if (!currentUser) return openAuth("login");

  for (const file of Array.from(fileInput.files)) {
    await analyzeFile(file);
  }

  fileInput.value = "";
});

document.getElementById("voiceBtn").addEventListener("click", function() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return addMessage("Voice input is not supported by this browser.", "ai");
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onstart = function() { promptInput.placeholder = "Listening..."; };
  recognition.onresult = function(event) { promptInput.value = event.results[0][0].transcript; };
  recognition.onerror = function() { addMessage("Voice capture stopped. Please try again.", "ai"); };
  recognition.onend = function() { promptInput.placeholder = "Enter command or ask FALCONS anything..."; };
  recognition.start();
});

document.addEventListener("click", async function(event) {
  if (event.target.id === "memorySave") {
    try {
      const data = await api("/memory", {
        method: "POST",
        body: JSON.stringify({
          content: document.getElementById("memoryContent").value.trim(),
          importance: Number(document.getElementById("memoryImportance").value)
        })
      });
      document.getElementById("memoryContent").value = "";
      addMessage("Long-term memory saved: #" + data.memory.id, "ai");
      await loadMemoryList();
    } catch (error) {
      addMessage(error.message, "ai");
    }
  }

  if (event.target.id === "summarySave") {
    if (!currentConversationId) {
      addMessage("Start a conversation before creating a summary.", "ai");
      return;
    }
    try {
      const data = await api("/memory/conversation/" + currentConversationId + "/summary", {
        method: "POST",
        body: JSON.stringify({})
      });
      addMessage("Conversation summary saved:\n\n" + data.summary.summary, "ai");
    } catch (error) {
      addMessage("SUMMARY: " + error.message, "ai");
    }
  }

  if (event.target.id === "profileSave") {
    try {
      const data = await api("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: document.getElementById("profileName").value.trim(),
          bio: document.getElementById("profileBio").value.trim()
        })
      });
      currentUser = data.user;
      updateUserUI();
      addMessage("Profile updated successfully.", "ai");
      closeWorkspace();
    } catch (error) {
      addMessage(error.message, "ai");
    }
  }

  if (event.target.id === "settingsSave") {
    const endpoint = document.getElementById("apiEndpoint").value.trim().replace(/\/$/, "");
    if (!endpoint) return;
    localStorage.setItem("falcons_api_base", endpoint);
    addMessage("API endpoint saved. Reload the page to apply it.", "ai");
    closeWorkspace();
  }

  if (event.target.id === "logoutFromSettings") {
    await logout();
    closeWorkspace();
  }
});

loadCurrentUser();
