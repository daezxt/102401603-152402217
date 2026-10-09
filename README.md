# 校园失物招领

校园里丢了东西、捡到东西，都可以在这里发布和查找。

纯前端实现：**没有后端、没有第三方依赖、没有构建步骤**，用浏览器打开 `index.html` 就能跑。

![dependencies](https://img.shields.io/badge/dependencies-none-2f7cc6)
![tests](https://img.shields.io/badge/tests-37%20passed-0f7b6c)
![vanilla](https://img.shields.io/badge/vanilla-JavaScript-f7df1e)

---

## 功能

**浏览与查找**

- 首页按类型（寻物 / 招领）和类别（校园卡、电子设备、钥匙、书籍、雨伞、水杯、其他）筛选，按发布时间从新到旧排列
- 搜索支持名称、描述、地点，带同义词：「水杯」也能搜到「保温杯」，「校园卡」也能搜到「一卡通」；中文关键词还支持逐字命中

**发布与管理**

- 发布时选类型和类别，填名称、时间、地点、描述、联系方式，带字数上限与实时字数提示
- 「我的发布」可以看到统计、修改状态（寻物→已找到 / 招领→已归还）、编辑、删除
- 状态与类型是绑定的，不会出现「招领 + 已找到」这类非法组合

**联系方式与私信**

- 联系方式可选「公开」或「仅站内联系」；选后者时其他人只能看到一把锁，需要私信沟通或发申请、由你同意后才可见
- 私信：会话按「一条信息 + 两个人」唯一，底部导航带未读红点，进入会话自动已读
- 发布者删掉信息后，聊天记录仍然保留，只在列表里标注「已删除」

## 快速开始

直接用浏览器打开 `index.html` 即可，不需要安装任何东西。

想用本地服务器打开（可选）：

```bash
python -m http.server 8000
# 然后访问 http://localhost:8000
```

数据存在浏览器的 localStorage 里，首次打开会自动写入 7 条示例数据。种子数据的时间基于「当前时间」生成，所以「今日新增」永远是准的。

### 五分钟体验私信

本地没有后端，所以两个人之间的私信靠切换身份来演示：

1. 在首页点开一条不是「李同学」发布的信息，详情页点 **💬 私信发布者**
2. 发一条消息
3. 到「我的」页，把 **演示身份** 切成对方（比如王同学）
4. 打开底部 **私信**，能看到未读红点和刚收到的消息，回复之后切回原身份即可看到

## 目录结构

```
├── index.html            首页：搜索入口 + 类型/类别筛选 + 卡片列表
├── publish.html          发布 / 编辑（带 ?id= 时是编辑模式）
├── search.html           搜索
├── detail.html           详情
├── mine.html             我的发布
├── messages.html         私信列表
├── chat.html             私信会话（?id= 打开会话，?itemId= 和某条信息的发布者聊）
├── css/
│   └── style.css         全部样式，设计变量集中在文件顶部
├── js/
│   ├── data.js           数据层：常量、种子数据、localStorage 读写、查询、老数据迁移
│   ├── ui.js             公共 UI：HTML 转义、Toast、卡片渲染、复制、未读红点
│   ├── home.js           首页
│   ├── publish.js        发布 / 编辑
│   ├── search.js         搜索
│   ├── detail.js         详情
│   ├── mine.js           我的发布
│   ├── messages.js       私信列表
│   └── chat.js           私信会话
└── tests/
    ├── test.html         浏览器里直接打开的测试页
    └── tests.js          37 个用例
```

## 数据模型

所有数据存在浏览器 localStorage，一共四个 key：

| key | 内容 |
| --- | --- |
| `campusLostFoundItems` | 全部失物 / 招领信息 |
| `campusLostFoundRequests` | 私密联系方式的查看申请 |
| `campusLostFoundConversations` | 私信会话与消息 |
| `campusLostFoundCurrentUser` | 当前演示身份 |

单条信息的字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | Number | 自增 id |
| `type` | String | `寻物` / `招领` |
| `title` | String | 物品名称 |
| `location` | String | 地点 |
| `eventTime` | Number | 丢失或捡到的时间（时间戳） |
| `createdAt` | Number | 发布时间（时间戳） |
| `description` | String | 物品描述 |
| `contact` | String | 联系方式 |
| `contactMode` | String | `public` / `private` |
| `category` | String | 见 `CATEGORIES` |
| `status` | String | 见 `STATUS_OPTIONS` |
| `publisher` | String | 发布者昵称 |
| `icon` | String | 图标标识，缺省时用 `category` |

老版本的数据会在读取时自动迁移（见 `data.js` 里的 `migrateItems`），不需要手动清缓存：展示文本换成时间戳、早期写死在数据里的发布者「我」还原成真实账号、补齐缺失的类别与合法状态。

## 测试

直接用浏览器打开 [`tests/test.html`](tests/test.html)，页面顶部会显示通过数量，失败的用例会列出具体断言。

测试用内存版 localStorage 替身运行，**不依赖 Node，也不会污染你的真实数据**。覆盖了查询与筛选、同义词搜索、时间格式化、老数据迁移、增删改、状态合法性、联系方式权限、身份切换、私信收发与未读、HTML 转义等。

## 实现约定

- 所有插入 `innerHTML` 的动态文本都要过 `escapeHtml()`，防止存储型 XSS
- 时间统一存时间戳，展示时再格式化（今天 / 昨天 / N 天前 / 月-日）
- 事件用 `addEventListener` 或事件委托绑定，不在 HTML 里拼 `onclick` 字符串
- 当前身份只有 `getCurrentUser()` / `setCurrentUser()` 两个入口
- 颜色、圆角、阴影集中在 `css/style.css` 顶部的 CSS 变量里，文字与按钮的对比度都按 WCAG AA（4.5:1）调过

## 浏览器支持

用到的是 `URLSearchParams`、`Element.closest`、`Promise`、模板字符串等标准特性，近几年版本的 Chrome / Edge / Firefox / Safari 都可以直接运行。

## 已知简化

- 没有后端，数据只存在当前浏览器的 localStorage 里，换设备看不到
- 身份靠「我的」页手动切换来演示，真实产品里应该由登录态决定
- 私信只支持文本，没有撤回、图片、消息推送

## 结对信息

- 学号 1：102401603 张馨恬
- 学号 2：152402217 陈霁然

2026 秋软件工程第二次结对作业。
