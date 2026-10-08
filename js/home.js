/**
 * home.js
 * 首页逻辑：渲染卡片列表、处理筛选、更新统计
 */

// 当前选中的筛选类型
let currentType = "全部";

// 当前选中的物品类别
let currentCategory = "全部";

/**
 * 渲染卡片列表
 */
function renderCards() {
  const listEl = document.getElementById("cardList");
  const emptyEl = document.getElementById("emptyState");

  // 先按类型筛选，再按类别筛选
  let items = filterByType(currentType);
  if (currentCategory !== "全部") {
    items = items.filter(item => item.category === currentCategory);
  }

  // 更新统计数字
  document.getElementById("totalCount").textContent = items.length;

  if (items.length === 0) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  // 生成卡片 HTML
  listEl.innerHTML = items.map(item => {
    const statusClass = getStatusClass(item.status);
    return `
      <div class="card" onclick="location.href='detail.html?id=${item.id}'">
        <div class="card-icon">${getIconEmoji(item.icon)}</div>
        <div class="card-main">
          <div class="card-title-row">
            <span class="card-title">${item.title}</span>
            <span class="status-tag ${statusClass}">${item.status}</span>
          </div>
          <div class="card-location">📍 ${item.location}</div>
          <div class="card-time">🕐 ${item.time}</div>
        </div>
        <div class="card-type ${item.type === '寻物' ? 'type-lost' : 'type-found'}">
          ${item.type}
        </div>
      </div>
    `;
  }).join("");
}

/**
 * 更新「今日新增」数字
 * 简单统计 publishTime 以"今天"开头的信息
 */
function updateTodayCount() {
  const items = getAllItems();
  const todayItems = items.filter(item => item.publishTime.startsWith("今天"));
  document.getElementById("todayCount").textContent = todayItems.length;
}

/**
 * 绑定筛选标签点击事件
 */
function bindFilterTabs() {
  const tabs = document.querySelectorAll("#filterTabs .tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentType = tab.dataset.type;
      renderCards();
    });
  });
}
/**
 * 绑定物品类别筛选
 */
function bindCategoryTabs() {
  const tabs = document.querySelectorAll("#categoryTabs .cat-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentCategory = tab.dataset.cat;
      renderCards();
    });
  });
}



/**
 * 页面初始化
 */
function initHome() {
  updateTodayCount();
  bindFilterTabs();
  bindCategoryTabs();   // ← 新增
  renderCards();
}

// 页面加载完成后执行
document.addEventListener("DOMContentLoaded", initHome);