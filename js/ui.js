/**
 * ui.js
 * 公共 UI 工具：HTML 转义、Toast、卡片渲染
 * 所有页面在 data.js 之后、页面脚本之前引入
 */

/**
 * 把用户输入转义后再拼进 HTML，防止存储型 XSS
 * 所有插入 innerHTML 的动态文本都必须过这一层
 */
function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, ch => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === '"') return "&quot;";
    return "&#39;";
  });
}

/**
 * 统一 Toast：页面里没有 #toast 时自动创建一个
 */
function showToast(message) {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2000);
}

/**
 * 卡片 HTML，首页与搜索页共用
 */
function renderItemCard(item) {
  const statusClass = getStatusClass(item.status);
  const typeClass = getTypeClass(item.type);

  return `
    <a class="card" href="detail.html?id=${encodeURIComponent(item.id)}">
      <span class="card-icon" aria-hidden="true">${getIconEmoji(item)}</span>
      <span class="card-main">
        <span class="card-title-row">
          <span class="card-title">${escapeHtml(item.title)}</span>
          <span class="status-tag ${statusClass}">${escapeHtml(item.status)}</span>
        </span>
        <span class="card-location">📍 ${escapeHtml(item.location)}</span>
        <span class="card-time">🕐 ${escapeHtml(formatDisplayTime(item.eventTime))}</span>
      </span>
      <span class="card-type ${typeClass}">${escapeHtml(item.type)}</span>
    </a>
  `;
}

/**
 * 卡片列表统一渲染入口：数量为 0 时显示空状态
 */
function renderItemList(listEl, emptyEl, items) {
  if (!items.length) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";
  listEl.innerHTML = items.map(renderItemCard).join("");
}

/**
 * 复制文本：优先用剪贴板 API，不可用时回退到 execCommand
 */
function copyText(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "readonly");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(input);
    ok ? resolve() : reject(new Error("copy failed"));
  });
}

/**
 * 页面从 bfcache 恢复时（点浏览器返回键），刷新回调里的内容
 */
function onPageRestore(handler) {
  window.addEventListener("pageshow", event => {
    if (event.persisted) handler();
  });
}

/**
 * 底部导航「私信」的未读红点
 */
function updateNavBadge() {
  const badge = document.getElementById("navBadge");
  if (!badge) return;

  const count = getUnreadCount();
  badge.textContent = count > 99 ? "99+" : String(count);
  badge.style.display = count > 0 ? "flex" : "none";
}

/**
 * 气泡里的时间：今天只显示时分，其他显示月-日 时分
 */
function formatMessageTime(timestamp) {
  const d = new Date(Number(timestamp));
  if (Number.isNaN(d.getTime())) return "";

  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (isToday(timestamp)) return hhmm;

  const mmdd = `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  if (d.getFullYear() === new Date().getFullYear()) return `${mmdd} ${hhmm}`;
  return `${d.getFullYear()}-${mmdd} ${hhmm}`;
}

/**
 * 消息气泡列表，chat.js 使用
 */
function renderMessageBubbles(messages, userName) {
  const who = userName || getCurrentUser();
  if (!messages.length) return "";

  return messages.map(message => {
    const mine = message.from === who;
    return `
      <div class="message-row ${mine ? "mine" : "theirs"}">
        <div class="bubble ${mine ? "mine" : "theirs"}">
          <p class="bubble-text">${escapeHtml(message.text)}</p>
          <span class="bubble-time">${escapeHtml(formatMessageTime(message.createdAt))}</span>
        </div>
      </div>
    `;
  }).join("");
}

// 页面加载后自动刷新未读红点（没有 #navBadge 的页面会自动跳过）
document.addEventListener("DOMContentLoaded", updateNavBadge);
