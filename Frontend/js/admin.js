/* =========================================
   admin.js - Admin Panel Logic
   ========================================= */

const API_BASE = '/api';
const ADMIN_TOKEN_KEY = 'portfolio_admin_token';
const DEFAULT_ADMIN_EMAIL = 'reyhanmuhamadrizki1@gmail.com';

let authToken = sessionStorage.getItem(ADMIN_TOKEN_KEY) || null;
let editingProjectId = null;
let allMessages = [];
let allAdminProjects = [];
let messageSearch = '';
let messageUnreadOnly = false;

// ===== THEME =====
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// ===== AUTH =====
function setAuthToken(token) {
  authToken = token || null;
  if (authToken) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, authToken);
  } else {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

function showLoginView() {
  document.getElementById('admin-panel')?.classList.remove('active');
  const login = document.getElementById('login-section');
  if (login) login.style.display = 'flex';
}

function showAdminView() {
  const login = document.getElementById('login-section');
  if (login) login.style.display = 'none';
  document.getElementById('admin-panel')?.classList.add('active');
}

function logout(showMessage = false) {
  setAuthToken(null);
  showLoginView();
  const pwInput = document.getElementById('admin-password');
  if (pwInput) pwInput.value = '';
  if (showMessage) showBanner('success', 'Logged out.');
}

function handleUnauthorized(msg = 'Session expired. Please login again.') {
  logout(false);
  showBanner('error', msg);
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function applyAdminEmail(email) {
  const safeEmail = typeof email === 'string' && email.includes('@') ? email.trim() : DEFAULT_ADMIN_EMAIL;
  const link = document.getElementById('admin-email-link-login');
  if (!link) return;
  link.href = `mailto:${safeEmail}`;
  link.textContent = safeEmail;
}

async function loadMeta() {
  try {
    const res = await fetch(`${API_BASE}/meta`);
    if (!res.ok) return;
    const data = await parseJsonSafe(res);
    if (data && data.adminEmail) {
      applyAdminEmail(data.adminEmail);
    }
  } catch {
    applyAdminEmail(DEFAULT_ADMIN_EMAIL);
  }
}

// ===== LOGIN =====
document.getElementById('login-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const pw = document.getElementById('admin-password')?.value?.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (!pw) {
    showBanner('error', 'Password is required.');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });

    const data = await parseJsonSafe(res);

    if (!res.ok || !data.token) {
      showBanner('error', data.error || data.message || 'Incorrect password.');
      return;
    }

    setAuthToken(data.token);
    showAdminView();
    await loadAdminData();
    showBanner('success', 'Logged in successfully. Welcome, Admin.');
  } catch {
    showBanner('error', 'Network error. Please try again.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
  logout(true);
});

// ===== TABS =====
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });

    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    const target = tab.getAttribute('data-tab');
    document.getElementById(`tab-${target}`)?.classList.add('active');
  });
});

// ===== LOAD ALL DATA =====
async function loadAdminData() {
  if (!authToken) {
    showLoginView();
    return;
  }

  await loadMessages();
  if (!authToken) return;
  await loadAdminProjects();
}

// ===== MESSAGES =====
async function loadMessages() {
  try {
    const res = await fetch(`${API_BASE}/contact`, { headers: authHeaders() });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return;
    }

    if (!res.ok) throw new Error('Failed to load messages');

    const json = await parseJsonSafe(res);
    // Backend returns { success, data, pagination, fromCache }
    allMessages = json.data && Array.isArray(json.data) ? json.data : [];
    renderMessages();
  } catch {
    const container = document.getElementById('messages-container');
    if (container) container.innerHTML = '<div class="empty-state">Failed to load messages.</div>';
  }
}

function renderMessages() {
  const container = document.getElementById('messages-container');
  if (!container) return;

  const unread = allMessages.filter(m => !m.read).length;
  const count = document.getElementById('msg-count');
  if (count) count.textContent = `${allMessages.length} total, ${unread} unread`;
  const markAllBtn = document.getElementById('mark-all-read-btn');
  if (markAllBtn) {
    markAllBtn.disabled = unread === 0;
    markAllBtn.textContent = unread === 0 ? 'All Read' : `Mark All Read (${unread})`;
  }

  let filtered = allMessages;
  const q = messageSearch.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(m => {
      const blob = [
        m.name,
        m.email,
        m.subject,
        m.message
      ].join(' ').toLowerCase();
      return blob.includes(q);
    });
  }
  if (messageUnreadOnly) {
    filtered = filtered.filter(m => !m.read);
  }

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">No messages yet.</div>';
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>From</th>
          <th>Subject</th>
          <th>Message</th>
          <th>Time</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(m => `
          <tr>
            <td>
              <div class="msg-from">${escHtml(m.name)}${!m.read ? '<span class="badge-unread">NEW</span>' : ''}</div>
              <div class="msg-email">${escHtml(m.email)}</div>
            </td>
            <td><div class="msg-subject">${escHtml(m.subject)}</div></td>
            <td><div class="msg-body">${escHtml((m.message || '').slice(0, 120))}${(m.message || '').length > 120 ? '…' : ''}</div></td>
            <td><div class="msg-time">${formatDate(m.timestamp || m.createdAt)}</div></td>
            <td>
              ${!m.read ? `<button class="btn-edit" onclick="markRead('${m.id}')">Mark Read</button>` : ''}
              <button class="btn-danger" onclick="deleteMessage('${m.id}')">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function markAllRead() {
  if (!authToken) {
    handleUnauthorized('Please login first.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/contact/read-all`, {
      method: 'PATCH',
      headers: authHeaders()
    });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return;
    }

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      showBanner('error', data.error || 'Failed to mark all messages.');
      return;
    }

    allMessages = allMessages.map(m => ({ ...m, read: true }));
    renderMessages();
    showBanner('success', `Marked ${data.updated || 0} message(s) as read.`);
  } catch {
    showBanner('error', 'Network error.');
  }
}

async function markRead(id) {
  try {
    const res = await fetch(`${API_BASE}/contact/${id}/read`, {
      method: 'PATCH',
      headers: authHeaders()
    });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return;
    }

    if (!res.ok) {
      const data = await parseJsonSafe(res);
      showBanner('error', data.error || 'Failed to mark as read.');
      return;
    }

    const idx = allMessages.findIndex(m => String(m.id) === String(id));
    if (idx !== -1) allMessages[idx].read = true;
    renderMessages();
  } catch {
    showBanner('error', 'Failed to mark as read.');
  }
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;

  try {
    const res = await fetch(`${API_BASE}/contact/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return;
    }

    if (res.ok) {
      allMessages = allMessages.filter(m => String(m.id) !== String(id));
      renderMessages();
      showBanner('success', 'Message deleted.');
    } else {
      const data = await parseJsonSafe(res);
      showBanner('error', data.error || 'Failed to delete message.');
    }
  } catch {
    showBanner('error', 'Network error.');
  }
}

function refreshMessages() {
  loadMessages();
}

// ===== PROJECTS =====
async function loadAdminProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Error');

    const json = await parseJsonSafe(res);
    // Backend returns { success, data, pagination, fromCache }
    allAdminProjects = json.data && Array.isArray(json.data) ? json.data : [];

    renderAdminProjects();
  } catch {
    const container = document.getElementById('projects-container');
    if (container) container.innerHTML = '<div class="empty-state">Failed to load projects.</div>';
  }
}

function renderAdminProjects() {
  const container = document.getElementById('projects-container');
  if (!container) return;

  if (!allAdminProjects.length) {
    container.innerHTML = '<div class="empty-state">No projects yet. Create one below.</div>';
    return;
  }

  const projCount = document.getElementById('proj-count');
  if (projCount) projCount.textContent = `${allAdminProjects.length} projects`;

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Category</th>
          <th>Tech Stack</th>
          <th>Role</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${allAdminProjects.map(p => `
          <tr>
            <td><strong class="text-bright">${escHtml(p.title)}</strong></td>
            <td><span class="tech-tag">${escHtml(p.category || '')}</span></td>
            <td>${(p.tech || []).slice(0, 3).map(t => `<span class="tech-tag">${escHtml(t)}</span>`).join(' ')}</td>
            <td class="text-muted small-text">${escHtml(p.role)}</td>
            <td>
              <button class="btn-edit" onclick="editProject('${p.id}')">Edit</button>
              <button class="btn-danger" onclick="deleteProject('${p.id}')">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function editProject(id) {
  const project = allAdminProjects.find(p => String(p.id) === String(id));
  if (!project) return;

  editingProjectId = id;
  document.getElementById('proj-form-title-heading').textContent = 'Edit Project';
  document.getElementById('proj-title').value = project.title || '';
  document.getElementById('proj-description').value = project.description || '';
  document.getElementById('proj-tech').value = (project.tech || []).join(', ');
  document.getElementById('proj-role').value = project.role || '';
  document.getElementById('proj-impact').value = project.impact || '';
  document.getElementById('proj-github').value = project.github || '';
  document.getElementById('proj-demo').value = project.demo || '';
  document.getElementById('proj-category').value = project.category || 'General';

  document.getElementById('project-form-card')?.scrollIntoView({ behavior: 'smooth' });
}

function resetProjectForm() {
  editingProjectId = null;
  document.getElementById('proj-form-title-heading').textContent = 'Add New Project';
  document.getElementById('project-form')?.reset();
}

document.getElementById('cancel-edit-btn')?.addEventListener('click', resetProjectForm);

document.getElementById('project-form')?.addEventListener('submit', async e => {
  e.preventDefault();

  if (!authToken) {
    handleUnauthorized('Please login first.');
    return;
  }

  const title = document.getElementById('proj-title').value.trim();
  const description = document.getElementById('proj-description').value.trim();
  const techRaw = document.getElementById('proj-tech').value.trim();
  const role = document.getElementById('proj-role').value.trim();
  const impact = document.getElementById('proj-impact').value.trim();
  const github = document.getElementById('proj-github').value.trim();
  const demo = document.getElementById('proj-demo').value.trim();
  const category = document.getElementById('proj-category').value;

  if (!title || !description || !role) {
    showBanner('error', 'Title, description, and role are required.');
    return;
  }

  const tech = techRaw ? techRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const payload = { title, description, tech, role, impact, github, demo, category };

  const url = editingProjectId
    ? `${API_BASE}/projects/${editingProjectId}`
    : `${API_BASE}/projects`;
  const method = editingProjectId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return;
    }

    if (res.ok) {
      showBanner('success', editingProjectId ? 'Project updated!' : 'Project created!');
      resetProjectForm();
      await loadAdminProjects();
    } else {
      const data = await parseJsonSafe(res);
      showBanner('error', data.error || 'Operation failed.');
    }
  } catch {
    showBanner('error', 'Network error.');
  }
});

async function deleteProject(id) {
  if (!confirm('Permanently delete this project?')) return;

  try {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return;
    }

    if (res.ok) {
      allAdminProjects = allAdminProjects.filter(p => String(p.id) !== String(id));
      renderAdminProjects();
      showBanner('success', 'Project deleted.');
    } else {
      const data = await parseJsonSafe(res);
      showBanner('error', data.error || 'Failed to delete.');
    }
  } catch {
    showBanner('error', 'Network error.');
  }
}

function refreshProjects() {
  loadAdminProjects();
}

async function clearCache() {
  if (!authToken) {
    handleUnauthorized('Please login first.');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/cache/clear`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return;
    }
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      showBanner('error', data.error || 'Failed to clear cache.');
      return;
    }
    showBanner('success', 'Cache cleared. Reloading projects…');
    await loadAdminProjects();
  } catch {
    showBanner('error', 'Network error.');
  }
}

// ===== UTILS =====
function showBanner(type, msg) {
  const banner = document.getElementById('admin-alert');
  if (!banner) return;
  banner.textContent = msg;
  banner.className = `alert-banner ${type} show`;
  setTimeout(() => { banner.className = 'alert-banner'; }, 4000);
}

function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso || '-';
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Expose for inline onclick
window.deleteMessage = deleteMessage;
window.markRead = markRead;
window.editProject = editProject;
window.deleteProject = deleteProject;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  applyAdminEmail(DEFAULT_ADMIN_EMAIL);
  await loadMeta();

  document.getElementById('mark-all-read-btn')?.addEventListener('click', markAllRead);
  document.getElementById('refresh-messages-btn')?.addEventListener('click', refreshMessages);
  document.getElementById('refresh-projects-btn')?.addEventListener('click', refreshProjects);
  document.getElementById('clear-cache-btn')?.addEventListener('click', clearCache);

  document.getElementById('msg-search')?.addEventListener('input', e => {
    messageSearch = e.target.value || '';
    renderMessages();
  });
  document.getElementById('msg-unread-only')?.addEventListener('change', e => {
    messageUnreadOnly = !!e.target.checked;
    renderMessages();
  });

  if (authToken) {
    showAdminView();
    await loadAdminData();
  } else {
    showLoginView();
  }
});
