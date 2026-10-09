/**
 * messages.js
 * 私信列表页：渲染会话、未读数、最后一条消息
 */

/**
 * 一条会话的展示文案
 */
function conversationPreview(conversation) {
  const last = getLastMessage(conversation);
  if (!last) return "还没有聊过，打个招呼吧";

  const prefix = last.from === getCurrentUser() ? "我：" : "";
  return prefix + last.text;
}

/**
 * 渲染会话列表
 */
function renderConversations() {
  const listEl = document.getElementById("conversationList");
  const emptyEl = document.getElementById("emptyState");
  const conversations = getConversationsForUser();

  updateNavBadge();

  if (!conversations.length) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  listEl.innerHTML = conversations.map(conversation => {
    const partner = getConversationPartner(conversation);
    const unread = getUnreadCount(conversation.id);
    const last = getLastMessage(conversation);
    const itemLabel = conversation.itemTitle || "（信息已删除）";

    return `
      <a class="conversation" href="chat.html?id=${encodeURIComponent(conversation.id)}">
        <span class="conv-avatar" aria-hidden="true">👤</span>
        <span class="conv-main">
          <span class="conv-head">
            <span class="conv-name">${escapeHtml(partner)}</span>
            <span class="conv-time">${escapeHtml(last ? formatDisplayTime(last.createdAt) : formatDisplayTime(conversation.createdAt))}</span>
          </span>
          <span class="conv-item">
            ${conversation.itemRemoved ? "已删除：" : ""}${escapeHtml(itemLabel)}
          </span>
          <span class="conv-preview">${escapeHtml(conversationPreview(conversation))}</span>
        </span>
        ${unread ? `<span class="conv-badge">${unread}</span>` : ""}
      </a>
    `;
  }).join("");
}

function initMessages() {
  renderConversations();
  onPageRestore(renderConversations);
  window.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderConversations();
  });
}

document.addEventListener("DOMContentLoaded", initMessages);
