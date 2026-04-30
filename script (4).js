/* ============================================
   CLAIRE'S BIRTHDAY VAULT — SHARED SCRIPT
   Supabase init + shared utilities
   ============================================ */

const SUPABASE_URL     = 'https://xtzhgmsyfntdtpukqako.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0emhnbXN5Zm50ZHRwdWtxYWtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk3NjM0MSwiZXhwIjoyMDkyNTUyMzQxfQ.LjxH5r1yUk9T9UD4ZWBPbc0n-kSu-UT3HIGYFN6JNHE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---- TOAST SYSTEM ---- */
function showToast(message, type = 'default', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', default: '·' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.default}</span><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

/* ---- FORMAT DATE ---- */
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/* ---- GET INITIALS ---- */
function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() || '')
    .join('');
}
