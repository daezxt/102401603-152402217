/**
 * detail.js
 * 详情页逻辑：根据 URL 参数 id 渲染详情、复制联系方式
 */

/**
 * 从 URL 里获取 id
 */
function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}


/**
 * 渲染详情
 */
function renderDetail() {
  const id = getIdFromUrl();
  const container = document.getElementById("detailContent");

  if (!id) {
    container.innerHTML = `<div class="empty-state">没有找到该信息</div>`;
    return;
  }

  const item = getItemById(id);

  if (!item) {
    container.innerHTML = `<div class="empty-state">没有找到该信息</div>`;
    return;
  }

  const statusClass = getStatusClass(item.status);
  const typeClass = item.type === "寻物" ? "type-lost" : "type-found";

  container.innerHTML = `
    <!-- 物品大图（用 emoji 占位） -->
    <div class="detail-cover">
      <span class="detail-type-badge ${typeClass}">${item.type}</span>
      <span class="detail-cover-icon">${getIconEmoji(item.icon)}</span>
    </div>

    <!-- 标题 + 状态 -->
    <div class="detail-title-card">
      <div class="detail-title-row">
        <h2>${item.title}</h2>
        <span class="status-tag ${statusClass}">${item.status}</span>
      </div>
    </div>

    <!-- 信息表格 -->
    <div class="detail-info-card">
      <div class="info-row">
        <span class="info-label">物品名称</span>
        <span class="info-value">${item.title}</span>
      </div>
      <div class="info-row">
        <span class="info-label">类型</span>
        <span class="info-value ${typeClass}">${item.type}</span>
      </div>
      <div class="info-row">
        <span class="info-label">时间</span>
        <span class="info-value">${item.time}</span>
      </div>
      <div class="info-row">
        <span class="info-label">地点</span>
        <span class="info-value">${item.location}</span>
      </div>
      <div class="info-row">
        <span class="info-label">状态</span>
        <span class="info-value"><span class="status-tag ${statusClass}">${item.status}</span></span>
      </div>
    </div>

    <!-- 物品描述 -->
    <div class="detail-desc-card">
      <h3>物品描述</h3>
      <p>${item.description}</p>
    </div>

    <!-- 发布者 -->
    <div class="detail-publisher-card">
      <div class="publisher-avatar">👤</div>
      <div class="publisher-info">
        <div class="publisher-name">${item.publisher}</div>
        <div class="publisher-time">发布于 ${item.publishTime}</div>
      </div>
      <span class="publisher-tag">${item.contactMode === 'private' ? '仅站内联系' : '公开联系方式'}</span>
    </div>

    <!-- 底部按钮 -->
    <div class="detail-actions">
      ${item.contactMode === 'private'
        ? `<button class="btn-copy disabled" disabled>🔒 仅站内联系</button>`
        : `<button class="btn-copy" onclick="copyContact('${item.contact}')">📋 复制联系方式</button>`
      }
    </div>
    <p class="detail-tip" onclick="location.href='mine.html'">我是发布者，进入管理操作</p>
  `;
}

/**
 * 复制联系方式
 */
function copyContact(contact) {
  navigator.clipboard.writeText(contact).then(() => {
    showToast("已复制：" + contact);
  }).catch(() => {
    showToast("联系方式：" + contact);
  });
}

/**
 * Toast 提示
 */
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

document.addEventListener("DOMContentLoaded", renderDetail);