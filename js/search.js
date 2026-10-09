/**
 * search.js
 * 搜索页逻辑：关键词搜索、快捷标签、空状态
 */

// 输入防抖定时器
let searchTimer = null;

/**
 * 渲染搜索结果
 */
function renderSearchResults(keyword) {
  const listEl = document.getElementById("cardList");
  const emptyEl = document.getElementById("emptyState");
  const items = queryItems({ keyword });

  document.getElementById("resultCount").textContent = items.length;

  const text = String(keyword == null ? "" : keyword).trim();
  emptyEl.textContent = text
    ? `没有找到和「${text}」相关的信息，换个关键词试试`
    : "暂时还没有任何信息";

  renderItemList(listEl, emptyEl, items);
}

/**
 * 绑定搜索输入框（输入防抖，避免每敲一个字就重排列表）
 */
function bindSearchInput() {
  const input = document.getElementById("searchInput");

  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderSearchResults(input.value), 150);
  });
}

/**
 * 绑定快捷标签
 */
function bindQuickTags() {
  const container = document.getElementById("quickTags");

  container.addEventListener("click", event => {
    const tag = event.target.closest(".quick-tag");
    if (!tag) return;

    const input = document.getElementById("searchInput");
    input.value = tag.dataset.kw;
    renderSearchResults(tag.dataset.kw);
  });
}

/**
 * 页面初始化
 */
function initSearch() {
  bindSearchInput();
  bindQuickTags();
  renderSearchResults(""); // 初始显示全部
  document.getElementById("searchInput").focus();

  onPageRestore(() => renderSearchResults(document.getElementById("searchInput").value));
}

document.addEventListener("DOMContentLoaded", initSearch);
