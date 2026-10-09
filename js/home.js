/**
 * home.js
 * 首页逻辑：渲染卡片列表、类型/类别筛选、今日新增统计
 */

// 当前选中的筛选类型
let currentType = "全部";

// 当前选中的物品类别
let currentCategory = "全部";

/**
 * 渲染类别筛选标签（类别定义来自 data.js，避免两处维护）
 */
function renderCategoryTabs() {
  const container = document.getElementById("categoryTabs");
  const all = [{ id: "全部", label: "全部" }].concat(CATEGORIES);

  container.innerHTML = all.map(category => `
    <button type="button" class="cat-tab ${category.id === currentCategory ? "active" : ""}"
            data-cat="${escapeHtml(category.id)}"
            aria-pressed="${category.id === currentCategory}">
      ${escapeHtml(category.label)}
    </button>
  `).join("");
}

/**
 * 渲染卡片列表
 */
function renderCards() {
  const listEl = document.getElementById("cardList");
  const emptyEl = document.getElementById("emptyState");
  const items = queryItems({ type: currentType, category: currentCategory });

  document.getElementById("totalCount").textContent = items.length;
  renderItemList(listEl, emptyEl, items);
}

/**
 * 更新「今日新增」：按真实发布时间统计，跨天后自动归零
 */
function updateTodayCount() {
  const count = getAllItems().filter(item => isToday(item.createdAt)).length;
  document.getElementById("todayCount").textContent = count;
}

/**
 * 绑定类型筛选标签
 */
function bindFilterTabs() {
  const tabs = document.querySelectorAll("#filterTabs .tab");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-pressed", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-pressed", "true");
      currentType = tab.dataset.type;
      renderCards();
    });
  });
}

/**
 * 绑定类别筛选标签（事件委托，标签由 JS 渲染）
 */
function bindCategoryTabs() {
  const container = document.getElementById("categoryTabs");

  container.addEventListener("click", event => {
    const tab = event.target.closest(".cat-tab");
    if (!tab) return;

    container.querySelectorAll(".cat-tab").forEach(t => {
      t.classList.remove("active");
      t.setAttribute("aria-pressed", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-pressed", "true");

    currentCategory = tab.dataset.cat;
    renderCards();
  });
}

/**
 * 页面初始化
 */
function initHome() {
  renderCategoryTabs();
  bindFilterTabs();
  bindCategoryTabs();
  updateTodayCount();
  renderCards();

  // 从详情页返回（bfcache）时刷新，避免看到过期数据
  onPageRestore(() => {
    updateTodayCount();
    renderCards();
  });
}

document.addEventListener("DOMContentLoaded", initHome);
