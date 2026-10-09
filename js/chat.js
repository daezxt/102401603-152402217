/**
 * chat.js
 * 私信会话页
 *
 * 两种进入方式：
 *   chat.html?id=3       打开已有会话
 *   chat.html?itemId=5   和这条信息的发布者聊天（没有会话就新建）
 */

let activeConversationId = null;

/**
 * 从 URL 找到（或创建）要打开的会话
 */
function resolveConversation() {
  const params = new URLSearchParams(window.location.search);

  const id = params.get("id");
  if (id) return getConversationById(id);

  const itemId = params.get("itemId");
  if (itemId) return getOrCreateConversation(itemId);

  return null;
}

/**
 * 让消息列表始终停在最新一条
 */
function scrollToLatest() {
  const listEl = document.getElementById("messageList");
  listEl.scrollTop = listEl.scrollHeight;
}

/**
 * 渲染整个会话页
 */
function renderChat() {
  const listEl = document.getElementById("messageList");
  const emptyEl = document.getElementById("emptyState");
  const formEl = document.getElementById("messageForm");
  const conversation = activeConversationId === null ? resolveConversation() : getConversationById(activeConversationId);
  const who = getCurrentUser();
  const isParticipant = !!conversation && conversation.participants.indexOf(who) !== -1;

  updateNavBadge();

  if (!isParticipant) {
    listEl.innerHTML = "";
    emptyEl.textContent = conversation
      ? `这个会话不属于当前身份（${who}），请切换回对话双方之一`
      : "会话不存在或已被清理";
    emptyEl.style.display = "block";
    formEl.style.display = "none";
    document.getElementById("chatTitle").textContent = "私信";
    document.title = "私信 - 校园失物招领";
    return;
  }

  activeConversationId = conversation.id;
  formEl.style.display = "flex";
  emptyEl.style.display = "none";

  const partner = getConversationPartner(conversation);
  const itemLink = `detail.html?id=${encodeURIComponent(conversation.itemId)}`;

  document.getElementById("chatTitle").textContent = partner;
  document.title = `和 ${partner} 的私信 - 校园失物招领`;

  const itemEl = document.getElementById("chatItem");
  itemEl.textContent = conversation.itemRemoved
    ? `${conversation.itemTitle || "这条信息"}（已删除）`
    : `关于：${conversation.itemTitle || "这条信息"}`;
  itemEl.href = conversation.itemRemoved ? "index.html" : itemLink;

  listEl.innerHTML = conversation.messages.length
    ? renderMessageBubbles(conversation.messages)
    : `<p class="message-empty">还没有聊天记录，直接给对方发条消息吧</p>`;

  // 打开会话就算已读
  markConversationRead(conversation.id);
  updateNavBadge();
}

/**
 * 发送
 */
function bindMessageForm() {
  const form = document.getElementById("messageForm");
  const input = document.getElementById("messageInput");

  form.addEventListener("submit", event => {
    event.preventDefault();

    if (activeConversationId === null) return;

    const result = sendMessage(activeConversationId, input.value);
    if (!result.ok) {
      showToast(result.message);
      return;
    }

    input.value = "";
    renderChat();
    scrollToLatest();
    input.focus();
  });
}

function initChat() {
  bindMessageForm();
  renderChat();
  scrollToLatest();

  // 别的标签页发来消息时同步（localStorage 的 storage 事件只在其他标签页触发）
  window.addEventListener("storage", event => {
    if (event.key === MESSAGE_STORAGE_KEY) renderChat();
  });

  window.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderChat();
  });
}

document.addEventListener("DOMContentLoaded", initChat);
