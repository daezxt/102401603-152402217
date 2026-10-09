/**
 * mine.js
 * 我的发布：渲染我的信息、统计、修改状态、编辑、删除、处理联系申请
 */

// 面板当前操作的信息 id
let sheetItemId = null;

/**
 * 获取我发布的信息（按发布时间从新到旧）
 */
function getMyItems() {
  return sortByCreatedAtDesc(getAllItems().filter(isMine));
}

/**
 * 渲染用户卡片（昵称来自 data.js，不再写死在 HTML 里）
 */
function renderUserCard() {
  document.getElementById("userName").textContent = getCurrentUser();
  document.getElementById("userSub").textContent = `${getUserDept()} · 发布于校园失物招领平台`;
}

/**
 * 演示身份下拉框
 */
function renderUserSwitch() {
  const select = document.getElementById("userSwitch");
  const current = getCurrentUser();

  select.innerHTML = DEMO_USERS.map(user =>
    `<option value="${escapeHtml(user.name)}" ${user.name === current ? "selected" : ""}>
       ${escapeHtml(user.name)}（${escapeHtml(user.dept)}）
     </option>`
  ).join("");

  select.addEventListener("change", () => {
    if (!setCurrentUser(select.value)) return;
    showToast(`已切换为「${select.value}」`);
    renderUserCard();
    refresh();
  });
}

/**
 * 渲染统计
 */
function renderStats() {
  const items = getMyItems();
  const active = items.filter(item => isActiveStatus(item.status)).length;
  const done = items.filter(item => isDoneStatus(item.status)).length;

  document.getElementById("mineCount").textContent = items.length;
  document.getElementById("statAll").textContent = items.length;
  document.getElementById("statActive").textContent = active;
  document.getElementById("statDone").textContent = done;
}

/**
 * 渲染我的发布列表
 */
function renderMineList() {
  const listEl = document.getElementById("mineList");
  const emptyEl = document.getElementById("emptyState");
  const items = getMyItems();

  if (!items.length) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  listEl.innerHTML = items.map(item => {
    const statusClass = getStatusClass(item.status);
    const isDone = isDoneStatus(item.status);
    const pendingCount = getPendingRequestCount(item.id);
    const messageCount = getMessageCountForItem(item.id);

    return `
      <div class="mine-card">
        <div class="mine-card-head">
          <div class="card-icon" aria-hidden="true">${getIconEmoji(item)}</div>
          <div class="mine-card-info">
            <div class="mine-card-title">
              <span>${escapeHtml(item.title)}</span>
              <span class="status-tag ${statusClass}">${escapeHtml(item.status)}</span>
            </div>
            <div class="mine-card-meta">
              <span class="mine-type ${getTypeClass(item.type)}">${escapeHtml(item.type)}</span>
              <span class="mine-time">${escapeHtml(formatDisplayTime(item.eventTime))}</span>
            </div>
          </div>
        </div>

        ${pendingCount
          ? `<button type="button" class="request-banner" data-requests="${item.id}">
               📨 ${pendingCount} 条联系申请待处理
             </button>`
          : ""}

        ${messageCount
          ? `<a class="message-banner" href="messages.html">💬 ${messageCount} 条私信，去私信页查看</a>`
          : ""}

        <div class="mine-card-actions">
          <button type="button" class="action-btn" data-detail="${item.id}">查看详情</button>
          <button type="button" class="action-btn" data-edit="${item.id}">编辑</button>
          <button type="button" class="action-btn primary" data-status="${item.id}" ${isDone ? "disabled" : ""}>
            ${isDone ? "已完成" : "修改状态"}
          </button>
        </div>
        <button type="button" class="action-btn danger" data-delete="${item.id}">删除这条信息</button>
      </div>
    `;
  }).join("");
}

/* ==================== 底部面板 ==================== */

function openSheet(title, bodyHtml) {
  document.getElementById("sheetTitle").textContent = title;
  document.getElementById("sheetOptions").innerHTML = bodyHtml;
  document.getElementById("sheetMask").classList.add("show");
  document.getElementById("sheet").classList.add("show");
}

function closeSheet() {
  document.getElementById("sheetMask").classList.remove("show");
  document.getElementById("sheet").classList.remove("show");
  sheetItemId = null;
}

/**
 * 修改状态面板
 */
function openStatusSheet(id) {
  const item = getItemById(id);
  if (!item) return;

  sheetItemId = item.id;
  const options = STATUS_OPTIONS[item.type] || [];

  openSheet("修改状态", options.map(option => `
    <button type="button" class="sheet-option" data-pick="${escapeHtml(option)}">${escapeHtml(option)}</button>
  `).join(""));
}

/**
 * 联系申请面板
 */
function openRequestSheet(id) {
  const item = getItemById(id);
  if (!item) return;

  sheetItemId = item.id;
  const requests = getContactRequests(item.id);

  const body = requests.length
    ? requests.map(request => `
        <div class="request-row">
          <div class="request-info">
            <div class="request-name">${escapeHtml(request.requester)}</div>
            <div class="request-time">${escapeHtml(formatDisplayTime(request.createdAt))} · ${
              request.status === "pending" ? "等待处理" : (request.status === "approved" ? "已同意" : "已拒绝")
            }</div>
          </div>
          ${request.status === "pending"
            ? `<div class="request-actions">
                 <button type="button" class="action-btn primary" data-approve="${request.id}">同意</button>
                 <button type="button" class="action-btn" data-reject="${request.id}">拒绝</button>
               </div>`
            : ""}
        </div>
      `).join("")
    : `<p class="sheet-empty">还没有收到联系申请</p>`;

  openSheet("联系申请", body);
}

/**
 * 修改状态
 */
function changeStatus(newStatus) {
  if (sheetItemId == null) return;

  updateItemStatus(sheetItemId, newStatus);
  closeSheet();
  showToast("状态已更新为「" + newStatus + "」");
  refresh();
}

/**
 * 处理联系申请
 */
function handleRequest(requestId, approved) {
  resolveContactRequest(requestId, approved);
  showToast(approved ? "已同意，对方可以查看联系方式" : "已拒绝该申请");

  if (sheetItemId != null) openRequestSheet(sheetItemId);
  refresh();
}

/**
 * 删除
 */
function deleteItem(id) {
  const item = getItemById(id);
  if (!item) return;

  if (!window.confirm(`确定删除「${item.title}」吗？删除后无法恢复。`)) return;

  removeItem(id);
  showToast("已删除");
  refresh();
}

/* ==================== 事件绑定 ==================== */

function bindListActions() {
  const listEl = document.getElementById("mineList");

  listEl.addEventListener("click", event => {
    const button = event.target.closest("button[data-detail], button[data-edit], button[data-status], button[data-delete], button[data-requests]");
    if (!button) return;

    const dataset = button.dataset;
    if (dataset.detail) location.href = `detail.html?id=${encodeURIComponent(dataset.detail)}`;
    else if (dataset.edit) location.href = `publish.html?id=${encodeURIComponent(dataset.edit)}`;
    else if (dataset.status) openStatusSheet(Number(dataset.status));
    else if (dataset.delete) deleteItem(Number(dataset.delete));
    else if (dataset.requests) openRequestSheet(Number(dataset.requests));
  });
}

function bindSheet() {
  const options = document.getElementById("sheetOptions");

  options.addEventListener("click", event => {
    const pick = event.target.closest("[data-pick]");
    if (pick) {
      changeStatus(pick.dataset.pick);
      return;
    }

    const approve = event.target.closest("[data-approve]");
    if (approve) {
      handleRequest(Number(approve.dataset.approve), true);
      return;
    }

    const reject = event.target.closest("[data-reject]");
    if (reject) handleRequest(Number(reject.dataset.reject), false);
  });

  document.getElementById("sheetMask").addEventListener("click", closeSheet);
  document.getElementById("sheetCancel").addEventListener("click", closeSheet);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSheet();
  });
}

/**
 * 刷新页面上的所有数字和列表
 */
function refresh() {
  renderStats();
  renderMineList();
  updateNavBadge();
}

/**
 * 初始化
 */
function initMine() {
  renderUserCard();
  renderUserSwitch();
  refresh();
  bindListActions();
  bindSheet();

  // 从编辑页返回时刷新
  onPageRestore(refresh);
}

document.addEventListener("DOMContentLoaded", initMine);
