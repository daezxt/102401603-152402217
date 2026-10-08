/**
 * search.js
 * 搜索页逻辑：关键词搜索、快捷标签、空状态
 */

/**
 * 渲染搜索结果
 */
function renderSearchResults(keyword) {
  const listEl = document.getElementById("cardList");
  const emptyEl = document.getElementById("emptyState");
  const countEl = document.getElementById("resultCount");

  const items = searchItems(keyword);
  countEl.textContent = items.length;

  if (items.length === 0) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

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
 * 绑定搜索输入框
 */
function bindSearchInput() {
  const input = document.getElementById("searchInput");
  input.addEventListener("input", () => {
    renderSearchResults(input.value);
  });
}

/**
 * 绑定快捷标签
 */
function bindQuickTags() {
  const tags = document.querySelectorAll("#quickTags .quick-tag");
  const input = document.getElementById("searchInput");
  tags.forEach(tag => {
    tag.addEventListener("click", () => {
      input.value = tag.dataset.kw;
      renderSearchResults(tag.dataset.kw);
    });
  });
}

/**
 * 页面初始化
 */
function initSearch() {
  bindSearchInput();
  bindQuickTags();
  renderSearchResults(""); // 初始显示全部
}

document.addEventListener("DOMContentLoaded", initSearch);
