/**
 * publish.js
 * 发布 / 编辑页逻辑：类型切换、类别选择、表单校验、写入数据
 *
 * 带 ?id=xx 打开时是编辑模式，字段会预填并改为更新已有信息
 */

// 当前选中的发布类型
let currentPublishType = "寻物";

// 编辑模式下的信息 id（发布模式为 null）
let editingItemId = null;

/**
 * 从 URL 里获取要编辑的 id
 */
function getEditingId() {
  const id = new URLSearchParams(window.location.search).get("id");
  return id === null ? null : Number(id);
}

/**
 * 渲染类别下拉框
 */
function renderCategoryOptions() {
  const select = document.getElementById("itemCategory");
  select.innerHTML = CATEGORIES.map(category =>
    `<option value="${escapeHtml(category.id)}">${escapeHtml(category.label)}</option>`
  ).join("");
}

/**
 * 类型切换
 */
function bindTypeSwitch() {
  const buttons = document.querySelectorAll("#typeSwitch .type-btn");
  const hint = document.getElementById("typeHint");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");

      currentPublishType = btn.dataset.type;
      hint.textContent = currentPublishType === "寻物"
        ? "寻物：我丢失了东西，寻求帮助"
        : "招领：我捡到了东西，寻找失主";
    });
  });
}

/**
 * 根据类型选中对应的切换按钮（编辑模式预填用）
 */
function selectType(type) {
  const buttons = document.querySelectorAll("#typeSwitch .type-btn");
  const hint = document.getElementById("typeHint");

  currentPublishType = type === "招领" ? "招领" : "寻物";
  buttons.forEach(btn => {
    const active = btn.dataset.type === currentPublishType;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  hint.textContent = currentPublishType === "寻物"
    ? "寻物：我丢失了东西，寻求帮助"
    : "招领：我捡到了东西，寻找失主";
}

/**
 * 输入框字数统计
 */
function bindCounters() {
  const fields = [
    { input: "itemTitle", counter: "titleCount", limit: LIMITS.title },
    { input: "itemLocation", counter: "locationCount", limit: LIMITS.location },
    { input: "itemDesc", counter: "descCount", limit: LIMITS.description },
    { input: "itemContact", counter: "contactCount", limit: LIMITS.contact }
  ];

  fields.forEach(field => {
    const input = document.getElementById(field.input);
    const counter = document.getElementById(field.counter);

    const update = () => {
      const length = input.value.trim().length;
      counter.textContent = `${length}/${field.limit}`;
      counter.classList.toggle("over", length > field.limit);
    };

    input.addEventListener("input", update);
    update();
  });
}

/**
 * 校验表单，返回 { ok, message, data }
 */
function collectFormData() {
  const title = document.getElementById("itemTitle").value.trim();
  const location = document.getElementById("itemLocation").value.trim();
  const timeValue = document.getElementById("itemTime").value;
  const description = document.getElementById("itemDesc").value.trim();
  const contact = document.getElementById("itemContact").value.trim();
  const category = document.getElementById("itemCategory").value;
  const checkedMode = document.querySelector('input[name="contactMode"]:checked');
  const contactMode = checkedMode ? checkedMode.value : "public";

  if (!title) return { ok: false, message: "请填写物品名称" };
  if (title.length > LIMITS.title) return { ok: false, message: `物品名称最多 ${LIMITS.title} 个字` };
  if (!timeValue) return { ok: false, message: "请选择时间" };
  if (!location) return { ok: false, message: "请填写地点" };
  if (location.length > LIMITS.location) return { ok: false, message: `地点最多 ${LIMITS.location} 个字` };
  if (!description) return { ok: false, message: "请填写物品描述" };
  if (description.length > LIMITS.description) return { ok: false, message: `物品描述最多 ${LIMITS.description} 个字` };
  if (!contact) return { ok: false, message: "请填写联系方式" };
  if (contact.length > LIMITS.contact) return { ok: false, message: `联系方式最多 ${LIMITS.contact} 个字` };

  const eventTime = fromDateTimeLocalValue(timeValue);
  if (eventTime === null) return { ok: false, message: "时间格式不正确，请重新选择" };

  return {
    ok: true,
    data: {
      type: currentPublishType,
      title: title,
      location: location,
      eventTime: eventTime,
      description: description,
      contact: contact,
      contactMode: contactMode,
      category: category,
      icon: category
    }
  };
}

/**
 * 表单提交
 */
function bindFormSubmit() {
  const form = document.getElementById("publishForm");

  form.addEventListener("submit", event => {
    event.preventDefault(); // 阻止默认提交刷新页面

    const result = collectFormData();
    if (!result.ok) {
      showToast(result.message);
      return;
    }

    if (editingItemId !== null) {
      const updated = updateItem(editingItemId, result.data);
      if (!updated) {
        showToast("这条信息已经不存在了");
        return;
      }
      showToast("修改已保存");
      setTimeout(() => { window.location.href = "mine.html"; }, 900);
      return;
    }

    // 初始状态：寻物→寻找中，招领→待认领
    result.data.status = currentPublishType === "寻物" ? "寻找中" : "待认领";
    addItem(result.data);

    showToast("发布成功");
    setTimeout(() => { window.location.href = "index.html"; }, 900);
  });
}

/**
 * 编辑模式：预填已有信息
 */
function prefillForEdit() {
  const id = getEditingId();
  if (id === null) return;

  const item = getItemById(id);
  if (!item) {
    showToast("没有找到要编辑的信息");
    return;
  }

  if (!isMine(item)) {
    showToast("只能编辑自己发布的信息");
    setTimeout(() => { window.location.href = "index.html"; }, 900);
    return;
  }

  editingItemId = item.id;
  document.title = "编辑信息 - 校园失物招领";
  document.getElementById("pageTitle").textContent = "编辑信息";
  document.getElementById("publishTip").textContent = "修改后点保存，其他同学看到的就是最新内容。";
  document.getElementById("submitBtn").textContent = "保存修改";

  selectType(item.type);
  document.getElementById("itemTitle").value = item.title || "";
  document.getElementById("itemLocation").value = item.location || "";
  document.getElementById("itemTime").value = toDateTimeLocalValue(item.eventTime);
  document.getElementById("itemDesc").value = item.description || "";
  document.getElementById("itemContact").value = item.contact || "";
  document.getElementById("itemCategory").value = item.category || "other";

  const mode = document.querySelector(`input[name="contactMode"][value="${item.contactMode}"]`);
  if (mode) mode.checked = true;
}

/**
 * 页面初始化
 */
function initPublish() {
  renderCategoryOptions();
  document.getElementById("itemTime").value = toDateTimeLocalValue(Date.now());
  bindTypeSwitch();
  bindFormSubmit();
  prefillForEdit(); // 先预填，再初始化字数统计，计数器才是准的
  bindCounters();
}

document.addEventListener("DOMContentLoaded", initPublish);
