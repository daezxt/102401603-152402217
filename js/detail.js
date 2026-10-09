/**
 * detail.js
 * 详情页逻辑：根据 URL 参数 id 渲染详情、复制/申请联系方式
 */

// 当前正在查看的信息
let currentItem = null;

/**
 * 从 URL 里获取 id
 */
function getIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

/**
 * 返回按钮：有浏览历史就回上一页，直接打开本页时回首页
 */
function bindBackButton() {
  const backBtn = document.getElementById("backBtn");
  if (!backBtn) return;

  if (window.history.length > 1) {
    backBtn.addEventListener("click", event => {
      event.preventDefault();
      window.history.back();
    });
  }
}

/**
 * 私信入口：自己的信息不用给自己发私信
 */
function messageButton(item) {
  if (isMine(item)) return "";
  return `<a class="btn-copy btn-link" href="chat.html?itemId=${encodeURIComponent(item.id)}">💬 私信发布者</a>`;
}

/**
 * 联系方式区域：公开 / 本人 / 已同意 / 待同意 / 未申请 五种状态
 */
function renderContactSection(item) {
  if (item.contactMode !== "private") {
    // 有「私信发布者」时，复制联系方式退为次要按钮，主次更分明
    const copyClass = isMine(item) ? "btn-copy" : "btn-secondary";
    return `
      <div class="contact-box">
        <span class="contact-label">联系方式</span>
        <span class="contact-value">${escapeHtml(item.contact)}</span>
      </div>
      <div class="detail-actions">
        ${messageButton(item)}
        <button type="button" class="${copyClass}" data-action="copy">📋 复制联系方式</button>
      </div>
    `;
  }

  if (isMine(item)) {
    return `
      <div class="contact-box">
        <span class="contact-label">联系方式</span>
        <span class="contact-value">${escapeHtml(item.contact)}</span>
      </div>
      <p class="contact-note">你选择了「仅站内联系」：联系方式只有你和同意过申请的同学能看到，其他同学可以通过私信联系你。</p>
      <div class="detail-actions">
        <button type="button" class="btn-copy" data-action="copy">📋 复制联系方式</button>
      </div>
    `;
  }

  if (hasApprovedRequest(item.id)) {
    return `
      <div class="contact-box">
        <span class="contact-label">联系方式</span>
        <span class="contact-value">${escapeHtml(item.contact)}</span>
      </div>
      <p class="contact-note">发布者已同意你的联系申请。</p>
      <div class="detail-actions">
        ${messageButton(item)}
        <button type="button" class="btn-secondary" data-action="copy">📋 复制联系方式</button>
      </div>
    `;
  }

  const request = getMyRequest(item.id);
  const pending = request && request.status === "pending";

  return `
    <div class="contact-box">
      <span class="contact-label">联系方式</span>
      <span class="contact-value muted">🔒 发布者选择仅站内联系，不公开显示</span>
    </div>
    <p class="contact-note">
      ${pending
        ? "你的联系申请已发送，等待发布者同意；也可以直接私信对方。"
        : "先私信和发布者沟通，或者申请查看联系方式（对方同意后可见）。"}
    </p>
    <div class="detail-actions">
      ${messageButton(item)}
      <button type="button" class="btn-secondary" data-action="request" ${pending ? "disabled" : ""}>
        ${pending ? "⏳ 已申请，等待同意" : "📨 申请查看联系方式"}
      </button>
    </div>
  `;
}

/**
 * 渲染详情
 */
function renderDetail() {
  const container = document.getElementById("detailContent");
  const id = getIdFromUrl();
  const item = id ? getItemById(id) : null;

  currentItem = item;

  if (!item) {
    document.title = "没有找到该信息 - 校园失物招领";
    container.innerHTML = `
      <div class="empty-state">
        <p>没有找到该信息，可能已经被发布者删除</p>
        <p class="empty-action"><a class="link-btn" href="index.html">返回首页看看</a></p>
      </div>
    `;
    return;
  }

  document.title = `${item.title} - 校园失物招领`;

  const statusClass = getStatusClass(item.status);
  const typeClass = getTypeClass(item.type);

  container.innerHTML = `
    <!-- 物品大图（用 emoji 占位） -->
    <div class="detail-cover">
      <span class="detail-type-badge ${typeClass}">${escapeHtml(item.type)}</span>
      <span class="detail-cover-icon" aria-hidden="true">${getIconEmoji(item)}</span>
    </div>

    <!-- 标题 + 状态 -->
    <div class="detail-title-card">
      <div class="detail-title-row">
        <h2>${escapeHtml(item.title)}</h2>
        <span class="status-tag ${statusClass}">${escapeHtml(item.status)}</span>
      </div>
    </div>

    <!-- 信息表格 -->
    <div class="detail-info-card">
      <div class="info-row">
        <span class="info-label">物品名称</span>
        <span class="info-value">${escapeHtml(item.title)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">类型</span>
        <span class="info-value ${typeClass}">${escapeHtml(item.type)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">类别</span>
        <span class="info-value">${escapeHtml(getCategoryLabel(item.category))}</span>
      </div>
      <div class="info-row">
        <span class="info-label">时间</span>
        <span class="info-value">${escapeHtml(formatDisplayTime(item.eventTime))}</span>
      </div>
      <div class="info-row">
        <span class="info-label">地点</span>
        <span class="info-value">${escapeHtml(item.location)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">状态</span>
        <span class="info-value"><span class="status-tag ${statusClass}">${escapeHtml(item.status)}</span></span>
      </div>
    </div>

    <!-- 物品描述 -->
    <div class="detail-desc-card">
      <h3>物品描述</h3>
      <p>${escapeHtml(item.description)}</p>
    </div>

    <!-- 发布者 -->
    <div class="detail-publisher-card">
      <div class="publisher-avatar" aria-hidden="true">👤</div>
      <div class="publisher-info">
        <div class="publisher-name">
          ${escapeHtml(item.publisher)}${isMine(item) ? `<span class="self-tag">（我）</span>` : ""}
        </div>
        <div class="publisher-time">发布于 ${escapeHtml(formatDisplayTime(item.createdAt))}</div>
      </div>
      <span class="publisher-tag">${item.contactMode === "private" ? "仅站内联系" : "公开联系方式"}</span>
    </div>

    <!-- 联系方式 -->
    ${renderContactSection(item)}

    <!-- 发布者入口：只有本人能看到 -->
    ${isMine(item)
      ? `<p class="detail-tip">
           <a class="link-btn" href="mine.html">我是发布者，进入管理操作</a>
           ${getMessageCountForItem(item.id)
             ? ` · <a class="link-btn" href="messages.html">收到 ${getMessageCountForItem(item.id)} 条私信</a>`
             : ""}
         </p>`
      : ""}
  `;
}

/**
 * 联系方式按钮统一走事件委托，避免把联系方式拼进 onclick 字符串
 */
function bindDetailActions() {
  const container = document.getElementById("detailContent");

  container.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button || !currentItem) return;

    if (button.dataset.action === "copy") {
      copyText(currentItem.contact)
        .then(() => showToast("已复制：" + currentItem.contact))
        .catch(() => showToast("复制失败，联系方式：" + currentItem.contact));
      return;
    }

    if (button.dataset.action === "request") {
      addContactRequest(currentItem.id);
      showToast("申请已发送，等待发布者同意");
      renderDetail();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindBackButton();
  bindDetailActions();
  renderDetail();
  onPageRestore(renderDetail);
});
