# dsh-suhuang-scroll（苏黄共阅）

`dsh-suhuang-scroll` 是 Suhuang Scroll 的 DSH 客户端插件，也是面向教师的**主前端**：
一次性配置放在 DSH 设置里，阅卷控制放在 DSH 官方侧边栏面板里（全宽主面板 + 会话内右侧紧凑面板）。

插件只负责配置、状态展示和人工控制。评分规则、Spec 解析、任务状态和网站适配器仍由
Suhuang Scroll Runtime 与 Chrome 扩展负责；TUI/CLI 仍可继续使用，是操作者的替代入口。

要求 DSH `0.2.0-rc.2` 或更高版本：控制台占用 DSH 自带的全局面板位
（`sidebar.panellist` 图标行 + 布局的 `main` 面板 + 右侧栏标签位），不依赖任何第三方侧边栏插件。

## 组件关系

| 组件 | 职责 |
| --- | --- |
| DSH 插件（本包） | 教师主前端：环境自检、配置、启动/暂停/继续/结束、实时状态与小结 |
| Suhuang Scroll Runtime | 本地 HTTP 服务：Spec 解析、模型调用、评分、任务状态与持久化 |
| Chrome 扩展 | 网页执行桥：在阅卷网站里抓取、写分、提交、翻页；侧边栏只显示连接状态 |
| TUI / CLI | 操作者替代入口与 Agent/自动化入口；评分语义与插件完全一致 |

## 安装顺序（普通用户）

1. 安装 Suhuang Scroll Runtime（见 [安装文档](https://github.com/YZDame/SuhuangScroll-public/blob/main/docs/install-upgrade-uninstall.md)）；
   macOS/Linux 可直接用官方安装器：

   ```sh
   curl -fsSL https://raw.githubusercontent.com/YZDame/SuhuangScroll/main/scripts/install/install.sh | bash
   ```

2. 在 Chrome 中加载与 Runtime 同版本的 `SuhuangScroll-Bridge` 扩展（解压 Release zip 后在
   `chrome://extensions` 选择“加载已解压的扩展程序”），并在扩展侧边栏阅读、勾选“阅卷数据说明”。
   扩展侧边栏现在只显示连接状态（适配器调试仍在可折叠的“开发者工具”里保留）；阅卷控制在 DSH 插件里。
3. 安装本插件，然后重启 DSH 并硬刷新页面。

### 安装 DSH 插件

profile 名要与客户端一致：桌面版 DeepSeek Harness 用 `desktop`，`dsh web` 用 `web`。

**桌面版**的 profile 由桌面应用独占，npm 安装的 `dsh` 会拒绝管理，请使用应用自带的命令
（macOS 路径如下；Windows/Linux 在应用安装目录的 `runtime/cli/bin/` 下）：

```sh
DSH_DESKTOP="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
cd ~/.dsh && "$DSH_DESKTOP" plugin --profile desktop add dsh-suhuang-scroll
```

**Web 版**（`dsh web`）直接用普通 `dsh`：

```sh
cd ~/.dsh && dsh plugin --profile web add dsh-suhuang-scroll
```

从 GitHub 安装开发版时，把包名替换为：

```sh
git+https://github.com/YZDame/dsh-suhuang-scroll.git
```

在 SuhuangScroll 仓库内做本地开发时，可以直接安装源码目录：

```sh
REPO="$PWD"
DSH_DESKTOP="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
cd ~/.dsh && "$DSH_DESKTOP" plugin --profile desktop add "$REPO/plugins/dsh-suhuang-scroll"
# dsh web：cd ~/.dsh && dsh plugin --profile web add "$REPO/plugins/dsh-suhuang-scroll"
```

安装或升级后需要重启 DSH 客户端并硬刷新页面：运行中的页面只在启动时导入插件代码。

### 升级 / 卸载

```sh
DSH_DESKTOP="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
cd ~/.dsh && "$DSH_DESKTOP" plugin --profile desktop add dsh-suhuang-scroll@latest
cd ~/.dsh && "$DSH_DESKTOP" plugin --profile desktop remove dsh-suhuang-scroll
```

`dsh web` 把命令换成 `dsh plugin --profile web ...`。卸载 DSH 插件不会删除 Suhuang Scroll
Runtime、模型配置、Specs 或阅卷记录；Chrome 扩展需要单独在 `chrome://extensions` 中移除。

## 首次配置：DSH 设置 → 苏黄共阅

设置页只做一次性配置，阅卷相关选择在控制台里完成，避免两处编辑同一个值。

1. **环境自检**：显示 Runtime、Chrome 扩展、模型服务等准备项。每项给出状态、原因和可执行操作
   （启动 Runtime、重新检查、安装/升级扩展、打开模型设置、导入 Spec、查看新网站指引等）。
   旧版 Runtime 没有 `/api/readiness` 时，本区块会显示“当前 Runtime 版本不支持完整自检”，
   不会谎报扩展已连接。
2. **模型服务**：填写模型服务商、模型 ID、Base URL、API Key，可先“测试模型连接”再“保存模型配置”。
   API Key 只发送到本机 Runtime 并保存在用户配置中，不会回显，也不会写入 DSH 配置。
3. **本地服务与连接**：一般无需修改。使用自定义安装目录时填写“后端所在文件夹”；
   后端地址默认 `http://127.0.0.1:8000/api`，只允许本机 loopback 地址。
4. **阅卷配置**：确认评分标准与阅卷平台是否可用；“打开控制台”跳转到侧边栏主面板。
5. **文档与帮助**：安装 Runtime、安装扩展、适配新网站、连接问题排查的入口。

## 主控制台（侧边栏图标 → 全宽主面板）

点击 DSH 侧边栏的「苏黄共阅」图标，中间列会切换到全宽控制台：

- **顶部**：状态徽标（尚未启动 / 未就绪 / 已就绪 / 阅卷中 / 正在暂停 / 已暂停 / 等待确认 / 出错 /
  已完成 / 已结束）、刷新、配置，以及“在右侧栏打开”。
- **准备阶段**：准备情况清单（Runtime、Chrome 扩展、模型、Spec、阅卷平台），每项一个处理按钮；
  主按钮是当前唯一需要做的事（启动服务 / 修复第一项阻塞 / 开始阅卷）。
- **阅卷配置弹层**：评分标准（`.md`，可导入，不超过 48 KB）、阅卷平台、提交方式
  （自动提交 / 逐份人工确认）、评分置信度；模型凭据只在设置页编辑。
- **阅卷中**：阶段标题与说明、逐份结果条、已阅数量、待复核数量、用时、平均用时、本次配置；
  主按钮随阶段变化（暂停 / 取消暂停 / 继续 / 确认提交 / 重新尝试）。
- **等待人工确认**：显示建议分数、置信度、复核提示、可展开的识别文本；可“确认提交”、
  “重新识别”或“先暂停”。
- **结束/完成小结**：已阅数量、待复核数量、用时、平均用时、最近一份的分数与置信度，
  可复制小结文字或开始新一轮。
- **连接详情**（默认折叠）：本地进程（是否由插件管理、PID、运行状态）、端口、后端地址、
  页面来源放行、插件版本与期望接口版本、最近后端输出；由插件启动的 Runtime 可以在这里重启/停止。

控制台**不显示总进度或百分比**：后端没有队列总数，界面只展示已阅份数、当前份和溢出标记，
不虚构“共 N 份”。

### 右侧栏紧凑控制台

在已有会话中，点击右侧栏标签条的 `+`，选择「苏黄共阅」；或在主控制台点“在右侧栏打开”。
右侧面板与主面板使用同一份数据和同一个轮询器，窄宽度下自动切换为单列布局，适合边看会话边控制。
右侧栏按会话存在：没有打开会话时 DSH 不显示右侧栏。

### 状态与操作对照

| 状态 | 含义 | 可执行操作 |
| --- | --- | --- |
| 尚未启动 | 本地 Runtime 未运行或插件桥接不可用 | 启动苏黄共阅（只启动服务，不开始阅卷） |
| 未就绪 | Runtime 已运行，但存在阻塞的准备项 | 按清单处理第一项阻塞 |
| 已就绪 | 所有阻塞项通过且没有进行中的任务 | 开始阅卷 |
| 启动中 / 阅卷中 | 正在按顺序处理试卷 | 暂停阅卷、结束本次阅卷 |
| 正在暂停 | 已请求暂停，当前步骤完成后生效 | 取消暂停 |
| 已暂停 | 任务已暂停，已完成评分保留 | 继续阅卷、结束本次阅卷 |
| 等待确认 | 逐份人工确认模式下等待提交决定 | 确认提交、重新识别、先暂停 |
| 出错 | 任务因错误停下，错误信息可见 | 重新尝试、结束本次阅卷 |
| 已完成 | 直到队列结束（后端判定 `end_of_queue`） | 开始新一轮、复制小结 |
| 已结束 | 操作者主动结束本轮 | 开始新一轮、复制小结 |

## 提交方式

- **自动提交**（默认）：评分达到置信度后自动提交并翻到下一份。
- **逐份人工确认**：每份先停下等你确认再提交；需要 Runtime 暴露 `/api/automation/manual-action`。
  若当前 Runtime 过旧，插件会提示“当前 Runtime 不支持人工确认操作”，此时可升级 Runtime，
  或暂时改用自动提交。

真实阅卷会根据 Spec 和置信度阈值提交成绩。开始前请确认评分标准、模型配置和目标阅卷平台；
不要在测试环境中使用真实学生数据。

## 常见问题

### 侧边栏里没有“苏黄共阅”图标

1. 确认插件安装到了客户端实际使用的 profile：桌面版是 `desktop`，`dsh web` 是 `web`。
2. 重启客户端并硬刷新页面。
3. DSH 版本低于 `0.2.0-rc.2` 时没有官方全局面板位，控制台不会注册；请升级 DSH。
   旧客户端上设置页里的“打开控制台”会提示面板位不可用。

### 环境自检显示“未检测到 / 连接已过期”Chrome 扩展

1. 确认扩展已安装并在 `chrome://extensions` 中启用（加载的是发布包解压后的目录，内含 `manifest.json`）。
2. 在阅卷网页打开扩展侧边栏，勾选“阅卷数据说明”（未同意时心跳不带当前网站信息）。
3. 扩展每 60 秒上报一次心跳；回到 DSH 设置点“重新检查”。超过约 3 个心跳周期没有上报会显示“连接已过期”。
4. 扩展升级后需要在 `chrome://extensions` 重新加载，并刷新阅卷网页。

### 扩展已安装，但自检仍提示未连接

- 确认 Runtime 与扩展来自同一个 Release，接口版本一致；版本不一致时自检会给出升级/重载指引。
- 确认 Runtime 是通过本机 loopback 启动的（插件启动时会显式绑定 `127.0.0.1`）。
- 点击设置页的“重新检查”；必要时先在“连接详情”里重启由插件管理的 Runtime。

### 显示“未找到苏黄共阅 Runtime”

先运行 `suhuang doctor`。使用非默认目录安装时，在设置页「本地服务与连接」填写安装根目录
（或包含 `main.py` 的 `core/python` 目录），然后回到控制台点“启动苏黄共阅”。

### 模型服务连接失败 / API Key 无效

在设置页「模型服务」检查服务商、模型 ID、Base URL 和 API Key；Base URL 要指向 OpenAI 兼容接口的
服务根路径（部分服务需要在 Base URL 中包含 `/v1`）。远程模型服务必须使用 HTTPS，本机服务可用 HTTP。
“测试模型连接”只读取 `/models`，不会开始阅卷。

### 没有可用的评分标准

在控制台「阅卷配置」中选择已有 `.md`，或导入一份（不超过 48 KB）。也可以先让 Agent 用
`suhuang-spec` 生成；导入会走共享 Spec 解析器校验，同名文件不会被覆盖，导入不会启动阅卷。

### 阅卷平台不可用 / 适配器被禁用

在控制台「阅卷配置」查看可选平台。目标站点没有适配器时，展开“没有找到我的阅卷网站”，
复制给本地 Agent 的提示词；新增适配器应先做 healthcheck 和合成数据 dry-run，再用于真实阅卷。

### 提示“当前 Runtime 不支持人工确认操作”

逐份人工确认需要 Runtime 暴露 `/api/automation/manual-action`。升级 Runtime 后重试，
或暂时改用自动提交。

### 提示“当前服务不是由本插件启动，插件无法自动重启”

Runtime 由其他程序（例如 TUI 或手动终端）启动时，插件不会强行结束它。先在原程序/终端结束该进程，
再回到控制台点“启动苏黄共阅”，之后即可由插件管理启停。

### 点击“继续阅卷”提示后端不可用

展开“连接详情”检查 Runtime 状态；若旧进程由其他程序启动，先结束旧进程，再由控制台启动当前版本。

## 本地开发

在 SuhuangScroll 仓库根目录执行：

```sh
# 安装前端依赖并构建客户端 bundle（client.js 提交到仓库，构建由 pretest 校验）
cd plugins/dsh-suhuang-scroll
npm install
npm run build
npm run build:check
npm test

# 在仓库根目录装入 DSH profile（桌面版用应用自带的 dsh，web 用普通 dsh）
REPO="$PWD"
DSH_DESKTOP="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
cd ~/.dsh && "$DSH_DESKTOP" plugin --profile desktop add "$REPO/plugins/dsh-suhuang-scroll"
```

- `client.js` 是由 `src/client/` 经 esbuild 生成的提交产物；修改源码后运行 `npm run build`，
  再刷新页面。`npm test` 的 `pretest` 会先执行 `build:check`，防止提交过期 bundle。
- 只改 `client.js`/`src/client/` 时，硬刷新页面即可；改 `index.js`/`runtime.js`（宿主侧）后需要重启 DSH。
- 如果同时运行了 DSH 的 Web 开发监听（`pnpm run dev:web`），客户端 bundle 会热重载。
- 默认允许 `http://127.0.0.1:3080` 和 `http://localhost:3080` 访问本机 Runtime；自定义 DSH 端口时，
  在 Runtime 环境中追加精确的 `ALLOWED_ORIGINS`，不要使用 `*`。
- 宿主侧测试（`test/host-bridge.test.js` 等）不依赖真实 DSH 进程；浏览器端测试用假宿主运行
  构建后的 `client.js`，不需要真实阅卷账号。

## 安全边界

- Runtime API 只接受 loopback 地址，不接受账号、密码、查询参数或非本机域名。
- 页面到 Runtime 的请求由插件在本机同源桥内代转（只转发固定的允许列表，且只接受 loopback 请求），
  因此即使已在运行的 Runtime 没有放行当前页面来源，控制台仍可用。
- 远程模型 Base URL 必须使用 HTTPS；本机模型服务可以使用 HTTP。
- API Key 直接发给本机 Runtime，保存在系统用户配置中，不写入 DSH profile，也不会在接口中回显。
- Chrome 扩展心跳只上报扩展身份、版本、协议能力，以及（在同意数据说明后）当前网站 host 和匹配到的
  适配器 id；不上报页面 URL、路径、查询参数、标题、内容、图片或 Cookie。
- 状态读取和连接测试不会开始阅卷；开始、结束与停止服务需要界面确认。
- 插件不会强行终止由其他程序启动的 Runtime。

## 教师使用入口

控制台可直接选择评分标准与阅卷网站，运行中禁止更改。也可以在控制台或设置页导入 AI 整理好的
`.md` 文件（不超过 48 KB）：Runtime 使用共享 Spec 解析器校验，通过后保存在本机评分标准目录。
同名文件不会覆盖；导入不会启动阅卷。教师可先在 DSH 会话中上传已有题目、答案和评分细则，
让 `suhuang-spec` 生成文件。

“在右侧栏打开”会先确认已有会话，再切回会话并打开阅卷 Tab；没有已打开会话或右侧栏服务不可用时会提示。

新网站指引位于“没有找到我的阅卷网站”，提供可复制的本地 Agent 提示词。Agent 应先确认源码、构建环境、
浏览器连接和域名权限，再创建禁用态 adapter，以合成数据进行 healthcheck/dry-run。
完成适配开发不等于真实提交已经验证。

## 相关文档

- [安装、升级与卸载](https://github.com/YZDame/SuhuangScroll-public/blob/main/docs/install-upgrade-uninstall.md)
- [教师端入口与工作流](#教师使用入口)
- [协议契约版本](https://github.com/YZDame/SuhuangScroll-public/blob/main/docs/protocol-version.md)

## 许可证

[Apache License 2.0](./LICENSE)
