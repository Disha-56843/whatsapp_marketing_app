const $ = (id) => document.getElementById(id);

let currentToken = "";
let selectedUserId = "";

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

const saveSelectedUser = (userId) => {
  selectedUserId = userId || "";
  sessionStorage.setItem("admin_selected_user", selectedUserId);
  $("selectedUserId").value = selectedUserId;
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

const loadUsers = async () => {
  const payload = await api("/api/v1/admin/users");
  const users = payload.users || [];
  const select = $("selectedUserId");
  select.innerHTML = '<option value="">Select user</option>';

  users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user._id;
    option.textContent = `${user.name || "Unknown"} (${user.email || "no-email"})`;
    select.appendChild(option);
  });

  const storedUser = sessionStorage.getItem("admin_selected_user") || "";
  if (storedUser && users.some((u) => u._id === storedUser)) {
    saveSelectedUser(storedUser);
  }

  return users;
};

const renderUserDetails = (data) => {
  $("userProfile").innerHTML = `
    <p><strong>Name:</strong> ${data.user.name || "-"}</p>
    <p><strong>Email:</strong> ${data.user.email || "-"}</p>
    <p><strong>Role:</strong> <span class="tag">${data.user.isAdmin ? "admin" : "user"}</span></p>
    <p><strong>Created:</strong> ${formatDate(data.user.createdAt)}</p>
    <p><strong>Updated:</strong> ${formatDate(data.user.updatedAt)}</p>
  `;

  renderStats($("userTotals"), data.totals || {});
  renderStats($("userUsage7d"), data.usage7d || {});
  $("userCampaignStatus").textContent = JSON.stringify(data.campaignStatusBreakdown || {}, null, 2);
  $("userMessageStatus").textContent = JSON.stringify(data.messageStatusBreakdown || {}, null, 2);

  renderRows("userContactsTable", data?.recent?.contacts || [], [
    (r) => r.name || "-",
    (r) => r.phone || "-",
    (r) => r.email || "-",
    (r) => formatDate(r.createdAt),
  ]);

  renderRows("userCampaignsTable", data?.recent?.campaigns || [], [
    (r) => r.name || "-",
    (r) => `<span class="tag">${r.status || "-"}</span>`,
    (r) => (r.stats && r.stats.sent) || 0,
    (r) => formatDate(r.createdAt),
  ]);

  renderRows("userMessagesTable", data?.recent?.messages || [], [
    (r) => (r.campaignId && r.campaignId.name) || "-",
    (r) => (r.contactId && (r.contactId.name || r.contactId.phone)) || "-",
    (r) => `<span class="tag">${r.status || "-"}</span>`,
    (r) => formatDate(r.createdAt),
  ]);
};

const loadSelectedUser = async () => {
  selectedUserId = $("selectedUserId").value;
  if (!selectedUserId) {
    setMessage("userMessage", "Please select a user.", "error");
    return;
  }

  try {
    setMessage("userMessage", "Loading selected user...");
    const payload = await api(`/api/v1/admin/users/${selectedUserId}`);
    renderUserDetails(payload);
    saveSelectedUser(selectedUserId);
    setMessage("userMessage", "User data loaded.", "success");
  } catch (error) {
    setMessage("userMessage", `Unable to load user data: ${error.message}`, "error");
  }
};

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

    const token = data?.token || data?.data?.token;
    if (!token) {
      throw new Error("Token missing in login response");
    }

    saveToken(token);
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

    const users = await loadUsers();
    if (!selectedUserId && users.length > 0) {
      saveSelectedUser(users[0]._id);
    }
    if (selectedUserId) {
      await loadSelectedUser();
    }

    saveToken(currentToken);
    setMessage("dashboardMessage", "Dashboard loaded.", "success");
  } catch (error) {
    setMessage("dashboardMessage", `Unable to load dashboard: ${error.message}`, "error");
  }
};

$("loginBtn").addEventListener("click", login);
$("loadBtn").addEventListener("click", loadDashboard);
$("refreshBtn").addEventListener("click", loadDashboard);
$("loadUserBtn").addEventListener("click", loadSelectedUser);
$("refreshUserBtn").addEventListener("click", loadSelectedUser);
$("selectedUserId").addEventListener("change", () => {
  saveSelectedUser($("selectedUserId").value);
});
$("password").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    login();
  }
});

const existingToken = readToken();
if (existingToken) {
  saveToken(existingToken);
}

const existingSelectedUser = sessionStorage.getItem("admin_selected_user");
if (existingSelectedUser) {
  selectedUserId = existingSelectedUser;
}
