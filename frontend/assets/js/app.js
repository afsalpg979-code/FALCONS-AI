const messages = document.getElementById("messages");
const composer = document.getElementById("composer");
const promptInput = document.getElementById("prompt");
const typing = document.getElementById("typing");
const clock = document.getElementById("clock");
const sidebar = document.getElementById("sidebar");

function updateClock() {
  clock.textContent = new Date().toLocaleTimeString([], { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

function addMessage(text, type = "ai") {
  const wrap = document.createElement("div");
  wrap.className = "message " + type;
  wrap.innerHTML = `
    <div class="msg-avatar">${type === "ai" ? "F" : "YOU"}</div>
    <div class="bubble">
      <div class="msg-meta">${type === "ai" ? "FALCONS" : "USER"} <span>JUST NOW</span></div>
      <p></p>
    </div>`;
  wrap.querySelector("p").textContent = text;
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}

function localDemoResponse(input) {
  const q = input.toLowerCase();
  if (q.includes("what can you do")) return "I’m the FALCONS interface. AI connectivity will be added in the next stage. This frontend is ready for chat, voice, files, memory, and tool integrations.";
  if (q.includes("analyze")) return "Analysis channel initialized. Connect the AI backend in the next stage to process real information.";
  if (q.includes("write") || q.includes("create")) return "Creation module ready. The next stage will connect FALCONS to an AI model for real generation.";
  if (q.includes("plan")) return "Planning module ready. Give me a goal and the AI backend can turn it into a structured plan.";
  return "Command received. FALCONS frontend is operational. AI response engine will be connected in the next build stage.";
}

composer.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = promptInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  promptInput.value = "";
  typing.classList.add("show");

  setTimeout(() => {
    typing.classList.remove("show");
    addMessage(localDemoResponse(text), "ai");
  }, 850);
});

document.querySelectorAll(".quick-card").forEach((card) => {
  card.addEventListener("click", () => {
    promptInput.value = card.dataset.prompt || "";
    promptInput.focus();
  });
});

document.getElementById("newChat").addEventListener("click", () => {
  messages.innerHTML = "";
  addMessage("New session initialized. FALCONS is ready for your command.", "ai");
});

document.getElementById("menuBtn").addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

document.getElementById("voiceBtn").addEventListener("click", () => {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    addMessage("Voice input is not supported by this browser. The voice interface is ready for a future native/Android integration.", "ai");
    return;
  }

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onstart = () => { promptInput.placeholder = "Listening..."; };
  recognition.onresult = (e) => { promptInput.value = e.results[0][0].transcript; };
  recognition.onerror = () => { addMessage("Voice capture stopped. Please try again.", "ai"); };
  recognition.onend = () => { promptInput.placeholder = "Enter command or ask FALCONS anything..."; };
  recognition.start();
});