const $ = (id) => document.getElementById(id);

let currentToken = "";

const setMessage = (id, text, type = "") => {
  const node = $(id);
  node.textContent = text || "";
  node.className = `message${type ? ` ${type}` : ""}`;
};

const readToken = () => sessionStorage.getItem("admin_token") || "";

const saveToken = (token) => {
  sessionStorage.setItem("admin_token", token);
  $("token").value = token;
  currentToken = token;
};

const api = async (path) => {
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${currentToken}` },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

const renderStats = (container, stats) => {
  container.innerHTML = "";
  Object.entries(stats || {}).forEach(([key, value]) => {
    const card = document.createElement("div");
    card.className = "stat";
    card.innerHTML = `<small>${key}</small><strong>${value}</strong>`;
    container.appendChild(card);
  });
};

const renderRows = (tableId, rows, columns) => {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = columns.map((fn) => `<td>${fn(row)}</td>`).join("");
    tbody.appendChild(tr);
  });
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");

const login = async () => {
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    setMessage("loginMessage", "Email and password are required.", "error");
    return;
  }

  try {
    setMessage("loginMessage", "Logging in...");
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed");

    if (!data?.data?.token) {
      throw new Error("Token missing in login response");
    }

    saveToken(data.data.token);
    setMessage("loginMessage", "Login successful. Loading dashboard...", "success");
    await loadDashboard();
  } catch (error) {
    setMessage("loginMessage", error.message, "error");
  }
};

const loadDashboard = async () => {
  currentToken = $("token").value.trim();

  if (!currentToken) {
    setMessage("dashboardMessage", "Admin JWT token is required.", "error");
    return;
  }

  try {
    setMessage("dashboardMessage", "Loading dashboard...");
    const [overview, recent, database] = await Promise.all([
      api("/api/v1/admin/overview"),
      api("/api/v1/admin/recent-activity"),
      api("/api/v1/admin/database"),
    ]);

    renderStats($("totals"), overview.totals);
    renderStats($("usage7d"), overview.usage7d);

    $("meta").innerHTML = `
      <p><strong>Admin:</strong> ${overview.admin.name} (${overview.admin.email})</p>
      <p><strong>Environment:</strong> ${overview.app.nodeEnv}</p>
      <p><strong>Uptime (sec):</strong> ${overview.app.uptimeSeconds}</p>
      <p><strong>WhatsApp Config:</strong> <span class="tag">${overview.app.whatsappCloud.valid ? "OK" : "Missing"}</span></p>
      <p><strong>DB:</strong> ${(overview.database && overview.database.db) || "-"}</p>
      <p><strong>Storage (MB):</strong> ${(overview.database && overview.database.storageSizeMB) || "-"}</p>
    `;

    $("campaignStatus").textContent = JSON.stringify(overview.campaignStatusBreakdown, null, 2);
    $("messageStatus").textContent = JSON.stringify(overview.messageStatusBreakdown, null, 2);

    renderRows("campaignTable", recent.recentCampaigns || [], [
      (r) => r.name || "-",
      (r) => `<span class="tag">${r.status || "-"}</span>`,
      (r) => (r.owner && r.owner.email) || "-",
      (r) => formatDate(r.createdAt),
    ]);

    renderRows("userTable", recent.recentUsers || [], [
      (r) => r.name || "-",
      (r) => r.email || "-",
      (r) => `<span class="tag">${r.isAdmin ? "admin" : "user"}</span>`,
      (r) => formatDate(r.createdAt),
    ]);

    renderRows("dbTable", database.collections || [], [
      (r) => r.name,
      (r) => r.documents,
      (r) => r.indexes,
    ]);

    saveToken(currentToken);
    setMessage("dashboardMessage", "Dashboard loaded.", "success");
  } catch (error) {
    setMessage("dashboardMessage", `Unable to load dashboard: ${error.message}`, "error");
  }
};

$("loginBtn").addEventListener("click", login);
$("loadBtn").addEventListener("click", loadDashboard);
$("refreshBtn").addEventListener("click", loadDashboard);
$("password").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    login();
  }
});

const existingToken = readToken();
if (existingToken) {
  saveToken(existingToken);
}

