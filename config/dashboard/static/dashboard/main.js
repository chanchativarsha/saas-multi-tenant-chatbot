// Debugging started 
let flowConnections = [];
//Debugging ended        !!remove this at the time of production, if there are many search "Debugging started" using Ctrl+F

// --- GLOBAL DEBUG FLAG ---
const DEBUG = false;
let authValidated = false;

async function validateAuthToken() {
  const token = localStorage.getItem("authToken");
  if (!token) return false;
  try {
    // lightweight call to confirm token valid; use an endpoint that returns 200 if token ok
    await api.getAnalytics(); // or better: a dedicated /api/auth/verify/ endpoint
    return true;
  } catch (err) {
    // token invalid/expired -> remove it
    handleLogout(); // clears token and other items
    return false;
  }
}

window.addEventListener("load", async () => {
  // wait for token validation before first render
  authValidated = await validateAuthToken();
  renderPage();
});

// keep hashchange as before so navigation still works after initial load
window.addEventListener("hashchange", renderPage);
// --- CONFIGURATION ---
const BACKEND_BASE_URL = "http://127.0.0.1:8001";

// --- TOAST SYSTEM ---
// ============================
// TOAST HELPER
// ============================
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast-hide");
    }, 2500);

    toast.addEventListener("transitionend", () => toast.remove());
}


// ============================
// CONFIRM POPUP MODAL HELPER
// ============================
function showConfirmModal(title, message, confirmLabel = "OK", cancelLabel = "Cancel") {
    return new Promise((resolve) => {
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop fade-in";

        backdrop.innerHTML = `
        <div class="modal">
            <div class="modal-title">${title}</div>
            <div class="modal-text">${message}</div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-cancel">${cancelLabel}</button>
                <button class="modal-btn modal-btn-primary">${confirmLabel}</button>
            </div>
        </div>
        `;

        document.body.appendChild(backdrop);

        const cancelBtn = backdrop.querySelector(".modal-btn-cancel");
        const okBtn = backdrop.querySelector(".modal-btn-primary");

        function cleanup(result) {
            backdrop.classList.add("toast-hide");
            backdrop.addEventListener("transitionend", () => backdrop.remove(), { once: true });
            resolve(result);
        }

        cancelBtn.addEventListener("click", () => cleanup(false));
        okBtn.addEventListener("click", () => cleanup(true));

        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) cleanup(false);
        });
    });
}


// --- REAL API SERVICE ---
const api = {
  request: async (method, path, data = null) => {
    const authToken = localStorage.getItem("authToken");
    const clientSchemaName = localStorage.getItem("clientSchemaName");
    if (DEBUG) console.log(`[API Request] ${method} ${path}`);

    const headers = new Headers();
    headers.append("Content-Type", "application/json");

    if (authToken) {
      headers.append("Authorization", `Token ${authToken}`);
    }
    if (clientSchemaName) {
      headers.append("X-Client-ID", clientSchemaName);
    }

    const options = {
      method: method,
      headers: headers,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(BACKEND_BASE_URL + path, options);

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg =
            errData.detail ||
            errData.non_field_errors ||
            JSON.stringify(errData);
        } catch (e) {
          // Response was not JSON; keep default errorMsg
        }
        throw new Error(errorMsg);
      }

      if (response.status === 204) {
        return {};
      }

      const responseData = await response.json();
      if (DEBUG) console.log(`[API Response] ${path}:`, responseData);
      return responseData;
    } catch (err) {
      console.error("API request failed:", err.message);
      if (
        err.message.includes("401") ||
        err.message.includes("Authentication credentials")
      ) {
        handleLogout();
      }
      throw err;
    }
  },

  // --- API Methods ---
  login: (data) => api.request("POST", "/api/auth/login/", data),
  getAnalytics: () => api.request("GET", "/api/v1/analytics/summary/"),

  // FAQ Endpoints (for NLP)
  getFaqs: () => api.request("GET", "/api/v1/faqs/"),
  postFaq: (data) => api.request("POST", "/api/v1/faqs/", data),
  updateFaq: (id, data) => api.request("PUT", `/api/v1/faqs/${id}/`, data),
  deleteFaq: (id) => api.request("DELETE", `/api/v1/faqs/${id}/`),

  // ChatRule Endpoints (for Guided Flows)
  getRules: () => api.request("GET", "/api/v1/rules/"),
  getRule: (id) => api.request("GET", `/api/v1/rules/${id}/`),
  postRule: (data) => api.request("POST", "/api/v1/rules/", data),
  updateRule: (id, data) => api.request("PUT", `/api/v1/rules/${id}/`, data),
  deleteRule: (id) => api.request("DELETE", `/api/v1/rules/${id}/`),

  // Submission Endpoints
  getSubmissions: () => api.request("GET", "/api/v1/submissions/"),

  // Billing Endpoints
  getPlans: () => api.request("GET", "/api/v1/public/plans/"),
  createOrder: (planId) => api.request("POST", "/api/v1/public/create-order/", { plan_id: planId }),
};

// --- ROUTING ---
const ROUTES = {
  "#login": renderLoginPage,
  "#dashboard": renderDashboardPage,
  "#faqs": renderFAQManagement,
  "#rules": renderRuleEditor,
  "#submissions": renderSubmissionsViewer,
  "#install": renderInstallationPage,
  "#billing": renderBillingPage,
  "": renderLoginPage,
};

// --- AUTH & STATE ---
function getAuthStatus() {
  return !!localStorage.getItem("authToken")&& authValidated;
}
function navigateTo(hash) {
  window.location.hash = hash;
}
function handleLogout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("clientSchemaName");
  localStorage.removeItem("subscription");
  navigateTo("#login");
}

/**
 * Gets the saved subscription details from localStorage.
 * This is set on login.
 */
function getSubscription() {
  try {
    return JSON.parse(localStorage.getItem("subscription"));
  } catch (e) {
    return null;
  }
}

function renderNavBar() {
  if (!getAuthStatus()) return "";
  return `
        <nav class="bg-gray-800 text-white p-4 shadow-lg sticky top-0 z-10">
            <div class="max-w-7xl mx-auto flex justify-between items-center">
                <span class="text-xl font-bold tracking-tight">Client Dashboard</span>
                <div class="space-x-2 md:space-x-4 flex items-center">
                    <a href="#dashboard" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">Dashboard</a>
                    <a href="#faqs" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">FAQs (NLP)</a>
                    <a href="#rules" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">Guided Flows</a>
                    <a href="#submissions" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">Leads</a>
                    <a href="#install" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">Installation</a>
                    <a href="#billing" class="px-3 py-2 rounded-md text-sm font-medium text-yellow-300 hover:bg-gray-700 transition-colors">Billing</a>
                    <button onclick="handleLogout()" class="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded-md text-sm font-medium shadow-sm transition-transform transform hover:-translate-y-0.5">Logout</button>
                </div>
            </div>
        </nav>`;
}

function renderPage() {
  const appDiv = document.getElementById("app");
  const hash = window.location.hash || "";
  appDiv.innerHTML = renderNavBar();
  const contentDiv = document.createElement("div");
  contentDiv.className = "content-area mt-4 fade-in";
  appDiv.appendChild(contentDiv);

  if (!getAuthStatus() && hash !== "#login") {
    navigateTo("#login");
    return;
  }
  if (getAuthStatus() && hash === "#login") {
    navigateTo("#dashboard");
    return;
  }

  (ROUTES[hash] || ROUTES[""])(contentDiv);
}

// --- PAGES ---
function renderLoginPage(container) {
  container.className += " flex items-center justify-center min-h-[80vh]";
  container.innerHTML = `
        <div class="dashboard-card w-full max-w-md p-8 fade-in">
            <h2 class="text-2xl font-semibold mb-6 text-center text-gray-800">Client Dashboard Login</h2>
            <form id="login-form" class="space-y-4">
                <input id="username" placeholder="Username" required class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <input id="password" type="password" placeholder="Password" required class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-transform transform hover:-translate-y-0.5 shadow-md">Log In</button>
                <div id="login-message" class="text-red-500 text-center text-sm mt-3"></div>
            </form>
        </div>`;

  document
    .getElementById("login-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;
      const msg = document.getElementById("login-message");
      msg.textContent = "Logging in...";

      try {
        const res = await api.login({ username, password });
        console.log("LOGIN RESPONSE", res); // ← add this
      
        // adjust these field names based on the log output:
        const token = res.key || res.token || res.access || res.access_token;
        const schema = res.clientschemaname || res.clientSchemaName || res.client_schema_name;
      
        if (!token || !schema) {
          throw new Error(
            "Login successful, but missing token or schema. Please contact support."
          );
        }
      
        localStorage.setItem("authToken", token);
        localStorage.setItem("clientSchemaName", schema);
        if (res.subscription) {
          localStorage.setItem("subscription", JSON.stringify(res.subscription));
        }
      
        showToast("Welcome back! Redirecting to dashboard.", "success");
        navigateTo("#dashboard");
      } catch (err) {
        msg.textContent = err.message;
        showToast("Login failed.", "error");
      }

          });
      }

async function renderDashboardPage(container) {
  container.innerHTML = `<h2 class="text-3xl font-bold mb-6">Dashboard Home</h2><div id="analytics-container">Loading...</div>`;

  try {
    const res = await api.getAnalytics();
    const {
      totalLeadsCaptured,
      leadsCapturedToday,
      chatsStarted,
      faqsClicked,
      chatRedirects,
    } = res;

    const subscription = getSubscription();
    let statusBadge = "";
    if (subscription) {
      const badgeClass =
        subscription.status === "active"
          ? "badge-success"
          : subscription.status === "inactive"
          ? "badge-warning"
          : "badge-neutral";
      statusBadge = `<span class="badge ${badgeClass}">${subscription.status}</span>`;
    }

    const planBanner = subscription
      ? `<div class="dashboard-card p-4 mb-6 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
                   <p class="font-bold">Current Plan: ${subscription.plan_name} ${statusBadge}</p>
                   <p class="text-sm">Manage your subscription on the <a href="#billing" class="underline font-medium">Billing</a> page.</p>
               </div>`
      : `<div class="dashboard-card p-4 mb-6 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
                   <p class="font-bold">No active subscription found.</p>
                   <p class="text-sm">Please visit the <a href="#billing" class="underline font-medium">Billing</a> page to activate your plan.</p>
               </div>`;

    container.innerHTML = `
            <h2 class="text-3xl font-bold mb-6">Dashboard Home</h2>
            ${planBanner}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="dashboard-card p-6 text-center fade-in">
                    <div class="text-gray-600">Total Leads Captured</div>
                    <div class="text-4xl font-bold mt-2">${totalLeadsCaptured}</div>
                </div>
                <div class="dashboard-card p-6 text-center fade-in">
                    <div class="text-gray-600">Leads Captured Today</div>
                    <div class="text-4xl font-bold mt-2">${leadsCapturedToday}</div>
                </div>
                <div class="dashboard-card p-6 text-center fade-in">
                    <div class="text-gray-600">Total Chats Started</div>
                    <div class="text-4xl font-bold mt-2">${chatsStarted}</div>
                </div>
                <div class="dashboard-card p-6 text-center fade-in">
                    <div class="text-gray-600">Total FAQs Clicked</div>
                    <div class="text-4xl font-bold mt-2">${faqsClicked}</div>
                </div>
                <div class="dashboard-card p-6 text-center fade-in">
                    <div class="text-gray-600">Total Chat Redirects (Form submissions)</div>
                    <div class="text-4xl font-bold mt-2">${chatRedirects}</div>
                </div>
            </div>`;
  } catch (err) {
    container.innerHTML = `<h2 class="text-3xl font-bold mb-6">Dashboard Home</h2>
                                     <p class="text-red-500">Error loading dashboard: ${err.message}</p>`;
  }
}
async function renderFAQManagement(container) {
  container.innerHTML = `
    <h2 class="text-3xl font-bold mb-6">Knowledge Base (FAQs)</h2>
    <p class="text-gray-600 mb-4">Add, edit, and manage your Q&A pairs here.</p>
    
    <!-- Form Card -->
    <div class="dashboard-card p-6 mb-6">
        <form id="faq-form" class="space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="text-xl font-semibold" id="form-title">Add New FAQ</h3>
                <button type="button" id="cancel-edit-btn" class="text-sm text-gray-500 hover:text-gray-700 hidden">Cancel Edit</button>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700">User's Question</label>
                <input id="faq-question" placeholder="e.g., What services do you offer?" required class="w-full p-2 border rounded-md mt-1">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700">Bot's Response Type</label>
                <select id="faq-response-type" class="w-full p-2 border rounded-md mt-1 bg-white">
                    <option value="text">Simple Text</option>
                    <option value="rich">Rich Options (buttons)</option>
                </select>
            </div>
            
            <!-- Simple Text Editor -->
            <div id="editor-text">
                <label class="block text-sm font-medium text-gray-700">Bot's Answer</label>
                <textarea id="faq-answer-text" placeholder="e.g., We offer web design, mobile apps, and AI solutions." class="w-full p-2 border rounded-md mt-1" rows="3"></textarea>
            </div>
            
            <!-- Rich Options Editor -->
            <div id="editor-rich" class="hidden space-y-3 p-4 border rounded-md bg-gray-50">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Bot's Message</label>
                    <textarea id="rich-message" placeholder="e.g., We offer three main services. Which one interests you?" class="w-full p-2 border rounded-md mt-1" rows="2"></textarea>
                </div>
                <label class="block text-sm font-medium text-gray-700">Buttons</label>
                <div id="rich-options-list" class="space-y-2"></div>
                <button type="button" id="faq-add-option" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm">+ Add Option</button>
            </div>

            <button type="submit" id="faq-submit-btn" class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold">Add FAQ</button>
        </form>
    </div>
    
    <!-- List -->
    <div id="faq-list">Loading FAQs...</div>`;

  // --- DOM Elements ---
  const form = document.getElementById("faq-form");
  const formTitle = document.getElementById("form-title");
  const submitBtn = document.getElementById("faq-submit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const questionInput = document.getElementById("faq-question");
  const responseTypeSelect = document.getElementById("faq-response-type");
  const answerTextInput = document.getElementById("faq-answer-text");
  const richMessageInput = document.getElementById("rich-message");
  const editorText = document.getElementById("editor-text");
  const editorRich = document.getElementById("editor-rich");
  const richOptionsList = document.getElementById("rich-options-list");
  const addOptionBtn = document.getElementById("faq-add-option");

  // --- State ---
  let richOptions = [];
  let editingFaqId = null; // Tracks if we are editing (non-null) or adding (null)

  // --- Helper: Render Rich Options ---
  function renderRichOptions() {
    richOptionsList.innerHTML = "";
    richOptions.forEach((opt, index) => {
      const el = document.createElement("div");
      el.className = "rich-option flex gap-2 mb-2";
      el.innerHTML = `
        <input class="rich-option-text flex-1 p-2 border rounded" value="${opt.text}" placeholder="Button Text">
        <input class="rich-option-payload flex-1 p-2 border rounded" value="${opt.payload}" placeholder="Payload (Node ID)">
        <button type="button" class="bg-red-500 text-white px-2 rounded hover:bg-red-600">X</button>
      `;
      // Remove button
      el.querySelector("button").onclick = () => {
        richOptions.splice(index, 1);
        renderRichOptions();
      };
      // Input listeners
      el.querySelector(".rich-option-text").onchange = (e) =>
        (richOptions[index].text = e.target.value);
      el.querySelector(".rich-option-payload").onchange = (e) =>
        (richOptions[index].payload = e.target.value);

      richOptionsList.appendChild(el);
    });
  }

  // --- Helper: Toggle Editor Visibility ---
  function updateEditorVisibility() {
    if (responseTypeSelect.value === "text") {
      editorText.classList.remove("hidden");
      editorRich.classList.add("hidden");
    } else {
      editorText.classList.add("hidden");
      editorRich.classList.remove("hidden");
    }
  }

  // --- Helper: Reset Form ---
  function resetForm() {
    editingFaqId = null;
    form.reset();
    richOptions = [];
    renderRichOptions();

    // Reset UI text
    formTitle.textContent = "Add New FAQ";
    submitBtn.textContent = "Add FAQ";
    submitBtn.className =
      "w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold";
    cancelEditBtn.classList.add("hidden");

    // Reset visibility to default
    responseTypeSelect.value = "text";
    updateEditorVisibility();
  }

  // --- Event Listeners ---
  addOptionBtn.onclick = () => {
    richOptions.push({ text: "", payload: "" });
    renderRichOptions();
  };

  responseTypeSelect.onchange = updateEditorVisibility;

  cancelEditBtn.onclick = resetForm;

  // --- Submit Handler (Add vs Update Logic) ---
  form.onsubmit = async (e) => {
    e.preventDefault();

    const type = responseTypeSelect.value;
    const payload = {
      question: questionInput.value,
      response_type: type,
    };

    if (type === "text") {
      if (!answerTextInput.value) return alert("Please provide an answer.");
      payload.answer = answerTextInput.value;
      payload.rich_response = null;
    } else {
      if (!richMessageInput.value || richOptions.length === 0) {
        return alert("Please provide a message and at least one button.");
      }
      payload.rich_response = {
        type: "options",
        message: richMessageInput.value,
        options: richOptions,
      };
      payload.answer = "";
    }

    try {
      if (editingFaqId) {
        // UPDATE MODE
        await api.updateFaq(editingFaqId, payload);
        alert("FAQ updated successfully!");
      } else {
        // CREATE MODE
        await api.postFaq(payload);
        alert("FAQ created successfully!");
      }
      resetForm();
      loadFaqs(); // Refresh the list
    } catch (err) {
      alert("Error saving FAQ: " + err.message);
    }
  };

  // --- Load & Render List ---
  async function loadFaqs() {
    const listContainer = document.getElementById("faq-list");
    listContainer.innerHTML = "Loading...";

    try {
      const faqs = await api.getFaqs();
      if (!faqs.length) {
        listContainer.innerHTML = `<p class="text-center text-gray-500">No FAQs yet.</p>`;
        return;
      }

      listContainer.innerHTML = `
        <div class="dashboard-card overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${faqs
                .map((faq) => {
                  const preview =
                    faq.response_type === "text"
                      ? faq.answer
                      : faq.rich_response?.message || "Rich Response";
                  return `
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
                      faq.question
                    }</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        faq.response_type === "text"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }">
                        ${faq.response_type === "text" ? "Text" : "Rich"}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">${preview}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <!-- EDIT BUTTON -->
                      <button onclick="window.editFaq(${
                        faq.id
                      })" class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded">Edit</button>
                      <!-- DELETE BUTTON -->
                      <button onclick="window.deleteFaq(${
                        faq.id
                      })" class="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded">Delete</button>
                    </td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>`;

      // Store FAQs in memory so editFaq can access them
      window.currentFaqs = faqs;
    } catch (err) {
      listContainer.innerHTML = `<p class="text-red-500">Error loading FAQs: ${err.message}</p>`;
    }
  }

  // --- Global Window Functions (for onclick) ---

  window.deleteFaq = async (id) => {
    if (confirm("Are you sure you want to delete this FAQ?")) {
      try {
        await api.deleteFaq(id);
        loadFaqs();
      } catch (err) {
        alert("Error deleting: " + err.message);
      }
    }
  };

  // NEW: Edit Function
  window.editFaq = (id) => {
    const faq = window.currentFaqs.find((f) => f.id === id);
    if (!faq) return;

    // 1. Enter Edit Mode
    editingFaqId = id;
    formTitle.textContent = `Editing FAQ #${id}`;
    submitBtn.textContent = "Update FAQ";
    submitBtn.className =
      "w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold"; // Change color to blue
    cancelEditBtn.classList.remove("hidden");

    // 2. Populate Form
    questionInput.value = faq.question;
    responseTypeSelect.value = faq.response_type;
    updateEditorVisibility();

    if (faq.response_type === "text") {
      answerTextInput.value = faq.answer || "";
    } else {
      // Populate Rich Options
      const richData = faq.rich_response || { message: "", options: [] };
      richMessageInput.value = richData.message || "";
      richOptions = richData.options ? [...richData.options] : []; // Clone array
      renderRichOptions();
    }

    // 3. Scroll to top
    form.scrollIntoView({ behavior: "smooth" });
  };

  // Initial Load
  resetForm();
  loadFaqs();
}

async function renderRuleEditor(container) {
  // 1) Shell: header + toggle + two main containers
  container.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-3xl font-bold">Guided Flows (Interactive)</h2>
        <p class="text-gray-600 mt-1">
          Manage your chatbot's interactive pathways and connections.
        </p>
      </div>
      <div class="flex space-x-2">
        <button id="toggle-view-btn"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold">
          Switch to List View
        </button>
        <button id="add-new-rule-btn"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold">
          Add New Flow
        </button>
      </div>
    </div>

    <!-- FULL‑HEIGHT Flow View -->
    <div id="flow-view-container"
         class="dashboard-card p-4 mb-6"
         style="height: calc(100vh - 200px);">
      <div id="visual-flow-frame-wrapper"
           class="w-full h-full bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
      </div>
    </div>

    <!-- List View: old table + editor, hidden by default -->
    <h3 id="rule-list-heading" class="text-2xl font-semibold mb-4 hidden">All Flows</h3>
    <div id="rule-editor-container" class="dashboard-card p-6 mb-6 hidden"></div>
    <div id="rule-list-container" class="hidden">Loading flows...</div>
  `;

  const flowViewContainer = document.getElementById("flow-view-container");
  const frameWrapper = document.getElementById("visual-flow-frame-wrapper");
  const ruleEditorContainer = document.getElementById("rule-editor-container");
  const ruleListContainer = document.getElementById("rule-list-container");
  const ruleListHeading = document.getElementById("rule-list-heading");
  const toggleViewBtn = document.getElementById("toggle-view-btn");
  const addNewRuleBtn = document.getElementById("add-new-rule-btn");

  // 2) Mount React Flow app inside Flow View
  frameWrapper.innerHTML = `
    <iframe
      src="/dashboard/flow/"
      style="width:100%;height:100%;border:0;"
    ></iframe>
  `;

  // 3) State for List View
  let currentRules = [];
  let currentView = "flow"; // "flow" or "table"

  async function loadRules() {
    try {
      currentRules = await api.getRules();

      // Ensure core nodes exist
      const haveWelcome = currentRules.some(
        (r) => r.node_id === "welcome_node"
      );
      const haveShowForm = currentRules.some((r) => r.node_id === "show_form");

      if (!haveWelcome) {
        const welcomePayload = {
          node_id: "welcome_node",
          rule_data: {
            type: "options",
            message: "Welcome! How can I help you today?",
            options: [],
          },
        };
        const createdWelcome = await api.postRule(welcomePayload);
        currentRules.push(createdWelcome);
      }

      if (!haveShowForm) {
        const showFormPayload = {
          node_id: "show_form",
          rule_data: {
            type: "options",
            message: "Please fill out this form.",
            options: [],
          },
        };
        const createdShowForm = await api.postRule(showFormPayload);
        currentRules.push(createdShowForm);
      }

      if (currentView === "table") {
        renderListView();
      }
    } catch (err) {
      ruleListContainer.innerHTML = `<p class="text-red-500">Error loading rules: ${err.message}</p>`;
    }
  }

  function renderListView() {
    if (!currentRules.length) {
      ruleListContainer.innerHTML = `<p class="text-center text-gray-500 mt-4">
           No guided flows yet. Add one to start!
         </p>`;
      return;
    }

    ruleListContainer.innerHTML = `
      <div class="dashboard-card overflow-hidden">
        <table class="min-w-full" id="data-table">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-semibold">Node ID</th>
              <th class="px-4 py-2 text-left text-xs font-semibold">Message Preview</th>
              <th class="px-4 py-2 text-left text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${currentRules
              .map(
                (r) => `
              <tr>
                <td class="px-4 py-2 font-mono text-sm">${r.node_id}</td>
                <td class="px-4 py-2 text-sm text-gray-600">
                  ${(r.rule_data.message || "").substring(0, 50)}...
                </td>
                <td class="px-4 py-2">
                  <button
                    onclick="window.editRule(${r.id})"
                    class="inline-flex items-center px-2 py-1
                           text-blue-600 hover:text-blue-800
                           text-xs font-semibold bg-blue-50 rounded
                           mr-2">
                    Edit
                  </button>
                  ${
                    r.node_id === "welcome_node" || r.node_id === "show_form"
                      ? ""
                      : `<button onclick="window.deleteRule(${r.id})"
                                 class="inline-flex items-center px-2 py-1
                                        text-red-600 hover:text-red-800
                                        text-xs font-semibold bg-red-50 rounded
                                        ml-1">
                           Delete
                         </button>`
                  }
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  // 4) Editor form used by List View
  function renderEditorForm(rule = null, suggestedId = "") {
    const isNew = rule === null;
    const nodeId = isNew ? suggestedId : rule.node_id;
    const msg = isNew ? "" : rule.rule_data.message || "";
    let options = isNew
      ? [{ text: "Back", payload: "welcome_node" }]
      : [...(rule.rule_data.options || [])];

    ruleEditorContainer.classList.remove("hidden");
    ruleListContainer.classList.add("hidden");
    flowViewContainer.classList.add("hidden");

    ruleEditorContainer.innerHTML = `
      <h3 class="text-xl font-bold mb-4">
        ${isNew ? "Create New Flow" : "Edit Flow"}
      </h3>
      <div class="space-y-4">
        <input id="rule-node-id"
               value="${nodeId}"
               placeholder="Node ID"
               class="w-full border p-2 rounded" />
        <textarea id="rule-message"
                  placeholder="Bot Message"
                  class="w-full border p-2 rounded">${msg}</textarea>
        <div id="rule-options-list" class="space-y-2"></div>
        <button type="button"
                id="rule-add-option-btn"
                class="bg-gray-600 text-white px-3 py-1 rounded text-sm">
          + Add Button
        </button>
        <div class="flex justify-end space-x-2 pt-4">
          <button id="cancel-edit-btn" class="px-4 py-2 text-gray-500">
            Cancel
          </button>
          <button id="save-rule-btn"
                  class="bg-blue-600 text-white px-4 py-2 rounded font-bold">
            Save Flow
          </button>
        </div>
      </div>`;

    const optionsListEl = document.getElementById("rule-options-list");

    function renderRuleOptions() {
      optionsListEl.innerHTML = "";
      options.forEach((opt, index) => {
        const div = document.createElement("div");
        div.className = "rich-option flex gap-2";
        div.innerHTML = `
          <input class="opt-text border p-2 rounded text-sm flex-1"
                 value="${opt.text}"
                 placeholder="Button Text" />
          <input class="opt-payload border p-2 rounded text-sm flex-1"
                 value="${opt.payload}"
                 placeholder="Node ID" />
          <button class="bg-red-500 text-white rounded w-8 h-8">X</button>
        `;
        div.querySelector(".opt-text").onchange = (e) =>
          (options[index].text = e.target.value);
        div.querySelector(".opt-payload").onchange = (e) =>
          (options[index].payload = e.target.value);
        div.querySelector("button").onclick = () => {
          options.splice(index, 1);
          renderRuleOptions();
        };
        optionsListEl.appendChild(div);
      });
    }

    renderRuleOptions();

    document.getElementById("rule-add-option-btn").onclick = () => {
      options.push({ text: "New Button", payload: "welcome_node" });
      renderRuleOptions();
    };

    document.getElementById("cancel-edit-btn").onclick = () => {
      ruleEditorContainer.classList.add("hidden");
      if (currentView === "flow") {
        flowViewContainer.classList.remove("hidden");
      } else {
        ruleListContainer.classList.remove("hidden");
      }
    };

    document.getElementById("save-rule-btn").onclick = async () => {
      const finalId = document.getElementById("rule-node-id").value.trim();
      const finalMsg = document.getElementById("rule-message").value.trim();
      const finalOpts = Array.from(optionsListEl.children).map((child) => ({
        text: child.querySelector(".opt-text").value,
        payload: child.querySelector(".opt-payload").value,
      }));

      const data = {
        node_id: finalId,
        rule_data: { type: "options", message: finalMsg, options: finalOpts },
      };

      if (isNew) {
        const created = await api.postRule(data);
        currentRules.push(created);
      } else {
        await api.updateRule(rule.id, data);
      }

      ruleEditorContainer.classList.add("hidden");
      if (currentView === "flow") {
        flowViewContainer.classList.remove("hidden");
      } else {
        ruleListContainer.classList.remove("hidden");
      }

      await loadRules();
    };
  }

  // 5) Global helpers for List View actions
  window.editRule = (id) => {
    const r = currentRules.find((r) => r.id === id);
    if (r) renderEditorForm(r);
  };

  window.deleteRule = async (id) => {
    const r = currentRules.find((r) => r.id === id);
    if (!r) return;

    // Protect core nodes
    if (r.node_id === "welcome_node" || r.node_id === "show_form") {
      alert("This core node cannot be deleted.");
      return;
    }

    if (!confirm("Delete this node?")) return;
    await api.deleteRule(id);
    await loadRules();
  };

  // 6) Toggle between Flow and List views
  function toggleView() {
    currentView = currentView === "flow" ? "table" : "flow";

    if (currentView === "flow") {
      flowViewContainer.classList.remove("hidden");
      ruleListContainer.classList.add("hidden");
      ruleListHeading.classList.add("hidden");
      ruleEditorContainer.classList.add("hidden");
      toggleViewBtn.textContent = "Switch to List View";
    } else {
      flowViewContainer.classList.add("hidden");
      ruleListHeading.classList.remove("hidden");
      ruleListContainer.classList.remove("hidden");
      ruleEditorContainer.classList.add("hidden");
      toggleViewBtn.textContent = "Switch to Flow View";
      renderListView();
    }
  }

  toggleViewBtn.onclick = toggleView;
  addNewRuleBtn.onclick = () => renderEditorForm(null, "new_node");

  // 7) Initial load
  await loadRules();
}

async function renderSubmissionsViewer(container) {
  container.innerHTML = `<h2 class="text-3xl font-bold mb-6">Form Submissions (Leads)</h2><div id="subs-container">Loading...</div>`;
  const subsContainer = document.getElementById("subs-container");

  try {
    const submissions = await api.getSubmissions();
    if (!submissions.length) {
      subsContainer.innerHTML = `<p class="text-center text-gray-500 mt-4">No submissions yet.</p>`;
      return;
    }

    subsContainer.innerHTML = `
            <div class="dashboard-card overflow-hidden fade-in">
                <table class="min-w-full" id="data-table">
                    <thead class="bg-gray-50"><tr class="text-left text-xs font-medium text-gray-500 uppercase">
                        <th>Submitted On</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Message</th>
                    </tr></thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${submissions
                          .map(
                            (s) => `
                            <tr>
                                <td class="text-sm text-gray-500">${new Date(
                                  s.submitted_at
                                ).toLocaleString()}</td>
                                <td class="font-medium text-gray-900">${
                                  s.name
                                }</td>
                                <td>
                                  <a href="mailto:${
                                    s.email
                                  }" class="text-blue-600 hover:underline">
                                    ${s.email}
                                  </a>
                                </td>
                                <td class="text-gray-600">${s.phone || "-"}</td>
                                <td class="text-gray-600 text-sm">${
                                  s.message
                                }</td>
                            </tr>`
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>`;
  } catch (err) {
    subsContainer.innerHTML = `<p class="text-red-500">Error loading submissions: ${err.message}</p>`;
  }
}

async function renderInstallationPage(container) {
  const id = localStorage.getItem("clientSchemaName");
  if (!id) {
    container.innerHTML = `<p class="text-red-500">Error: Could not find client ID. Please log in again.</p>`;
    return;
  }

  // This is the exact snippet users should paste
  const snippet = `<script src="${BACKEND_BASE_URL}/static/widget.js" data-client="${id}"></script>`;

  container.innerHTML = `
        <h2 class="text-3xl font-bold mb-6">Installation</h2>
        <div class="dashboard-card p-6 fade-in">
            <p class="text-lg mb-4">
                You're all set! To add the chatbot to your website, copy the snippet below and paste it 
                anywhere in your website's HTML, right before the closing <code>&lt;/body&gt;</code> tag.
            </p>
            <div class="code-snippet-wrapper mt-4">
                <code id="code-snippet" class="code-snippet"></code>
                <button id="copy-btn" class="copy-btn" type="button" title="Copy to clipboard">
                    <!-- tiny copy icon -->
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/>
                    </svg>
                    <span>Copy</span>
                </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
                Tip: test it first on a staging site if you have one.
            </p>
        </div>`;

  // Fill the <code> element with the snippet text safely
  const codeEl = document.getElementById("code-snippet");
  codeEl.textContent = snippet;

  const copyBtn = document.getElementById("copy-btn");
  copyBtn.addEventListener("click", () => {
    navigator.clipboard
      .writeText(snippet)
      .then(() => {
        copyBtn.querySelector("span").textContent = "Copied!";
        showToast("Snippet copied to clipboard.", "success");
        setTimeout(() => {
          copyBtn.querySelector("span").textContent = "Copy";
        }, 2000);
      })
      .catch(() => {
        showToast("Failed to copy. Please copy the text manually.", "error");
      });
  });
}

// --- NEW: BILLING PAGE ---
async function renderBillingPage(container) {
  container.innerHTML = `<h2 class="text-3xl font-bold mb-6">Billing & Plan Management</h2><div id="billing-content">Loading plan info...</div>`;
  const contentDiv = document.getElementById("billing-content");

  try {
    const plans = await api.getPlans();
    const subscription = getSubscription();

    let planCards = "";
    for (const plan of plans) {
      const isCurrent = subscription && subscription.plan_name === plan.name;
      const actionText = isCurrent
        ? "Current Plan"
        : `Subscribe for ₹${plan.price}/mo`;

      planCards += `
                <div class="plan-card dashboard-card p-6 text-center ${
                  isCurrent ? "current-plan" : ""
                } fade-in">
                    <h3 class="text-2xl font-bold mb-2">${plan.name}</h3>
                    <p class="text-4xl font-extrabold mb-4">₹${
                      plan.price
                    }<span class="text-xl font-normal text-gray-500">/mo</span></p>
                    <ul class="text-left space-y-2 mb-6 text-gray-700 text-sm">
                        <li>✓ ${plan.max_faqs} FAQs</li>
                        <li>✓ ${plan.max_leads} Leads/mo</li>
                        <li>✓ NLP-powered Answers</li>
                    </ul>
                    <button data-plan-id="${plan.id}" data-plan-name="${
        plan.name
      }" ${isCurrent ? "disabled" : ""} 
                        class="plan-button w-full text-white font-bold py-2 rounded-lg ${
                          isCurrent
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                        }">
                        ${actionText}
                    </button>
                </div>`;
    }

    let subscriptionInfo = "";
    if (subscription) {
      const badgeClass =
        subscription.status === "active"
          ? "badge-success"
          : subscription.status === "inactive"
          ? "badge-warning"
          : "badge-neutral";

      subscriptionInfo = `<div class="dashboard-card p-6 mb-6 bg-blue-50 border-l-4 border-blue-500 text-blue-700 fade-in">
                   <p class="font-bold text-lg">Your Current Plan: ${
                     subscription.plan_name
                   } <span class="badge ${badgeClass}">${
        subscription.status
      }</span></p>
                   <p class="text-sm">Your plan expires on: ${new Date(
                     subscription.expires_on
                   ).toLocaleDateString()}</p>
               </div>`;
    } else {
      subscriptionInfo = `<div class="dashboard-card p-6 mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 fade-in">
                   <p class="font-bold text-lg">No active subscription found.</p>
                   <p class="text-sm">Please select a plan below to activate your chatbot.</p>
               </div>`;
    }

    contentDiv.innerHTML = `
            ${subscriptionInfo}
            <h3 class="text-2xl font-bold mb-4">Choose Your Plan</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">${planCards}</div>
            <div id="billing-message" class="text-center mt-4 font-semibold"></div>
        `;

    document
      .querySelectorAll(".plan-button:not([disabled])")
      .forEach((button) => {
        button.addEventListener("click", async (e) => {
          const planId = e.target.getAttribute("data-plan-id");
          const planName = e.target.getAttribute("data-plan-name");
          const msgDiv = document.getElementById("billing-message");

        const confirmed = await showConfirmModal(
          "Confirm Subscription",
          `You are about to subscribe to the ${planName}. Proceed to payment?`,
          "Proceed to payment",
          "Cancel"
        );
        if (!confirmed) return;
        
  
          msgDiv.className = "text-center mt-4 font-semibold text-blue-600";
          msgDiv.textContent = `Creating secure payment order for ${planName}...`;

          try {
            const orderResponse = await api.createOrder(planId);
            const { order_id, amount, currency, razorpay_key_id } =
              orderResponse;

            const options = {
              key: razorpay_key_id,
              amount: amount,
              currency: currency,
              name: "Multi-tenant chatbot",
              description: `Payment for ${planName}`,
              order_id: order_id,
              handler: function (response) {
                msgDiv.className =
                  "text-center mt-4 font-semibold text-green-600";
                msgDiv.textContent = `Payment Successful! Your plan is being activated. Payment ID: ${response.razorpay_payment_id}. Please log out and log back in to see your new plan.`;
                showToast(
                  "Payment successful! Please re-login to refresh your subscription.",
                  "success"
                );
              },
              prefill: {},
              notes: {
                plan_id: planId,
              },
              theme: {
                color: "#007BFF",
              },
            };

            if (typeof Razorpay === "undefined") {
              msgDiv.className = "text-center mt-4 font-semibold text-red-600";
              msgDiv.textContent =
                "Payment widget failed to load. Please check your internet connection and try again.";
              showToast(
                "Payment widget failed to load. Check your connection.",
                "error"
              );
              return;
            }

            const rzp = new Razorpay(options);
            rzp.open();

            rzp.on("payment.failed", function (response) {
              msgDiv.className = "text-center mt-4 font-semibold text-red-600";
              msgDiv.textContent = `Payment Failed: ${response.error.description}. Please try again.`;
              showToast(
                `Payment failed: ${response.error.description}`,
                "error"
              );
            });
          } catch (err) {
            msgDiv.className = "text-center mt-4 font-semibold text-red-600";
            msgDiv.textContent = `Error creating order: ${err.message}`;
            showToast("Error creating order: " + err.message, "error");
          }
        });
      });
  } catch (err) {
    contentDiv.innerHTML = `<p class="text-red-500">Error loading billing info: ${err.message}</p>`;
  }
}

// --- Main App Initialization ---
window.addEventListener("hashchange", renderPage);
window.addEventListener("load", renderPage);