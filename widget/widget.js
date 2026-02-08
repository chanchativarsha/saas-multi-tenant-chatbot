// This file should be placed in 'E:\Multi-tenant chatbot\static\widget.js'
(function () {
  const CLIENT_ID = document.currentScript.getAttribute("data-client");
  if (!CLIENT_ID) {
    console.error(
      "Chatter: Missing 'data-client' attribute. Chatbot will not load."
    );
    return;
  }

  // --- This is the real backend API our widget will call ---
  const API_BASE_URL = "http://127.0.0.1:8001"; // Our Django server
  const API_INTERACT_URL = `${API_BASE_URL}/api/v1/interact/`;
  // --- NEW: API Endpoint for Form Submission ---
  const API_SUBMIT_URL = `${API_BASE_URL}/api/v1/submissions/`;

  /* ----------------------------
     Styles (Updated for a professional look)
  ----------------------------- */
  const style = document.createElement("style");
  style.textContent = `
    /* Root styles for font and sizing */
    :root {
      --chat-font: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --chat-brand-gradient: linear-gradient(135deg, #007BFF, #0056b3); /* Professional Blue */
      --chat-brand-color: #007BFF;
    }

    .chatter-widget-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--chat-brand-gradient);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 28px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: transform 0.3s ease, opacity 0.3s ease;
      z-index: 9998;
      opacity: 0;
      animation: chatter-bubble-fade-in 0.5s ease 0.5s forwards;
    }
    .chatter-widget-bubble:hover { transform: scale(1.1); }
    
    @keyframes chatter-bubble-fade-in {
      from { opacity: 0; transform: scale(0.5); }
      to { opacity: 1; transform: scale(1); }
    }

    .chatter-widget-window {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 370px; /* Standard width */
      height: 600px; /* Taller for better UX */
      max-height: calc(100vh - 110px); /* Responsive height */
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 35px rgba(0,0,0,0.25);
      display: none; /* Hidden by default */
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      font-family: var(--chat-font);
      animation: chatter-slideUp 0.4s ease forwards;
    }

    @keyframes chatter-slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* --- Responsive Mobile Styles --- */
    @media (max-width: 480px) {
      .chatter-widget-window {
        width: 100%;
        height: 100%;
        max-height: 100%;
        bottom: 0;
        right: 0;
        border-radius: 0;
      }
      .chatter-widget-bubble {
        bottom: 15px;
        right: 15px;
      }
    }

    .chatter-header {
      background: var(--chat-brand-gradient);
      color: white;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 1.1rem;
    }
    .chatter-header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .chatter-header-title span {
      width: 12px;
      height: 12px;
      background: #34D399; /* Green "online" dot */
      border-radius: 50%;
      border: 2px solid white;
    }
    .chatter-close-btn {
      background:none;
      border:none;
      color:white;
      font-size:24px;
      cursor:pointer;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    .chatter-close-btn:hover { opacity: 1; }

    .chatter-body {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f3f4f6; /* Tailwind gray-100 */
    }

    .chatter-footer {
      border-top: 1px solid #e5e7eb;
      background: #fff;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .chatter-input-row {
      display: flex;
      align-items: center;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 5px 8px 5px 15px;
    }
    .chatter-input-row:focus-within {
        border-color: var(--chat-brand-color);
        box-shadow: 0 0 0 2px rgba(0,123,255,0.2);
    }

    .chatter-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 8px 10px;
      font-size: 14px;
      outline: none;
      font-family: var(--chat-font);
    }

    .chatter-send-btn {
      background: var(--chat-brand-color);
      border: none;
      color: white;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: background-color 0.3s;
    }
    .chatter-send-btn:hover { background: #0056b3; }
    .chatter-send-btn svg { width: 18px; margin-left: 2px; }

    .chatter-quick-menu {
      display: flex;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 5px;
    }

    .chatter-quick-btn {
      padding: 6px 12px;
      border-radius: 20px;
      background: #fff;
      border: 1px solid #d1d5db; /* Tailwind gray-300 */
      cursor: pointer;
      font-size: 13px;
      font-family: var(--chat-font);
      transition: 0.2s;
    }
    .chatter-quick-btn:hover { background: #f9fafb; border-color: #9ca3af; }

    .chatter-msg {
      padding: 10px 14px;
      border-radius: 16px;
      max-width: 85%;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .chatter-msg.bot { 
      background: #e5e7eb; /* Tailwind gray-200 */
      color: #1f2937; /* Tailwind gray-800 */
      align-self: flex-start; 
      border-bottom-left-radius: 4px;
    }
    .chatter-msg.user { 
      background: var(--chat-brand-color); 
      color: white; 
      align-self: flex-end; 
      border-bottom-right-radius: 4px;
    }
    .chatter-msg.typing {
      background: #e5e7eb;
      align-self: flex-start;
      font-style: italic;
      color: #6b7280; /* Tailwind gray-500 */
      padding: 10px 14px;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
    }
    .chatter-msg a {
      color: var(--chat-brand-color);
      text-decoration: underline;
    }
    
    /* --- NEW: Form Container Styles --- */
    .chatter-form-container {
      padding: 10px;
      background: #f9fafb; /* Tailwind gray-50 */
      display: none; /* Hidden by default */
      flex-direction: column;
      gap: 12px;
    }
    .chatter-form-container input,
    .chatter-form-container textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      font-family: var(--chat-font);
      box-sizing: border-box; /* Important */
    }
    .chatter-form-container textarea {
      resize: vertical;
      min-height: 80px;
    }
    .chatter-form-submit-btn {
      background: #10B981; /* Green-500 */
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    .chatter-form-submit-btn:hover {
      background: #059669; /* Green-600 */
    }
    .chatter-form-submit-btn:disabled {
      background: #9ca3af; /* Gray-400 */
      cursor: not-allowed;
    }
    .chatter-form-cancel-btn {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 13px;
      text-align: center;
      cursor: pointer;
      padding-top: 4px;
    }
    .chatter-form-cancel-btn:hover {
      text-decoration: underline;
    }
  `;
  document.head.appendChild(style);

  /* ----------------------------
     Build UI
  ----------------------------- */
  const bubble = document.createElement("div");
  bubble.id = "chat-bubble";
  bubble.className = "chatter-widget-bubble";
  bubble.innerHTML = "💬";

  const chatWindow = document.createElement("div");
  chatWindow.id = "chat-window";
  chatWindow.className = "chatter-widget-window";
  chatWindow.innerHTML = `
    <div class="chatter-header">
      <div class="chatter-header-title">
        <span></span> <!-- Online dot -->
        <div>Chat with us!</div>
      </div>
      <button id="close-chat" title="Close chat" class="chatter-close-btn">×</button>
    </div>
    <div class="chatter-body" id="chat-body">
      <!-- Welcome message will be added by chat logic -->
    </div>
    <div class="chatter-footer">
      <div class="chatter-quick-menu" id="quick-menu">
        <!-- Quick buttons will be added by chat logic -->
      </div>
      
      <!-- NEW: The Lead Capture Form (hidden by default) -->
      <div class="chatter-form-container" id="chatter-form">
        <input type="text" id="chatter-form-name" placeholder="Name" required>
        <input type="email" id="chatter-form-email" placeholder="Email" required>
        <input type="tel" id="chatter-form-phone" placeholder="Phone (Optional)">
        <textarea id="chatter-form-message" placeholder="How can we help?" required></textarea>
        <button id="chatter-form-submit" class="chatter-form-submit-btn">Send Message</button>
        <button id="chatter-form-cancel" class="chatter-form-cancel-btn">Cancel</button>
      </div>
      
      <!-- The standard chat input (visible by default) -->
      <div class="chatter-input-row" id="chatter-input-row">
        <input type="text" id="chat-input" class="chatter-input" placeholder="Type a message..." />
        <button id="chat-send" class="chatter-send-btn" title="Send message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009.5 16.571V11a1 1 0 112 0v5.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(chatWindow);

  // Get all the UI elements
  const chatBody = chatWindow.querySelector("#chat-body");
  const quickMenu = chatWindow.querySelector("#quick-menu");
  const closeBtn = chatWindow.querySelector("#close-chat");
  const input = chatWindow.querySelector("#chat-input");
  const sendBtn = chatWindow.querySelector("#chat-send");

  // --- NEW: Get Form Elements ---
  const chatInputRow = chatWindow.querySelector("#chatter-input-row");
  const formContainer = chatWindow.querySelector("#chatter-form");
  const formSubmitBtn = chatWindow.querySelector("#chatter-form-submit");
  const formCancelBtn = chatWindow.querySelector("#chatter-form-cancel");

  /* ----------------------------
     Open/Close Chat
  ----------------------------- */
  bubble.onclick = () => {
    chatWindow.style.display = "flex";
    bubble.style.display = "none";
    startChat(); // Start the chat logic
  };
  closeBtn.onclick = () => {
    chatWindow.style.display = "none";
    bubble.style.display = "flex";
  };

  /* ----------------------------
     Chat logic
  ----------------------------- */
  let chatStarted = false;

  function addMessage(who, text, isHtml = false) {
    const msg = document.createElement("div");
    msg.className = `chatter-msg ${who}`;
    if (isHtml) {
      msg.innerHTML = text;
    } else {
      msg.textContent = text;
    }
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "chatter-msg typing";
    typing.textContent = "Assistant is typing...";
    chatBody.appendChild(typing);
    chatBody.scrollTop = chatBody.scrollHeight;
    return typing;
  }

  function setQuickButtons(options = []) {
    quickMenu.innerHTML = "";
    if (!options.length) {
      quickMenu.style.display = "none";
      return;
    }

    quickMenu.style.display = "flex";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "chatter-quick-btn";
      btn.textContent = opt.text;
      btn.onclick = () => {
            addMessage("user", opt.text);
            handleInteraction("rule", opt.payload);
      };
      quickMenu.appendChild(btn);
    });
  }

  // --- NEW: Functions to show/hide the form ---
  function showChatForm() {
    formContainer.style.display = "flex";
    chatInputRow.style.display = "none";
    quickMenu.style.display = "none";
  }

  function hideChatForm() {
    formContainer.style.display = "none";
    chatInputRow.style.display = "flex";
    // We don't re-show quick menu, let the next bot response handle it
  }

  // --- NEW: Function to handle form submission ---
  async function handleFormSubmit() {
    formSubmitBtn.disabled = true;
    formSubmitBtn.textContent = "Submitting...";

    const name = document.getElementById("chatter-form-name").value;
    const email = document.getElementById("chatter-form-email").value;
    const phone = document.getElementById("chatter-form-phone").value;
    const message = document.getElementById("chatter-form-message").value;

    if (!name || !email || !message) {
      alert("Please fill out all required fields.");
      formSubmitBtn.disabled = false;
      formSubmitBtn.textContent = "Send Message";
      return;
    }

    try {
      const response = await fetch(API_SUBMIT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-ID": CLIENT_ID,
        },
        body: JSON.stringify({ name, email, phone, message }),
      });

      if (!response.ok) {
        throw new Error("Form submission failed.");
      }

      hideChatForm();
      addMessage(
        "bot",
        "Thank you! Your message has been sent. Our team will get back to you shortly."
      );
    } catch (error) {
      console.error("Form submission error:", error);
      addMessage(
        "bot",
        "Sorry, there was an error submitting your form. Please try again."
      );
    } finally {
      formSubmitBtn.disabled = false;
      formSubmitBtn.textContent = "Send Message";
    }
  }

  // --- UPDATED: Main interaction function ---
  async function handleInteraction(type, payload) {
    if (type === "text") {
      addMessage("user", payload);
    }

    input.value = "";
    setQuickButtons([]); // Hide buttons
    const typingIndicator = showTyping();

    try {
      const response = await fetch(API_INTERACT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-ID": CLIENT_ID,
        },
        body: JSON.stringify({
          type: type,
          payload: payload,
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const botResponse = await response.json();

      typingIndicator.remove();

      // Handle the bot's response based on our new backend logic
      if (botResponse.response_type === "rich" && botResponse.rich_response) {
        addMessage("bot", botResponse.rich_response.message, true);
        setQuickButtons(botResponse.rich_response.options);
      } else if (botResponse.type === "options") {
        addMessage("bot", botResponse.message, true);
        setQuickButtons(botResponse.options);
      } else if (botResponse.type === "show_form") {
        // --- THIS IS THE FIX ---
        addMessage("bot", botResponse.message, true);
        showChatForm(); // Call the new function
      } else {
        // It's a simple text response
        addMessage("bot", botResponse.answer, true);
      }
    } catch (error) {
      typingIndicator.remove();
      console.error("Chat API error:", error);
      addMessage(
        "bot",
        "Sorry, I'm having trouble connecting to the server. Please try again later."
      );
    }
  }

  function startChat() {
    if (chatStarted) return;
    chatStarted = true;
    chatBody.innerHTML = "";
    hideChatForm(); // Make sure form is hidden on start
    handleInteraction("rule", "welcome_node");
  }

  /* ----------------------------
     Event bindings
  ----------------------------- */
  sendBtn.onclick = () => {
    const text = input.value.trim();
    if (!text) return;
    handleInteraction("text", text);
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });

  // --- NEW: Form Event Listeners ---
  formSubmitBtn.onclick = handleFormSubmit;
  formCancelBtn.onclick = hideChatForm;

  console.log("Chatter Widget Initialized for:", CLIENT_ID);
})();
