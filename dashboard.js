/* ============================================
   CLAIRE'S BIRTHDAY VAULT — DASHBOARD SCRIPT
   Messages, Preview, Delete, Download
   ============================================ */

// Auth guard
if (sessionStorage.getItem('cv_auth') !== 'true') {
  window.location.href = 'login.html';
}

// State
let allMessages = [];
let currentMessage = null;
let currentDesign = 'pastel';

/* ---- LOGOUT ---- */
function logout() {
  sessionStorage.removeItem('cv_auth');
  window.location.href = 'login.html';
}

/* ---- LOAD MESSAGES ---- */
async function loadMessages() {
  const grid = document.getElementById('messages-grid');

  // Skeleton
  grid.innerHTML = `
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  `;

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('event_id', 'claire')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allMessages = data || [];
    renderMessages(allMessages);
    updateStats(allMessages);

  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Could not load messages</div>
        <p class="empty-state-sub">${err.message || 'Check your connection and try again.'}</p>
      </div>
    `;
    showToast('Failed to load messages', 'error');
  }
}

/* ---- UPDATE STATS ---- */
function updateStats(messages) {
  const totalEl = document.getElementById('stat-total');
  const todayEl = document.getElementById('stat-today');

  if (totalEl) totalEl.textContent = messages.length;

  if (todayEl) {
    const today = new Date().toDateString();
    const todayCount = messages.filter(m => new Date(m.created_at).toDateString() === today).length;
    todayEl.textContent = todayCount;
  }
}

/* ---- RENDER MESSAGES ---- */
function renderMessages(messages) {
  const grid = document.getElementById('messages-grid');

  if (!messages.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💌</div>
        <div class="empty-state-title">No messages yet</div>
        <p class="empty-state-sub">Share the public page and watch the wishes roll in!</p>
      </div>
    `;
    return;
  }

  const avatarColors = ['avatar-0', 'avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'];

  grid.innerHTML = messages.map((msg, i) => {
    const initials = getInitials(msg.name);
    const avatarClass = avatarColors[i % avatarColors.length];
    const preview = msg.message.length > 120 ? msg.message.slice(0, 120) + '…' : msg.message;

    return `
      <div class="message-card" id="card-${msg.id}" style="animation-delay: ${Math.min(i * 50, 300)}ms">
        <div class="message-card-top">
          <div class="message-card-avatar ${avatarClass}">${initials}</div>
          <div class="message-card-info">
            <div class="message-card-name">${escapeHtml(msg.name)}</div>
            <div class="message-card-date">${formatDate(msg.created_at)}</div>
          </div>
        </div>
        <p class="message-card-body">${escapeHtml(preview)}</p>
        <div class="message-card-actions">
          <button class="btn btn-soft btn-sm" onclick="openModal('${msg.id}')">
            👁 Preview Card
          </button>
          <button class="btn btn-ghost btn-sm" onclick="quickDownload('${msg.id}')">
            ⬇ Download
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteMessage('${msg.id}')">
            🗑 Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ---- DELETE MESSAGE ---- */
async function deleteMessage(id) {
  if (!confirm('Remove this message from the vault? This cannot be undone.')) return;

  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.style.opacity = '0.4';
    card.style.pointerEvents = 'none';
  }

  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Remove from local state
    allMessages = allMessages.filter(m => m.id !== id);

    // Animate out
    if (card) {
      card.style.transition = 'all 300ms ease';
      card.style.transform = 'scale(0.92)';
      card.style.opacity = '0';
      setTimeout(() => {
        card.remove();
        updateStats(allMessages);
        if (!document.querySelectorAll('.message-card').length) {
          renderMessages([]);
        }
      }, 300);
    }

    showToast('Message removed from vault', 'success');

  } catch (err) {
    if (card) {
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto';
    }
    showToast('Could not delete message. Try again.', 'error');
  }
}

/* ---- OPEN MODAL ---- */
function openModal(id) {
  const msg = allMessages.find(m => m.id === id);
  if (!msg) return;

  currentMessage = msg;
  currentDesign = 'pastel';

  // Reset design selector
  document.querySelectorAll('.design-option').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-design="pastel"]')?.classList.add('active');

  // Set modal header
  document.getElementById('modal-sender-name').textContent = `From ${msg.name}`;
  document.getElementById('modal-date').textContent = formatDate(msg.created_at);

  // Render card
  renderCard(msg, 'pastel');

  // Scale card to fit modal
  scaleCardToFit();

  // Show modal
  const overlay = document.getElementById('card-modal');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('active'));

  document.body.style.overflow = 'hidden';
}

/* ---- CLOSE MODAL ---- */
function closeModal() {
  const overlay = document.getElementById('card-modal');
  overlay.classList.remove('active');
  setTimeout(() => {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    currentMessage = null;
  }, 300);
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('card-modal')) closeModal();
}

/* ---- SELECT DESIGN ---- */
function selectDesign(btn, design) {
  document.querySelectorAll('.design-option').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentDesign = design;
  if (currentMessage) {
    renderCard(currentMessage, design);
    scaleCardToFit();
  }
}

/* ---- SCALE CARD TO FIT MODAL ---- */
function scaleCardToFit() {
  requestAnimationFrame(() => {
    const wrapper = document.getElementById('card-preview-wrapper');
    const container = wrapper?.parentElement;
    if (!wrapper || !container) return;

    const containerWidth = container.clientWidth;
    const cardWidth = 700;
    const scale = Math.min(containerWidth / cardWidth, 1);

    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.width = `${cardWidth}px`;
    wrapper.style.height = '480px';
    container.style.height = `${480 * scale}px`;
  });
}

/* ---- QUICK DOWNLOAD (from grid) ---- */
async function quickDownload(id) {
  const msg = allMessages.find(m => m.id === id);
  if (!msg) return;

  // Render to hidden el with current design
  await renderAndDownload(msg, 'pastel', `Claire-${msg.name}-wish.png`);
}

/* ---- DOWNLOAD FROM MODAL ---- */
async function downloadCard() {
  if (!currentMessage) return;
  await renderAndDownload(currentMessage, currentDesign, `Claire-${currentMessage.name}-${currentDesign}.png`);
}

/* ---- RENDER CARD HTML ---- */
function renderCard(msg, design) {
  const container = document.getElementById('birthday-card-render');
  if (!container) return;

  container.className = `bday-card card-${design}`;
  container.innerHTML = buildCardInner(msg, design);
}

function buildCardInner(msg, design) {
  const message = escapeHtml(msg.message);
  const name    = escapeHtml(msg.name);
  const fs      = getCardFontSize(msg.message);

  if (design === 'pastel') {
    return `
      <div class="card-bg-circle-1"></div>
      <div class="card-bg-circle-2"></div>
      <div class="card-ornament">
        <span></span><span></span><span></span>
      </div>
      <div class="card-inner-content">
        <div class="card-label">Happy Birthday, Claire</div>
        <div class="card-message" style="font-size:${fs}px; font-weight:600;">${message}</div>
        <div class="card-sender">— ${name}</div>
      </div>
      <div class="card-bottom-ornament"><span>✦ ✦ ✦</span></div>
    `;
  }

  if (design === 'colorful') {
    return `
      <div class="card-bg-stripe-1"></div>
      <div class="card-bg-stripe-2"></div>
      <div class="card-bg-circle-top"></div>
      <div class="card-name-accent">✦ claire's birthday vault ✦</div>
      <div class="card-inner-content">
        <div class="card-label">Happy Birthday, Claire 🎂</div>
        <div class="card-message" style="font-size:${fs}px; font-weight:700;">${message}</div>
        <div class="card-sender">— ${name}</div>
      </div>
      <div class="card-stars">★ ★ ★</div>
    `;
  }

  if (design === 'luxury') {
    return `
      <div class="card-border-top"></div>
      <div class="card-border-bottom"></div>
      <div class="card-corner-tl"></div>
      <div class="card-corner-tr"></div>
      <div class="card-corner-bl"></div>
      <div class="card-corner-br"></div>
      <div class="card-inner-content">
        <div class="card-label">Happy Birthday, Claire</div>
        <div class="card-message" style="font-size:${fs}px; font-weight:600;">${message}</div>
        <div class="card-divider"></div>
        <div class="card-sender">${name}</div>
      </div>
    `;
  }

  return '';
}

/* ---- SMART FONT SIZE ---- */
function getCardFontSize(message) {
  const len = message.length;
  if (len <= 60)  return 34;
  if (len <= 120) return 28;
  if (len <= 200) return 24;
  if (len <= 300) return 21;
  if (len <= 450) return 18;
  return 16;
}

/* ---- RENDER + DOWNLOAD ---- */
async function renderAndDownload(msg, design, filename) {
  // Create an off-screen container at full resolution
  const offscreen = document.createElement('div');
  offscreen.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 700px;
    height: 480px;
    overflow: hidden;
    pointer-events: none;
    z-index: -1;
  `;

  const cardEl = document.createElement('div');
  cardEl.className = `bday-card card-${design}`;
  cardEl.style.width = '700px';
  cardEl.style.height = '480px';
  cardEl.innerHTML = buildCardInner(msg, design);

  offscreen.appendChild(cardEl);
  document.body.appendChild(offscreen);

  try {
    showToast('Generating card…', 'default', 3000);

    const canvas = await html2canvas(cardEl, {
      width: 700,
      height: 480,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: design === 'colorful' ? '#1a0f2e' : design === 'luxury' ? '#f9f7f4' : '#fdf6f8',
      logging: false,
      onclone: (doc) => {
        // Inject styles into cloned document
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = window.location.href.replace(/[^/]*$/, '') + 'styles.css';
        doc.head.appendChild(link);
      }
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();

    showToast('Card downloaded!', 'success');

  } catch (err) {
    showToast('Download failed. Try again.', 'error');
    console.error(err);
  } finally {
    document.body.removeChild(offscreen);
  }
}

/* ---- ESCAPE HTML ---- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---- RESIZE HANDLER ---- */
window.addEventListener('resize', () => {
  if (document.getElementById('card-modal')?.classList.contains('active')) {
    scaleCardToFit();
  }
});

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', () => {
  loadMessages();
});
