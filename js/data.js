/**
 * data.js
 * 校园失物招领 —— 数据层
 * 负责：常量定义、种子数据、localStorage 读写、查询与格式化工具
 *
 * 数据模型（每条 item）：
 *   id          Number  唯一自增 id
 *   type        String  "寻物" | "招领"
 *   title       String  物品名称
 *   location    String  地点
 *   eventTime   Number  事件发生时间（时间戳，毫秒）
 *   createdAt   Number  发布时间（时间戳，毫秒）
 *   description String  物品描述
 *   contact     String  联系方式（是否可见由 contactMode 决定）
 *   contactMode String  "public" | "private"
 *   category    String  见 CATEGORIES
 *   status      String  见 STATUS_OPTIONS
 *   publisher   String  发布者昵称
 *   icon        String  可选，图标标识，缺省时用 category
 */

/* ==================== 常量 ==================== */

// localStorage 的 key，所有页面都统一用这个
const STORAGE_KEY = "campusLostFoundItems";
const REQUEST_STORAGE_KEY = "campusLostFoundRequests";
const USER_STORAGE_KEY = "campusLostFoundCurrentUser";
const MESSAGE_STORAGE_KEY = "campusLostFoundConversations";

/**
 * 演示身份列表：本地没有后端，靠切换身份来体验「别人发给我」的私信
 * 名字和种子数据里的发布者保持一致
 */
const DEMO_USERS = [
  { name: "李同学", dept: "计算机学院" },
  { name: "王同学", dept: "外国语学院" },
  { name: "张同学", dept: "机械工程学院" },
  { name: "刘同学", dept: "经济管理学院" },
  { name: "赵同学", dept: "数学学院" },
  { name: "陈同学", dept: "电子信息学院" }
];

const DEFAULT_USER = "李同学";

/**
 * 老版本发布时把发布者直接存成了「我」这个字面量（publisher: item.publisher || "我"），
 * 读到这类数据时要还原成真实账号，否则详情页会显示「我」、这些信息也不会出现在「我的发布」里
 */
const LEGACY_SELF_PUBLISHER = "我";

/**
 * 当前登录用户（存在 localStorage，可在「我的」页切换）
 */
function getCurrentUser() {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  for (let i = 0; i < DEMO_USERS.length; i++) {
    if (DEMO_USERS[i].name === stored) return DEMO_USERS[i].name;
  }
  return DEFAULT_USER;
}

function setCurrentUser(name) {
  for (let i = 0; i < DEMO_USERS.length; i++) {
    if (DEMO_USERS[i].name === name) {
      try {
        localStorage.setItem(USER_STORAGE_KEY, DEMO_USERS[i].name);
      } catch (e) {
        console.warn("保存当前用户失败：", e);
      }
      return true;
    }
  }
  return false;
}

function getUserDept(name) {
  const who = name || getCurrentUser();
  for (let i = 0; i < DEMO_USERS.length; i++) {
    if (DEMO_USERS[i].name === who) return DEMO_USERS[i].dept;
  }
  return "校园用户";
}

// 物品类别：首页筛选标签、发布页下拉框共用一份定义
const CATEGORIES = [
  { id: "card", label: "校园卡" },
  { id: "device", label: "电子设备" },
  { id: "key", label: "钥匙" },
  { id: "book", label: "书籍" },
  { id: "umbrella", label: "雨伞" },
  { id: "cup", label: "水杯" },
  { id: "other", label: "其他" }
];

// 类型 → 可选状态，避免出现「招领 + 已找到」这类非法组合
const STATUS_OPTIONS = {
  "寻物": ["寻找中", "已找到"],
  "招领": ["待认领", "已归还"]
};

// 表单长度上限（同时用于前端校验和字数统计展示）
const LIMITS = {
  title: 30,
  location: 30,
  description: 200,
  contact: 50,
  message: 200
};

// icon 标识 → emoji
const ICON_EMOJI = {
  card: "💳",
  tablet: "📱",
  phone: "📱",
  earbuds: "🎧",
  umbrella: "☂️",
  key: "🔑",
  cup: "🥤",
  book: "📚",
  box: "📦"
};

// 搜索同义词：命中任意一个词，就把整组词都当作关键词
const SEARCH_SYNONYMS = [
  ["水杯", "保温杯", "杯子", "水壶"],
  ["雨伞", "伞"],
  ["耳机", "airpods", "earpods"],
  ["校园卡", "饭卡", "一卡通"],
  ["充电宝", "移动电源"],
  ["钥匙", "钥匙扣"]
];

/* ==================== 时间工具 ==================== */

function pad2(value) {
  return String(value).padStart(2, "0");
}

/**
 * 取「N 天前的某时某分」的时间戳，用于生成种子数据
 */
function daysAgoAt(daysAgo, hours, minutes) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

/**
 * 当天 0 点的时间戳，用于按「天」比较
 */
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 时间戳 → 展示文案："今天 08:20" / "昨天 19:40" / "3 天前 20:15" / "09-24 10:20"
 */
function formatDisplayTime(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value)) return "时间未知";

  const d = new Date(value);
  const now = new Date();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS);
  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  if (dayDiff === 0) return `今天 ${hhmm}`;
  if (dayDiff === 1) return `昨天 ${hhmm}`;
  if (dayDiff > 1 && dayDiff < 7) return `${dayDiff} 天前 ${hhmm}`;

  const mmdd = `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  if (d.getFullYear() === now.getFullYear()) return `${mmdd} ${hhmm}`;
  return `${d.getFullYear()}-${mmdd} ${hhmm}`;
}

/**
 * 是否发生在今天（用于「今日新增」统计）
 */
function isToday(timestamp) {
  const d = new Date(Number(timestamp));
  if (Number.isNaN(d.getTime())) return false;
  return startOfDay(d) === startOfDay(new Date());
}

/**
 * 时间戳 → <input type="datetime-local"> 需要的格式
 */
function toDateTimeLocalValue(timestamp) {
  const d = new Date(Number(timestamp));
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
         `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * <input type="datetime-local"> 的值 → 时间戳
 */
function fromDateTimeLocalValue(value) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * 解析旧版本里存的展示字符串（"今天 08:20" / "昨天 19:40" / "09-26 20:15"）
 * 迁移老数据用，解析失败返回 null
 */
function parseLegacyTime(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const text = value.trim();
  let m = text.match(/^今天\s*(\d{1,2}):(\d{2})$/);
  if (m) return daysAgoAt(0, Number(m[1]), Number(m[2]));

  m = text.match(/^昨天\s*(\d{1,2}):(\d{2})$/);
  if (m) return daysAgoAt(1, Number(m[1]), Number(m[2]));

  m = text.match(/^(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const d = new Date();
    d.setMonth(Number(m[1]) - 1, Number(m[2]));
    d.setHours(Number(m[3]), Number(m[4]), 0, 0);
    return d.getTime();
  }

  const parsed = Date.parse(text.replace(" ", "T"));
  return Number.isNaN(parsed) ? null : parsed;
}

/* ==================== 种子数据 ==================== */

/**
 * 种子数据：一打开网页就应该有这些信息
 * 时间基于「当前时间」生成，所以「今日新增」永远是准的
 */
function createSeedData() {
  return [
    {
      id: 1,
      type: "寻物",
      title: "校园卡（2023 级）",
      location: "三号食堂二楼",
      eventTime: daysAgoAt(0, 8, 20),
      description: "卡面印有姓名与学号，外套透明塑料卡套。早上在三号食堂二楼买早餐后不见了，可能是刷卡时滑落。",
      contact: "QQ: 123456",
      contactMode: "public",
      category: "card",
      status: "寻找中",
      publisher: "李同学",
      createdAt: daysAgoAt(0, 8, 35),
      icon: "card"
    },
    {
      id: 2,
      type: "招领",
      title: "iPad Air 平板电脑",
      location: "图书馆 4 楼自习区",
      eventTime: daysAgoAt(1, 19, 40),
      description: "深空灰色 iPad Air，带一支 Apple Pencil，锁屏壁纸是蓝色风景照。已交至图书馆前台，失主可凭购买凭证认领。",
      contact: "微信: ipad_owner",
      contactMode: "public",
      category: "device",
      status: "待认领",
      publisher: "王同学",
      createdAt: daysAgoAt(1, 20, 10),
      icon: "tablet"
    },
    {
      id: 3,
      type: "寻物",
      title: "黑色自动长柄雨伞",
      location: "教一 305 教室",
      eventTime: daysAgoAt(1, 16, 30),
      description: "黑色自动长柄伞，伞柄上贴了一小段黄色胶带做标记。下课后落在教一 305，回去找已经不见了。",
      contact: "手机: 138****5678",
      contactMode: "public",
      category: "umbrella",
      status: "寻找中",
      publisher: "张同学",
      createdAt: daysAgoAt(1, 17, 0),
      icon: "umbrella"
    },
    {
      id: 4,
      type: "招领",
      title: "AirPods 耳机充电盒",
      location: "体育馆羽毛球场",
      eventTime: daysAgoAt(4, 20, 15),
      description: "白色 AirPods 充电盒，盒盖内侧刻有「WY」两个字母。在体育馆羽毛球场 3 号场地捡到。",
      contact: "QQ: 87654321",
      contactMode: "public",
      category: "device",
      status: "已归还",
      publisher: "陈同学",
      createdAt: daysAgoAt(4, 21, 0),
      icon: "earbuds"
    },
    {
      id: 5,
      type: "寻物",
      title: "宿舍钥匙（蓝色钥匙扣）",
      location: "6 号宿舍楼下",
      eventTime: daysAgoAt(5, 12, 10),
      description: "一把宿舍钥匙，挂着一个蓝色塑料钥匙扣，上面有个小猫挂件。从宿舍楼出去吃饭时还在，回来就找不到了。",
      contact: "微信: key_blue",
      contactMode: "private",
      category: "key",
      status: "已找到",
      publisher: "李同学",
      createdAt: daysAgoAt(5, 13, 0),
      icon: "key"
    },
    {
      id: 6,
      type: "招领",
      title: "白色保温杯 500ml",
      location: "第二教学楼 A 区走廊",
      eventTime: daysAgoAt(9, 15, 45),
      description: "白色保温杯，容量约 500ml，杯身有轻微划痕，杯盖是黑色。放在二教 A 区走廊窗台上。",
      contact: "手机: 139****1234",
      contactMode: "private",
      category: "cup",
      status: "待认领",
      publisher: "刘同学",
      createdAt: daysAgoAt(9, 16, 30),
      icon: "cup"
    },
    {
      id: 7,
      type: "寻物",
      title: "《数据结构与算法》教材",
      location: "图书馆 2 楼",
      eventTime: daysAgoAt(15, 10, 20),
      description: "一本《数据结构与算法分析》，书里夹着几张手写笔记，封面右下角写有名字。",
      contact: "QQ: 55556666",
      contactMode: "private",
      category: "book",
      status: "寻找中",
      publisher: "赵同学",
      createdAt: daysAgoAt(15, 11, 0),
      icon: "book"
    }
  ];
}

/* ==================== 存储读写 ==================== */

/**
 * 老版本数据迁移：把 "今天 08:20" 这类展示字符串换成真实时间戳
 * 返回 { items, changed }
 */
function migrateItems(rawItems) {
  let changed = false;

  const items = (Array.isArray(rawItems) ? rawItems : [])
    .filter(item => item && typeof item === "object")
    .map(item => {
      const next = { ...item };

      if (typeof next.createdAt !== "number") {
        next.createdAt = parseLegacyTime(next.publishTime) == null ? Date.now() : parseLegacyTime(next.publishTime);
        changed = true;
      }
      if (typeof next.eventTime !== "number") {
        next.eventTime = parseLegacyTime(next.time) == null ? next.createdAt : parseLegacyTime(next.time);
        changed = true;
      }
      if (next.time !== undefined) { delete next.time; changed = true; }
      if (next.publishTime !== undefined) { delete next.publishTime; changed = true; }
      if (!Number.isFinite(Number(next.id))) { next.id = Number(next.id) || 0; changed = true; }
      if (!next.category) { next.category = "other"; changed = true; }
      if (!next.contactMode) { next.contactMode = "public"; changed = true; }
      if (!next.publisher) {
        next.publisher = "匿名同学";
        changed = true;
      } else if (next.publisher === LEGACY_SELF_PUBLISHER) {
        // 旧数据里的「我」= 发布这条信息时的本地账号
        next.publisher = DEFAULT_USER;
        changed = true;
      }
      if (!STATUS_OPTIONS[next.type] || STATUS_OPTIONS[next.type].indexOf(next.status) === -1) {
        next.status = STATUS_OPTIONS[next.type] ? STATUS_OPTIONS[next.type][0] : "寻找中";
        changed = true;
      }

      return next;
    });

  return { items: items, changed: changed };
}

function writeItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    // 存储被禁用或写满时，不让整页崩掉
    console.warn("保存数据失败：", e);
  }
}

/**
 * 读取全部信息
 * 如果 localStorage 里没有，就用种子数据初始化
 */
function getAllItems() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const seed = createSeedData();
    writeItems(seed);
    return seed;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("数据格式不正确");

    const migrated = migrateItems(parsed);
    if (migrated.changed) writeItems(migrated.items);
    return migrated.items;
  } catch (e) {
    // 数据损坏时的兜底
    console.warn("本地数据损坏，已重置为种子数据：", e);
    const seed = createSeedData();
    writeItems(seed);
    return seed;
  }
}

/**
 * 保存全部信息
 */
function saveAllItems(items) {
  writeItems(items);
}

/**
 * 生成下一个可用 id
 */
function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

/* ==================== 查询 ==================== */

/**
 * 按发布时间从新到旧排序（返回新数组，不改原数组）
 */
function sortByCreatedAtDesc(items) {
  const copy = items.slice();
  copy.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  return copy;
}

/**
 * 关键词扩展：命中同义词组时，把整组词都作为关键词
 */
function expandKeyword(keyword) {
  const kw = String(keyword == null ? "" : keyword).trim().toLowerCase();
  if (!kw) return [];

  const terms = [kw];
  const seen = {};
  seen[kw] = true;

  SEARCH_SYNONYMS.forEach(group => {
    const hit = group.some(word => {
      const w = word.toLowerCase();
      return w.indexOf(kw) !== -1 || kw.indexOf(w) !== -1;
    });
    if (!hit) return;
    group.forEach(word => {
      const w = word.toLowerCase();
      if (!seen[w]) {
        seen[w] = true;
        terms.push(w);
      }
    });
  });

  return terms;
}

/**
 * 关键词是否命中一条信息（匹配名称、描述、地点）
 */
function matchesKeyword(item, keyword) {
  const terms = expandKeyword(keyword);
  if (terms.length === 0) return true;

  const haystack = [item.title, item.description, item.location]
    .map(value => String(value == null ? "" : value).toLowerCase())
    .join(" ");

  if (terms.some(term => haystack.indexOf(term) !== -1)) return true;

  // 中文关键词退一步做「逐字命中」，例如「校园卡」也能搜到「校园一卡通」
  const compact = terms[0].replace(/\s+/g, "");
  if (compact.length > 1 && /[\u4e00-\u9fa5]/.test(compact)) {
    return compact.split("").every(ch => haystack.indexOf(ch) !== -1);
  }

  return false;
}

/**
 * 纯函数版查询：给一组数据，按条件过滤 + 排序（便于单独测试）
 */
function applyQuery(items, options) {
  const opts = options || {};
  let result = Array.isArray(items) ? items.slice() : [];

  if (opts.type && opts.type !== "全部") {
    result = result.filter(item => item.type === opts.type);
  }
  if (opts.category && opts.category !== "全部") {
    result = result.filter(item => item.category === opts.category);
  }
  if (opts.status && opts.status !== "全部") {
    result = result.filter(item => item.status === opts.status);
  }
  if (opts.keyword) {
    result = result.filter(item => matchesKeyword(item, opts.keyword));
  }

  return sortByCreatedAtDesc(result);
}

/**
 * 从 localStorage 查询
 */
function queryItems(options) {
  return applyQuery(getAllItems(), options);
}

/**
 * 按关键词搜索（名称 / 描述 / 地点）
 */
function searchItems(keyword) {
  return queryItems({ keyword: keyword });
}

/**
 * 按类型筛选（"全部" / "寻物" / "招领"）
 */
function filterByType(type) {
  return queryItems({ type: type });
}

/**
 * 根据 id 获取一条信息
 */
function getItemById(id) {
  const target = Number(id);
  if (!Number.isFinite(target)) return null;
  return getAllItems().find(item => item.id === target) || null;
}

/* ==================== 增删改 ==================== */

/**
 * 新增一条信息（发布）
 * 自动生成 id、发布时间、发布者，并兜住非法状态
 */
function addItem(item) {
  const items = getAllItems();
  const type = item.type === "招领" ? "招领" : "寻物";
  const statusOptions = STATUS_OPTIONS[type];

  const newItem = {
    category: "other",
    icon: "",
    contactMode: "public",
    title: "",
    location: "",
    description: "",
    contact: "",
    eventTime: Date.now(),
    publisher: getCurrentUser(),
    status: statusOptions[0],
    type: type
  };

  Object.keys(item || {}).forEach(key => { newItem[key] = item[key]; });

  newItem.id = nextId(items);
  newItem.type = type;
  newItem.publisher = newItem.publisher || getCurrentUser();
  newItem.status = statusOptions.indexOf(newItem.status) === -1 ? statusOptions[0] : newItem.status;
  newItem.createdAt = Date.now();
  newItem.icon = newItem.icon || newItem.category;

  items.push(newItem);
  saveAllItems(items);
  return newItem;
}

/**
 * 修改一条信息（编辑）：只更新传入的字段，保留原 id 与 createdAt
 */
function updateItem(id, patch) {
  const target = Number(id);
  const items = getAllItems();
  let index = -1;
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === target) { index = i; break; }
  }
  if (index === -1) return null;

  const merged = Object.assign({}, items[index], patch || {});
  merged.id = target;
  merged.createdAt = items[index].createdAt;
  merged.type = merged.type === "招领" ? "招领" : "寻物";
  if (STATUS_OPTIONS[merged.type].indexOf(merged.status) === -1) {
    merged.status = STATUS_OPTIONS[merged.type][0];
  }
  merged.icon = merged.icon || merged.category;

  items[index] = merged;
  saveAllItems(items);
  syncConversationTitles(target, merged.title); // 私信里显示的是信息标题，跟着一起更新
  return merged;
}

/**
 * 删除一条信息（连带清掉它的联系申请；私信记录保留，只标记信息已删除）
 */
function removeItem(id) {
  const target = Number(id);
  const items = getAllItems();
  const rest = items.filter(item => item.id !== target);
  if (rest.length === items.length) return false;

  saveAllItems(rest);
  writeRequests(readRequests().filter(request => request.itemId !== target));

  const conversations = readConversations();
  let touched = false;
  conversations.forEach(conversation => {
    if (conversation.itemId === target && !conversation.itemRemoved) {
      conversation.itemRemoved = true;
      touched = true;
    }
  });
  if (touched) writeConversations(conversations);

  return true;
}

/**
 * 更新一条信息的状态
 */
function updateItemStatus(id, newStatus) {
  const target = Number(id);
  const items = getAllItems();
  let item = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === target) { item = items[i]; break; }
  }
  if (!item) return null;
  if (STATUS_OPTIONS[item.type].indexOf(newStatus) === -1) return item;

  item.status = newStatus;
  saveAllItems(items);
  return item;
}

/**
 * 这条信息是不是当前用户发布的
 */
function isMine(item) {
  return !!item && item.publisher === getCurrentUser();
}

/* ==================== 联系申请（私密联系方式） ==================== */

/**
 * 私密联系方式不能直接看：发布者本人可见，
 * 其他人需要发一条申请，等发布者同意后才能看到
 */
function readRequests() {
  const raw = localStorage.getItem(REQUEST_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("联系申请数据损坏，已重置：", e);
    return [];
  }
}

function writeRequests(requests) {
  try {
    localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.warn("保存联系申请失败：", e);
  }
}

function getContactRequests(itemId) {
  const all = readRequests();
  if (itemId === undefined || itemId === null) return all;
  return all.filter(request => request.itemId === Number(itemId));
}

function getPendingRequestCount(itemId) {
  return getContactRequests(itemId).filter(request => request.status === "pending").length;
}

/**
 * 申请查看联系方式；同一个人对同一条信息只保留一条申请
 */
function addContactRequest(itemId, requester) {
  const target = Number(itemId);
  const who = requester || getCurrentUser();
  const requests = readRequests();
  let existing = null;
  for (let i = 0; i < requests.length; i++) {
    if (requests[i].itemId === target && requests[i].requester === who) { existing = requests[i]; break; }
  }

  if (existing) {
    if (existing.status === "rejected") {
      existing.status = "pending";
      existing.createdAt = Date.now();
      writeRequests(requests);
    }
    return existing;
  }

  const request = { id: Date.now(), itemId: target, requester: who, status: "pending", createdAt: Date.now() };
  requests.push(request);
  writeRequests(requests);
  return request;
}

function resolveContactRequest(requestId, approved) {
  const requests = readRequests();
  let request = null;
  for (let i = 0; i < requests.length; i++) {
    if (requests[i].id === Number(requestId)) { request = requests[i]; break; }
  }
  if (!request) return null;

  request.status = approved ? "approved" : "rejected";
  writeRequests(requests);
  return request;
}

function hasApprovedRequest(itemId, requester) {
  const who = requester || getCurrentUser();
  return getContactRequests(itemId).some(r => r.requester === who && r.status === "approved");
}

function getMyRequest(itemId, requester) {
  const who = requester || getCurrentUser();
  return getContactRequests(itemId).find(r => r.requester === who) || null;
}

/**
 * 当前用户能不能看到这条信息的联系方式
 */
function canViewContact(item) {
  if (!item) return false;
  if (item.contactMode !== "private") return true;
  if (isMine(item)) return true;
  return hasApprovedRequest(item.id);
}

/* ==================== 私信 ==================== */

/**
 * 会话按「一条信息 + 两个人」唯一，消息直接挂在会话里
 * conversation: { id, itemId, itemTitle, itemRemoved, participants: [a, b], createdAt, updatedAt, messages: [] }
 * message:      { id, from, text, createdAt, read }
 */
function readConversations() {
  const raw = localStorage.getItem(MESSAGE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(conversation =>
      conversation && Array.isArray(conversation.participants) && Array.isArray(conversation.messages)
    );
  } catch (e) {
    console.warn("私信数据损坏，已重置：", e);
    return [];
  }
}

function writeConversations(conversations) {
  try {
    localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.warn("保存私信失败：", e);
  }
}

function nextConversationId(conversations) {
  return conversations.reduce((max, conversation) => Math.max(max, Number(conversation.id) || 0), 0) + 1;
}

function nextMessageId(messages) {
  return messages.reduce((max, message) => Math.max(max, Number(message.id) || 0), 0) + 1;
}

/**
 * 我参与的全部会话，最近有消息的排在前面
 */
function getConversationsForUser(userName) {
  const who = userName || getCurrentUser();
  return readConversations()
    .filter(conversation => conversation.participants.indexOf(who) !== -1)
    .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
}

function getConversationById(id) {
  const target = Number(id);
  if (!Number.isFinite(target)) return null;
  return readConversations().find(conversation => conversation.id === target) || null;
}

/**
 * 我和某条信息的发布者之间的会话
 */
function findConversation(itemId, userName) {
  const who = userName || getCurrentUser();
  const target = Number(itemId);
  return readConversations().find(conversation =>
    conversation.itemId === target && conversation.participants.indexOf(who) !== -1
  ) || null;
}

/**
 * 打开（或新建）我和某条信息发布者的会话；给自己的信息发私信返回 null
 */
function getOrCreateConversation(itemId, userName) {
  const who = userName || getCurrentUser();
  const item = getItemById(itemId);
  if (!item || item.publisher === who) return null;

  const existing = findConversation(item.id, who);
  if (existing) return existing;

  const now = Date.now();
  const conversations = readConversations();
  const conversation = {
    id: nextConversationId(conversations),
    itemId: item.id,
    itemTitle: item.title,
    itemRemoved: false,
    participants: [who, item.publisher].sort(),
    createdAt: now,
    updatedAt: now,
    messages: []
  };

  conversations.push(conversation);
  writeConversations(conversations);
  return conversation;
}

/**
 * 发一条私信
 */
function sendMessage(conversationId, text, sender) {
  const content = String(text == null ? "" : text).trim();
  if (!content) return { ok: false, message: "请先输入内容" };
  if (content.length > LIMITS.message) {
    return { ok: false, message: `单条私信最多 ${LIMITS.message} 个字` };
  }

  const conversations = readConversations();
  const conversation = conversations.find(entry => entry.id === Number(conversationId));
  if (!conversation) return { ok: false, message: "会话不存在" };

  const message = {
    id: nextMessageId(conversation.messages),
    from: sender || getCurrentUser(),
    text: content,
    createdAt: Date.now(),
    read: false
  };

  conversation.messages.push(message);
  conversation.updatedAt = message.createdAt;
  conversation.itemRemoved = !getItemById(conversation.itemId);

  writeConversations(conversations);
  return { ok: true, message: message, conversation: conversation };
}

function getConversationPartner(conversation, userName) {
  if (!conversation) return "";
  const who = userName || getCurrentUser();
  for (let i = 0; i < conversation.participants.length; i++) {
    if (conversation.participants[i] !== who) return conversation.participants[i];
  }
  return who;
}

function getLastMessage(conversation) {
  if (!conversation || !conversation.messages.length) return null;
  return conversation.messages[conversation.messages.length - 1];
}

/**
 * 未读数：不传 conversationId 就是全部会话的合计（底部导航红点用）
 */
function getUnreadCount(conversationId, userName) {
  const who = userName || getCurrentUser();
  const scope = conversationId === undefined || conversationId === null
    ? getConversationsForUser(who)
    : readConversations().filter(conversation => conversation.id === Number(conversationId));

  return scope.reduce((total, conversation) =>
    total + conversation.messages.filter(message => message.from !== who && !message.read).length, 0);
}

/**
 * 进入会话时把对方发来的消息标记为已读，返回本次标记的条数
 */
function markConversationRead(conversationId, userName) {
  const who = userName || getCurrentUser();
  const conversations = readConversations();
  const conversation = conversations.find(entry => entry.id === Number(conversationId));
  if (!conversation) return 0;

  let changed = 0;
  conversation.messages.forEach(message => {
    if (message.from !== who && !message.read) {
      message.read = true;
      changed++;
    }
  });

  if (changed) writeConversations(conversations);
  return changed;
}

/**
 * 信息标题改名后，同步会话里缓存的标题
 */
function syncConversationTitles(itemId, title) {
  const target = Number(itemId);
  const conversations = readConversations();
  let changed = false;

  conversations.forEach(conversation => {
    if (conversation.itemId === target && conversation.itemTitle !== title) {
      conversation.itemTitle = title;
      changed = true;
    }
  });

  if (changed) writeConversations(conversations);
}

/**
 * 我发布的每条信息各收到几条私信
 */
function getMessageCountForItem(itemId) {
  const target = Number(itemId);
  return readConversations()
    .filter(conversation => conversation.itemId === target)
    .reduce((total, conversation) => total + conversation.messages.length, 0);
}

/* ==================== 展示辅助 ==================== */

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
 * 根据类型返回对应的 CSS 类名
 */
function getTypeClass(type) {
  return type === "寻物" ? "type-lost" : "type-found";
}

function isActiveStatus(status) {
  return status === "寻找中" || status === "待认领";
}

function isDoneStatus(status) {
  return status === "已找到" || status === "已归还";
}

/**
 * 根据类别标识返回 emoji（item.icon 优先，缺省用 category）
 */
function getIconEmoji(item) {
  if (!item) return ICON_EMOJI.box;
  return ICON_EMOJI[item.icon] || ICON_EMOJI[item.category] || ICON_EMOJI.box;
}

/**
 * 类别 id → 中文标签
 */
function getCategoryLabel(categoryId) {
  for (let i = 0; i < CATEGORIES.length; i++) {
    if (CATEGORIES[i].id === categoryId) return CATEGORIES[i].label;
  }
  return "其他";
}
