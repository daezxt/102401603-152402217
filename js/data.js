/**
 * data.js
 * 校园失物招领 —— 数据层
 * 负责：数据结构定义、种子数据、localStorage 读写
 */

// localStorage 的 key，所有页面都统一用这个
const STORAGE_KEY = "campusLostFoundItems";

// 种子数据：一打开网页就应该有这些信息
const SEED_DATA = [
  {
    id: 1,
    type: "寻物",
    title: "校园卡（2023 级）",
    location: "三号食堂二楼",
    time: "今天 08:20",
    description: "卡面印有姓名与学号，外套透明塑料卡套。早上在三号食堂二楼买早餐后不见了，可能是刷卡时滑落。",
    contact: "QQ: 123456",
    contactMode: "public",
    category: "card",
    status: "寻找中",
    publisher: "李同学",
    publishTime: "今天 08:35",
    icon: "card"
  },
  {
    id: 2,
    type: "招领",
    title: "iPad Air 平板电脑",
    location: "图书馆 4 楼自习区",
    time: "昨天 19:40",
    description: "深空灰色 iPad Air，带一支 Apple Pencil，锁屏壁纸是蓝色风景照。已交至图书馆前台，失主可凭购买凭证认领。",
    contact: "微信: ipad_owner",
    contactMode: "public",
    category: "device",
    status: "待认领",
    publisher: "王同学",
    publishTime: "昨天 20:10",
    icon: "tablet"
  },
  {
    id: 3,
    type: "寻物",
    title: "黑色自动长柄雨伞",
    location: "教一 305 教室",
    time: "昨天 16:30",
    description: "黑色自动长柄伞，伞柄上贴了一小段黄色胶带做标记。下课后落在教一 305，回去找已经不见了。",
    contact: "手机: 138****5678",
    contactMode: "public",
    category: "umbrella",
    status: "寻找中",
    publisher: "张同学",
    publishTime: "昨天 17:00",
    icon: "umbrella"
  },
  {
    id: 4,
    type: "招领",
    title: "AirPods 耳机充电盒",
    location: "体育馆羽毛球场",
    time: "09-26 20:15",
    description: "白色 AirPods 充电盒，盒盖内侧刻有「WY」两个字母。在体育馆羽毛球场 3 号场地捡到。",
    contact: "QQ: 87654321",
    contactMode: "public",
    category: "device",
    status: "已归还",
    publisher: "陈同学",
    publishTime: "09-26 21:00",
    icon: "earbuds"
  },
  {
    id: 5,
    type: "寻物",
    title: "宿舍钥匙（蓝色钥匙扣）",
    location: "6 号宿舍楼下",
    time: "09-26 12:10",
    description: "一把宿舍钥匙，挂着一个蓝色塑料钥匙扣，上面有个小猫挂件。从宿舍楼出去吃饭时还在，回来就找不到了。",
    contact: "微信: key_blue",
    contactMode: "private",
    category: "key",
    status: "已找到",
    publisher: "李同学",
    publishTime: "09-26 13:00",
    icon: "key"
  },
  {
    id: 6,
    type: "招领",
    title: "白色保温杯 500ml",
    location: "第二教学楼 A 区走廊",
    time: "09-25 15:45",
    description: "白色保温杯，容量约 500ml，杯身有轻微划痕，杯盖是黑色。放在二教 A 区走廊窗台上。",
    contact: "手机: 139****1234",
    contactMode: "private",
    category: "other",
    status: "待认领",
    publisher: "刘同学",
    publishTime: "09-25 16:30",
    icon: "cup"
  },
  {
    id: 7,
    type: "寻物",
    title: "《数据结构与算法》教材",
    location: "图书馆 2 楼",
    time: "09-24 10:20",
    description: "一本《数据结构与算法分析》，书里夹着几张手写笔记，封面右下角写有名字。",
    contact: "QQ: 55556666",
    contactMode: "private",
    category: "book",
    status: "寻找中",
    publisher: "赵同学",
    publishTime: "09-24 11:00",
    icon: "book"
  }
];

/**
 * 读取全部信息
 * 如果 localStorage 里没有，就用种子数据初始化
 */
function getAllItems() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // 第一次打开，写入种子数据
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return [...SEED_DATA];
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    // 数据损坏时的兜底
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return [...SEED_DATA];
  }
}

/**
 * 保存全部信息
 */
function saveAllItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * 根据 id 获取一条信息
 */
function getItemById(id) {
  const items = getAllItems();
  return items.find(item => item.id === Number(id));
}

/**
 * 新增一条信息（发布）
 * 自动生成 id 和发布信息
 */
function addItem(item) {
  const items = getAllItems();
  const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  const newItem = {
    ...item,
    id: newId,
    publishTime: formatNow(),
    publisher: item.publisher || "我"
  };
  items.push(newItem);
  saveAllItems(items);
  return newItem;
}

/**
 * 更新一条信息的状态
 */
function updateItemStatus(id, newStatus) {
  const items = getAllItems();
  const target = items.find(item => item.id === Number(id));
  if (target) {
    target.status = newStatus;
    saveAllItems(items);
  }
  return target;
}

/**
 * 按关键词搜索（匹配标题和描述）
 */
function searchItems(keyword) {
  const items = getAllItems();
  const kw = String(keyword || "").trim().toLowerCase();
  if (!kw) return items;
  return items.filter(item =>
    item.title.toLowerCase().includes(kw) ||
    item.description.toLowerCase().includes(kw)
  );
}

/**
 * 按类型筛选（"全部" / "寻物" / "招领"）
 */
function filterByType(type) {
  const items = getAllItems();
  if (!type || type === "全部") return items;
  return items.filter(item => item.type === type);
}

/**
 * 生成当前时间的展示字符串，比如 "今天 09:30"
 */
function formatNow() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `今天 ${hh}:${mm}`;
}

/**
 * 根据状态返回对应的 CSS 类名
 */
function getStatusClass(status) {
  if (status === "寻找中") return "status-searching";
  if (status === "待认领") return "status-waiting";
  if (status === "已找到" || status === "已归还") return "status-done";
  return "";
}

/**
 * 根据 icon 标识返回 emoji
 */
function getIconEmoji(icon) {
  const map = {
    card: "💳",
    tablet: "📱",
    umbrella: "☂️",
    earbuds: "🎧",
    key: "🔑",
    cup: "🥤",
    book: "📚",
    box: "📦"
  };
  return map[icon] || "📦";
}