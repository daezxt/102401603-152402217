/**
 * publish.js
 * 发布页逻辑：类型切换、表单校验、写入数据
 */

// 当前选中的发布类型
let currentPublishType = "寻物";

/**
 * 类型切换
 */
function bindTypeSwitch() {
  const buttons = document.querySelectorAll("#typeSwitch .type-btn");
  const hint = document.getElementById("typeHint");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPublishType = btn.dataset.type;

      // 更新提示文字
      if (currentPublishType === "寻物") {
        hint.textContent = "寻物：我丢失了东西，寻求帮助";
      } else {
        hint.textContent = "招领：我捡到了东西，寻找失主";
      }
    });
  });
}

/**
 * 表单提交
 */
function bindFormSubmit() {
  const form = document.getElementById("publishForm");

  form.addEventListener("submit", (e) => {
    e.preventDefault(); // 阻止默认提交刷新页面

    // 获取表单值
    const title = document.getElementById("itemTitle").value.trim();
    const time = document.getElementById("itemTime").value.trim();
    const location = document.getElementById("itemLocation").value.trim();
    const desc = document.getElementById("itemDesc").value.trim();
    const contact = document.getElementById("itemContact").value.trim();
    const contactMode = document.querySelector('input[name="contactMode"]:checked').value;

    // 校验
    if (!title) {
      showToast("请填写物品名称");
      return;
    }
    if (!time) {
      showToast("请填写时间");
      return;
    }
    if (!location) {
      showToast("请填写地点");
      return;
    }
    if (!desc) {
      showToast("请填写物品描述");
      return;
    }
    if (!contact) {
      showToast("请填写联系方式");
      return;
    }

    // 初始状态：寻物→寻找中，招领→待认领
    const status = currentPublishType === "寻物" ? "寻找中" : "待认领";

    // 写入数据
    addItem({
      type: currentPublishType,
      title,
      location,
      time,
      description: desc,
      contact,
      contactMode,
      category: "other", 
      status,
      icon: "box" // 默认图标
    });

    // 提示成功
    showToast("发布成功");

    // 延迟跳回首页
    setTimeout(function() {
      window.location.href = "index.html";
    }, 1000);
  });
}

/**
 * 显示 toast 提示
 */
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

/**
 * 页面初始化
 */
function initPublish() {
  bindTypeSwitch();
  bindFormSubmit();
}

document.addEventListener("DOMContentLoaded", initPublish);