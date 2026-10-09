/**
 * tests.js
 * 极简测试运行器 + 用例，直接在浏览器里跑（打开 tests/test.html）
 * 只测纯逻辑，不依赖真实 localStorage
 */

const testResults = [];

function test(name, fn) {
  try {
    fn();
    testResults.push({ name: name, ok: true });
  } catch (e) {
    testResults.push({ name: name, ok: false, error: e && e.message ? e.message : String(e) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "断言失败");
}

function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message || "值不相等"}：期望 ${b}，实际 ${a}`);
}

function assertIncludes(text, part, message) {
  if (String(text).indexOf(part) === -1) {
    throw new Error(`${message || "缺少内容"}：${JSON.stringify(String(text).slice(0, 120))} 里找不到 ${JSON.stringify(part)}`);
  }
}

function assertNotIncludes(text, part, message) {
  if (String(text).indexOf(part) !== -1) {
    throw new Error(`${message || "包含不该出现的内容"}：${JSON.stringify(String(text).slice(0, 120))} 里出现了 ${JSON.stringify(part)}`);
  }
}

/* ==================== 测试夹具 ==================== */

function makeItem(overrides) {
  return Object.assign({
    id: 1,
    type: "寻物",
    title: "白色保温杯 500ml",
    location: "第二教学楼 A 区走廊",
    eventTime: Date.now() - 3600 * 1000,
    createdAt: Date.now() - 3600 * 1000,
    description: "白色保温杯，杯盖是黑色。",
    contact: "QQ: 123456",
    contactMode: "public",
    category: "cup",
    status: "寻找中",
    publisher: "刘同学",
    icon: "cup"
  }, overrides || {});
}


/**
 * 每个用例开始前重置存储和身份，避免用例之间互相影响
 */
function resetAll() {
  localStorage.clear();
  saveAllItems([]);
  setCurrentUser(DEFAULT_USER);
}

/* ==================== 用例 ==================== */

test("escapeHtml 会转义 HTML 标签和引号", () => {
  assertEqual(escapeHtml("<img src=x onerror=alert(1)>"), "&lt;img src=x onerror=alert(1)&gt;");
  assertEqual(escapeHtml(`O'Brien "同学" & 你`), "O&#39;Brien &quot;同学&quot; &amp; 你");
  assertEqual(escapeHtml(null), "");
});

test("卡片渲染不会把用户输入当 HTML 执行", () => {
  const html = renderItemCard(makeItem({ title: "<script>alert(1)</script>", location: "\" onmouseover=x" }));
  assertNotIncludes(html, "<script>", "标题里的 script 标签没有被转义");
  assertNotIncludes(html, "\" onmouseover", "地点里的引号没有被转义");
  assertIncludes(html, "&lt;script&gt;");
});

test("formatDisplayTime 能区分今天 / 昨天 / 更早", () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 20).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const fourDaysAgo = today - 4 * 24 * 60 * 60 * 1000;

  assertEqual(formatDisplayTime(today), "今天 08:20");
  assertEqual(formatDisplayTime(yesterday), "昨天 08:20");
  assertEqual(formatDisplayTime(fourDaysAgo), "4 天前 08:20");
  assertEqual(formatDisplayTime("坏数据"), "时间未知");
});

test("isToday 只对当天为真", () => {
  assert(isToday(Date.now()), "当前时间应该是今天");
  assert(!isToday(Date.now() - 3 * 24 * 60 * 60 * 1000), "三天前不该算今天");
  assert(!isToday(undefined), "非法值不该算今天");
});

test("datetime-local 的值和时间戳可以互相转换", () => {
  const stamp = new Date(2026, 8, 26, 20, 15).getTime();
  assertEqual(toDateTimeLocalValue(stamp), "2026-09-26T20:15");
  assertEqual(fromDateTimeLocalValue("2026-09-26T20:15"), stamp);
  assertEqual(fromDateTimeLocalValue(""), null);
});

test("parseLegacyTime 能解析旧版本的展示字符串", () => {
  const today = parseLegacyTime("今天 08:20");
  assert(typeof today === "number", "「今天 08:20」没解析出时间戳");
  assert(isToday(today), "「今天 08:20」应该落在今天");

  const yesterday = parseLegacyTime("昨天 19:40");
  assertEqual(new Date(yesterday).getHours(), 19);
  assertEqual(parseLegacyTime("垃圾数据"), null);
});

test("migrateItems 把老数据升级成时间戳字段", () => {
  const legacy = [{
    id: 1,
    type: "寻物",
    title: "校园卡",
    location: "三号食堂",
    description: "描述",
    contact: "QQ: 1",
    contactMode: "public",
    category: "card",
    status: "寻找中",
    publisher: "李同学",
    time: "今天 08:20",
    publishTime: "今天 08:35"
  }];

  const result = migrateItems(legacy);

  assert(result.changed, "迁移应该报告数据发生了变化");
  assertEqual(result.items[0].time, undefined);
  assertEqual(result.items[0].publishTime, undefined);
  assert(typeof result.items[0].eventTime === "number", "eventTime 没有生成");
  assert(typeof result.items[0].createdAt === "number", "createdAt 没有生成");
});

test("migrateItems 会兜住非法的类型和状态组合", () => {
  const result = migrateItems([makeItem({ id: 2, type: "招领", status: "已找到" })]);
  assertEqual(result.items[0].status, "待认领", "招领不该出现「已找到」");
  assert(result.changed);
});

test("老数据里的发布者「我」会迁移成真实账号", () => {
  resetAll();

  const result = migrateItems([{
    id: 1,
    type: "寻物",
    title: "校园卡",
    location: "三号食堂",
    description: "描述",
    contact: "QQ: 1",
    contactMode: "public",
    category: "card",
    status: "寻找中",
    publisher: "我",          // 旧版本存进去的字面量
    time: "今天 08:20",
    publishTime: "今天 08:35"
  }]);

  assert(result.changed, "迁移应该报告数据发生了变化");
  assertEqual(result.items[0].publisher, DEFAULT_USER, "「我」应该还原成当前账号");
  assert(isMine(result.items[0]), "迁移后这条信息应该算当前账号发布的");
});

test("迁移后的老数据会写回存储，并出现在「我的发布」里", () => {
  resetAll();

  localStorage.setItem(STORAGE_KEY, JSON.stringify([{
    id: 1,
    type: "寻物",
    title: "旧版发布的信息",
    location: "图书馆",
    description: "d",
    contact: "QQ: 1",
    contactMode: "public",
    category: "book",
    status: "寻找中",
    publisher: "我",
    time: "昨天 09:00",
    publishTime: "昨天 09:10"
  }]));

  const mine = getAllItems().filter(isMine);
  assertEqual(mine.length, 1, "旧数据应该出现在我的发布里");
  assertEqual(mine[0].publisher, DEFAULT_USER);

  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assertEqual(stored[0].publisher, DEFAULT_USER, "迁移结果应该写回存储");

  // 换成别的身份后，这条信息不再算我的
  setCurrentUser("王同学");
  assertEqual(getAllItems().filter(isMine).length, 0, "切换账号后不该再算这条信息的发布者");
});

test("nextId 取最大 id 加一", () => {
  assertEqual(nextId([]), 1);
  assertEqual(nextId([{ id: 1 }, { id: 7 }, { id: 3 }]), 8);
});

test("同义词扩展：搜「水杯」能带上「保温杯」", () => {
  const terms = expandKeyword("水杯");
  assert(terms.indexOf("水杯") !== -1);
  assert(terms.indexOf("保温杯") !== -1, "同义词组没有展开");
  assertEqual(expandKeyword(""), []);
});

test("applyQuery 按关键词命中名称 / 描述 / 地点", () => {
  const items = [
    makeItem({ id: 1, title: "白色保温杯 500ml", description: "杯身有轻微划痕，杯盖是黑色。" }),
    makeItem({ id: 2, title: "黑色自动长柄雨伞", description: "伞柄上贴了黄色胶带。", category: "umbrella", location: "教一 305" }),
    makeItem({ id: 3, title: "校园卡", description: "卡面印有姓名与学号。", category: "card", location: "图书馆 2 楼" })
  ];

  assertEqual(applyQuery(items, { keyword: "水杯" }).map(i => i.id), [1], "同义词搜索没命中保温杯");
  assertEqual(applyQuery(items, { keyword: "图书馆" }).map(i => i.id), [3], "地点没有参与搜索");
  assertEqual(applyQuery(items, { keyword: "雨伞" }).map(i => i.id), [2]);
  assertEqual(applyQuery(items, { keyword: "不存在的东西" }).length, 0);
});

test("applyQuery 支持类型 / 类别 / 状态筛选", () => {
  const items = [
    makeItem({ id: 1, type: "寻物", category: "card", status: "寻找中" }),
    makeItem({ id: 2, type: "招领", category: "device", status: "待认领" }),
    makeItem({ id: 3, type: "寻物", category: "card", status: "已找到" })
  ];

  assertEqual(applyQuery(items, { type: "招领" }).map(i => i.id), [2]);
  assertEqual(applyQuery(items, { category: "card" }).map(i => i.id).sort(), [1, 3]);
  assertEqual(applyQuery(items, { status: "已找到" }).map(i => i.id), [3]);
  assertEqual(applyQuery(items, { type: "全部", category: "全部" }).length, 3);
  assertEqual(applyQuery(items, { type: "寻物", category: "device" }).length, 0);
});

test("applyQuery 总是按发布时间从新到旧排序", () => {
  const now = Date.now();
  const items = [
    makeItem({ id: 1, createdAt: now - 100000 }),
    makeItem({ id: 2, createdAt: now }),
    makeItem({ id: 3, createdAt: now - 50000 })
  ];
  assertEqual(applyQuery(items, {}).map(i => i.id), [2, 3, 1]);
});

test("addItem 用当前用户做发布者，并补齐状态", () => {
  resetAll();

  const created = addItem({ type: "招领", title: "钥匙", location: "操场", description: "捡到", contact: "QQ: 1", category: "key" });

  assertEqual(created.publisher, getCurrentUser(), "发布者不是当前用户");
  assertEqual(created.status, "待认领");
  assertEqual(created.icon, "key", "icon 没有跟随类别");
  assert(typeof created.createdAt === "number");
  assertEqual(getAllItems().length, 1);
});

test("新发布的信息排在最前面（修掉「排序」文案说谎的 bug）", () => {
  resetAll();

  addItem({ type: "寻物", title: "旧信息", location: "A", description: "d", contact: "c", category: "other" });
  const items = getAllItems();
  items[0].createdAt = Date.now() - 10 * 24 * 3600 * 1000;
  saveAllItems(items);

  addItem({ type: "寻物", title: "新信息", location: "B", description: "d", contact: "c", category: "other" });

  assertEqual(queryItems({}).map(i => i.title)[0], "新信息");
  assertEqual(nextId(getAllItems()), 3, "id 应该继续自增");
});

test("updateItem 保留 id 和发布时间，只改传入的字段", () => {
  resetAll();
  const created = addItem({ type: "寻物", title: "旧标题", location: "A", description: "d", contact: "c", category: "card" });

  const updated = updateItem(created.id, { title: "新标题", category: "device" });

  assertEqual(updated.title, "新标题");
  assertEqual(updated.category, "device");
  assertEqual(updated.id, created.id);
  assertEqual(updated.createdAt, created.createdAt);
  assertEqual(getItemById(created.id).title, "新标题");
  assertEqual(updateItem(999, { title: "x" }), null);
});

test("updateItemStatus 拒绝非法状态", () => {
  resetAll();
  const created = addItem({ type: "寻物", title: "雨伞", location: "A", description: "d", contact: "c", category: "umbrella" });

  assertEqual(updateItemStatus(created.id, "待认领").status, "寻找中", "寻物不该变成待认领");
  assertEqual(updateItemStatus(created.id, "已找到").status, "已找到");
  assertEqual(updateItemStatus(12345, "已找到"), null);
});

test("removeItem 会连带删掉这条信息的联系申请", () => {
  resetAll();
  const created = addItem({ type: "寻物", title: "教材", location: "A", description: "d", contact: "c", category: "book", contactMode: "private" });
  addContactRequest(created.id);

  assertEqual(getPendingRequestCount(created.id), 1);
  assert(removeItem(created.id), "删除应该返回 true");
  assertEqual(getItemById(created.id), null);
  assertEqual(getContactRequests(created.id).length, 0);
  assertEqual(removeItem(created.id), false, "重复删除应该返回 false");
});

test("私密联系方式：本人可见，别人申请同意后才可见", () => {
  resetAll();

  const mine = addItem({ type: "寻物", title: "我的信息", location: "A", description: "d", contact: "QQ: 1", category: "other", contactMode: "private" });
  assert(canViewContact(mine), "本人应该能看到自己的联系方式");

  const others = addItem({ type: "招领", title: "别人的信息", location: "A", description: "d", contact: "QQ: 2", category: "other", contactMode: "private", publisher: "王同学" });
  assert(!canViewContact(others), "未申请时不该看到别人的私密联系方式");

  const request = addContactRequest(others.id);
  assertEqual(request.status, "pending");
  assert(!canViewContact(others), "待处理时不该看到联系方式");

  resolveContactRequest(request.id, true);
  assert(canViewContact(others), "同意后应该能看到联系方式");
  assertEqual(getPendingRequestCount(others.id), 0);
});

test("被拒绝的申请可以重新发起", () => {
  resetAll();
  const item = addItem({ type: "招领", title: "别人的信息", location: "A", description: "d", contact: "QQ: 2", category: "other", contactMode: "private", publisher: "王同学" });

  const first = addContactRequest(item.id);
  resolveContactRequest(first.id, false);
  assert(!canViewContact(item), "被拒绝后不该看到联系方式");

  const second = addContactRequest(item.id);
  assertEqual(second.id, first.id, "同一个人对同一条信息只应有一条申请");
  assertEqual(second.status, "pending");
  assertEqual(getContactRequests(item.id).length, 1);
});

test("公开信息与本人信息都能直接看到联系方式", () => {
  resetAll();
  const open = addItem({ type: "寻物", title: "公开信息", location: "A", description: "d", contact: "QQ: 3", category: "other", contactMode: "public" });
  assert(canViewContact(open));
  assertEqual(canViewContact(null), false);
});

test("getIconEmoji / getStatusClass / getTypeClass 兜底正常", () => {
  assertEqual(getIconEmoji(makeItem({ icon: "cup", category: "cup" })), "🥤");
  assertEqual(getIconEmoji(makeItem({ icon: "", category: "book" })), "📚");
  assertEqual(getIconEmoji(makeItem({ icon: "", category: "" })), "📦");
  assertEqual(getIconEmoji(null), "📦");

  assertEqual(getStatusClass("寻找中"), "status-searching");
  assertEqual(getStatusClass("待认领"), "status-waiting");
  assertEqual(getStatusClass("已找到"), "status-done");
  assertEqual(getStatusClass("已归还"), "status-done");
  assertEqual(getStatusClass("未知状态"), "");

  assertEqual(getTypeClass("寻物"), "type-lost");
  assertEqual(getTypeClass("招领"), "type-found");
  assertEqual(getCategoryLabel("cup"), "水杯");
  assertEqual(getCategoryLabel("不存在"), "其他");
});

test("种子数据完整、时间有效、id 唯一", () => {
  const seed = createSeedData();
  assertEqual(seed.length, 7);

  const ids = seed.map(item => item.id);
  assertEqual(ids.length, new Set(ids).size, "种子数据里有重复 id");

  seed.forEach(item => {
    assert(typeof item.createdAt === "number" && item.createdAt > 0, `${item.title} 的 createdAt 无效`);
    assert(typeof item.eventTime === "number" && item.eventTime > 0, `${item.title} 的 eventTime 无效`);
    assert(!!STATUS_OPTIONS[item.type], `${item.title} 的类型不合法`);
    assert(STATUS_OPTIONS[item.type].indexOf(item.status) !== -1, `${item.title} 的状态和类型不匹配`);
    assert(!!getCategoryLabel(item.category), `${item.title} 的类别不合法`);
  });
});

test("种子数据上的「水杯」快捷标签能搜到东西", () => {
  const seed = createSeedData();
  const hits = applyQuery(seed, { keyword: "水杯" });
  assert(hits.length >= 1, "「水杯」搜不到保温杯");
  assertEqual(hits[0].title, "白色保温杯 500ml");
});

test("「今日新增」按真实发布时间统计", () => {
  const seed = createSeedData();
  const todayCount = seed.filter(item => isToday(item.createdAt)).length;
  assertEqual(todayCount, 1, "种子里应该有 1 条是今天发布的");
});

/* ==================== 私信 ==================== */

test("演示身份可以切换，isMine 跟着变", () => {
  resetAll();

  assertEqual(getCurrentUser(), "李同学");
  assert(setCurrentUser("王同学"), "切换身份应该成功");
  assertEqual(getCurrentUser(), "王同学");
  assertEqual(getUserDept(), "外国语学院");
  assert(isMine(makeItem({ publisher: "王同学" })), "切到王同学后他的信息应该算我的");
  assert(!isMine(makeItem({ publisher: "李同学" })));

  assertEqual(setCurrentUser("查无此人"), false, "不存在的身份不该切换成功");
  assertEqual(getCurrentUser(), "王同学");
});

test("种子里的每个发布者都能作为演示身份登录", () => {
  const names = DEMO_USERS.map(user => user.name);
  createSeedData().forEach(item => {
    assert(names.indexOf(item.publisher) !== -1, `${item.publisher} 不在演示身份列表里`);
  });
});

test("会话按「信息 + 两个人」唯一，且不能给自己发私信", () => {
  resetAll();

  const mineItem = addItem({ type: "招领", title: "我的钥匙", location: "操场", description: "d", contact: "c", category: "key" });
  assertEqual(getOrCreateConversation(mineItem.id), null, "不该能给自己发私信");

  const otherItem = addItem({ type: "招领", title: "钥匙", location: "操场", description: "d", contact: "c", category: "key", publisher: "王同学" });
  const first = getOrCreateConversation(otherItem.id);
  assert(!!first, "应该能创建会话");
  assertEqual(first.participants, ["李同学", "王同学"]);
  assertEqual(first.itemTitle, "钥匙");

  const second = getOrCreateConversation(otherItem.id);
  assertEqual(second.id, first.id, "同一条信息不该重复建会话");
  assertEqual(findConversation(otherItem.id).id, first.id);
  assertEqual(getConversationById(first.id).id, first.id);
  assertEqual(getConversationById(9999), null);
});

test("发私信：空内容与超长内容被拒绝", () => {
  resetAll();
  const item = addItem({ type: "招领", title: "钥匙", location: "操场", description: "d", contact: "c", category: "key", publisher: "王同学" });
  const conversation = getOrCreateConversation(item.id);

  assertEqual(sendMessage(conversation.id, "   ").ok, false, "空白内容应该被拒绝");
  assertEqual(sendMessage(conversation.id, "字".repeat(LIMITS.message + 1)).ok, false, "超长内容应该被拒绝");
  assertEqual(sendMessage(9999, "在吗").ok, false, "会话不存在应该被拒绝");
});

test("私信双向收发与未读数", () => {
  resetAll();
  const item = addItem({ type: "招领", title: "钥匙", location: "操场", description: "d", contact: "c", category: "key", publisher: "王同学" });
  const conversation = getOrCreateConversation(item.id);

  const sent = sendMessage(conversation.id, "你好，钥匙还在吗？");
  assertEqual(sent.ok, true);
  assertEqual(sent.message.from, "李同学");
  assertEqual(getUnreadCount(conversation.id), 0, "自己发的不算未读");

  // 换成对方身份回复
  setCurrentUser("王同学");
  assertEqual(getUnreadCount(conversation.id), 1, "王同学应该看到 1 条未读");
  const reply = sendMessage(conversation.id, "还在，明天给你");
  assertEqual(reply.message.from, "王同学");

  setCurrentUser("李同学");
  assertEqual(getUnreadCount(conversation.id), 1, "李同学应该收到 1 条未读");
  assertEqual(getUnreadCount(), 1, "总数应该一致");
  assertEqual(markConversationRead(conversation.id), 1, "应该标记 1 条为已读");
  assertEqual(getUnreadCount(), 0);
  assertEqual(markConversationRead(conversation.id), 0, "重复标记不该有变化");
});

test("会话列表只列我参与的，并按最近消息排序", () => {
  resetAll();
  const itemA = addItem({ type: "招领", title: "A", location: "a", description: "d", contact: "c", category: "other", publisher: "王同学" });
  const itemB = addItem({ type: "招领", title: "B", location: "b", description: "d", contact: "c", category: "other", publisher: "张同学" });
  const convA = getOrCreateConversation(itemA.id);
  const convB = getOrCreateConversation(itemB.id);

  sendMessage(convA.id, "聊 A");
  sendMessage(convB.id, "聊 B");

  // 时间戳可能落在同一毫秒，这里显式指定顺序，避免测试随机失败
  const conversations = readConversations();
  conversations.forEach(conversation => {
    if (conversation.id === convA.id) conversation.updatedAt = 1000;
    if (conversation.id === convB.id) conversation.updatedAt = 2000;
  });
  writeConversations(conversations);

  assertEqual(getConversationsForUser().map(c => c.id), [convB.id, convA.id]);

  setCurrentUser("陈同学");
  assertEqual(getConversationsForUser().length, 0, "没参与的人不该看到别人的会话");
  assertEqual(getUnreadCount(), 0);
});

test("会话里的对方和时间取第一个非自己的参与者", () => {
  resetAll();
  const item = addItem({ type: "招领", title: "钥匙", location: "操场", description: "d", contact: "c", category: "key", publisher: "王同学" });
  const conversation = getOrCreateConversation(item.id);

  assertEqual(getConversationPartner(conversation), "王同学");
  assertEqual(getConversationPartner(conversation, "王同学"), "李同学");
  assertEqual(getConversationPartner(null), "");
  assertEqual(getLastMessage(conversation), null, "空会话没有最后一条消息");

  sendMessage(conversation.id, "第一条");
  sendMessage(conversation.id, "第二条");
  assertEqual(getLastMessage(getConversationById(conversation.id)).text, "第二条");
});

test("删除信息后私信记录保留，只标记信息已删除", () => {
  resetAll();
  const item = addItem({ type: "招领", title: "钥匙", location: "操场", description: "d", contact: "c", category: "key", publisher: "王同学" });
  const conversation = getOrCreateConversation(item.id);
  sendMessage(conversation.id, "在吗");

  assertEqual(getMessageCountForItem(item.id), 1);
  assert(removeItem(item.id));

  const after = getConversationById(conversation.id);
  assert(!!after, "会话不该被删掉");
  assertEqual(after.itemRemoved, true, "应该标记信息已删除");
  assertEqual(after.messages.length, 1, "聊天记录应该保留");
  assertEqual(after.itemTitle, "钥匙", "标题快照应该还在，列表里能显示是哪条信息");
});

test("编辑信息标题会同步到私信会话", () => {
  resetAll();
  const item = addItem({ type: "招领", title: "旧标题", location: "操场", description: "d", contact: "c", category: "key", publisher: "王同学" });
  const conversation = getOrCreateConversation(item.id);

  updateItem(item.id, { title: "新标题" });
  assertEqual(getConversationById(conversation.id).itemTitle, "新标题");
});

test("气泡渲染区分双方，并且转义 HTML", () => {
  const now = Date.now();
  const bubbles = renderMessageBubbles([
    { id: 1, from: "李同学", text: "<b>hi</b>", createdAt: now, read: true },
    { id: 2, from: "王同学", text: "在的", createdAt: now, read: true }
  ], "李同学");

  assertIncludes(bubbles, "message-row mine");
  assertIncludes(bubbles, "message-row theirs");
  assertNotIncludes(bubbles, "<b>hi</b>", "私信内容必须转义");
  assertIncludes(bubbles, "&lt;b&gt;hi&lt;/b&gt;");
  assertEqual(renderMessageBubbles([], "李同学"), "");
});

/* ==================== 渲染结果 ==================== */

(function renderResults() {
  const passed = testResults.filter(r => r.ok).length;
  const failed = testResults.length - passed;
  const summary = document.getElementById("summary");
  const list = document.getElementById("results");

  summary.className = failed === 0 ? "pass" : "fail";
  summary.innerHTML = `${failed === 0 ? "✅ 全部通过" : "❌ 有失败用例"}：${passed} / ${testResults.length}`
    + `<div class="note">${window.__storageShimApplied
        ? "已使用内存版 localStorage，不影响真实数据"
        : "⚠️ 未能替换 localStorage，本次测试可能读到真实数据"}</div>`;

  list.innerHTML = testResults.map(result => `
    <li class="${result.ok ? "" : "fail"}">
      ${result.ok ? "✅" : "❌"} ${escapeHtml(result.name)}
      ${result.ok ? "" : `<span class="detail">${escapeHtml(result.error)}</span>`}
    </li>
  `).join("");

  document.title = failed === 0
    ? `PASS ${passed}/${testResults.length}`
    : `FAIL ${failed} of ${testResults.length}`;

  console.log(`测试结果：${passed}/${testResults.length} 通过`);
  testResults.filter(r => !r.ok).forEach(r => console.error(r.name, r.error));
})();
