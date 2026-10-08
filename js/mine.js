/**
 * mine.js
 * 我的发布：渲染我的信息、统计、修改状态
 */

// 当前用户（模拟，先写死）
const CURRENT_USER = "李同学";

// 当前正在修改的信息 id
let editingId = null;

/**
 * 获取我发布的信息
 */
function getMyItems() {
  return getAllItems().filter(item => item.publisher === CURRENT_USER);
}

/**
 * 渲染统计
 */
function renderStats() {
  const items = getMyItems();
  const all = items.length;
  const active = items.filter(i => i.status === "寻找中" || i.status === "待认领").length;
  const done = items.filter(i => i.status === "已找到" || i.status === "已归还").length;

  document.getElementById("mineCount").textContent = all;
  document.getElementById("statAll").textContent = all;
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

  if (items.length === 0) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  listEl.innerHTML = items.map(item => {
    const statusClass = getStatusClass(item.status);
    const isDone = item.status === "已找到" || item.status === "已归还";
    return `
      <div class="mine-card">
        <div class="mine-card-head">
          <div class="card-icon">${getIconEmoji(item.icon)}</div>
          <div class="mine-card-info">
            <div class="mine-card-title">
              <span>${item.title}</span>
              <span class="status-tag ${statusClass}">${item.status}</span>
            </div>
            <div class="mine-card-meta">
              <span class="mine-type ${item.type === '寻物' ? 'type-lost' : 'type-found'}">${item.type}</span>
              <span class="mine-time">${item.time}</span>
            </div>
          </div>
        </div>
        <div class="mine-card-actions">
          <button class="action-btn" onclick="location.href='detail.html?id=${item.id}'">查看详情</button>
          <button class="action-btn primary" ${isDone ? 'disabled' : ''} onclick="openSheet(${item.id}, '${item.type}')">
            ${isDone ? '已完成' : '修改状态'}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * 打开修改状态面板
 */
function openSheet(id, type) {
  editingId = id;
  const options = type === "寻物"
    ? ["寻找中", "已找到"]
    : ["待认领", "已归还"];

  const optionsEl = document.getElementById("sheetOptions");
  optionsEl.innerHTML = options.map(opt => `
    <button class="sheet-option" onclick="changeStatus('${opt}')">${opt}</button>
  `).join("");

  document.getElementById("sheetMask").classList.add("show");
  document.getElementById("sheet").classList.add("show");
}

/**
 * 关闭修改状态面板
 */
function closeSheet() {
  document.getElementById("sheetMask").classList.remove("show");
  document.getElementById("sheet").classList.remove("show");
  editingId = null;
}

/**
 * 修改状态
 */
function changeStatus(newStatus) {
  if (editingId == null) return;
  updateItemStatus(editingId, newStatus);
  closeSheet();
  showToast("已更新");
  renderStats();
  renderMineList();
}



/**
 * Toast
 */
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

/**
 * 初始化
 */
function initMine() {
  renderStats();
  renderMineList();
}

document.addEventListener("DOMContentLoaded", initMine);