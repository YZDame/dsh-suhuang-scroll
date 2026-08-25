# dsh-suhuang-scroll

DeepSeek Harness 插件，把本机 Suhuang Scroll Runtime 接入 DSH 的设置主菜单和侧边栏。面向用户的中文名称统一为“苏黄共阅”，技术标识继续使用 `suhuang-scroll`。

## v0.2 能力

- Settings 主菜单新增“苏黄共阅”，位于 `dsh-better-sidebar` 的侧边卡片设置项之后。
- 设置保存到 DSH profile 的 `suhuang-scroll` namespace，不使用浏览器 localStorage。
- 可配置 Runtime API 地址、默认 Spec、站点适配器、模型服务商、Base URL、模型 ID、API Key 和置信度阈值。
- 设置页可对当前模型配置执行只读连接测试；测试只访问 OpenAI 兼容服务的 `/models`，不会启动评分。
- Spec、Provider、Model 和适配器列表来自 Runtime 的 `/api/specs` 与 `/api/resources`。
- 空的适配器、Provider、Model 表示跟随 Runtime 默认值；API 地址只接受 loopback 主机。
- 安装 `dsh-better-sidebar` 后，侧边栏 `+` 菜单会出现单实例“苏黄共阅”运行 Tab。
- 侧边栏运行 Tab 使用状态驱动的单面板：服务未启动时显示“启动苏黄共阅”，服务就绪后显示“开始阅卷”，运行中切换为进度、暂停与结束操作。
- “开始阅卷”与 TUI `/start` 行为一致，默认连续逐份评分并进入下一份，直到队列结束、用户暂停、用户结束或发生错误。
- 点击“暂停阅卷”后立即切换为“正在暂停”；若当前步骤尚未到达安全暂停点，“继续阅卷”会取消待处理的暂停请求。
- 本地服务启停和端口等技术信息收进“连接详情”；运行中不能直接关闭插件管理的本地服务。
- 未安装 `dsh-better-sidebar` 时，设置主菜单仍然可用，运行 Tab 不注册。

评分规则、Spec 解析、运行状态和网站适配器仍由 Suhuang Scroll 的 Python Core 与 Chrome Extension 负责；插件只负责 DSH 的设置、状态读取和人工控制入口。

当前 DSH Host 的 `settings.*` 网关只向浏览器暴露内置白名单和 LLM 配置命名空间，第三方插件注册的 namespace 可能不会直接出现在 `ctx.settingsScope` 的远端描述中。插件仍然以官方 `ctx.settings` 注册并持久化 `suhuang-scroll`；遇到这个 Host 限制时，Browser UI 自动切换到插件提供的 loopback-only 设置桥接，桥接仍调用同一个 Host settings provider，不会引入第二份存储。

## 本地开发加载

DSH 官方插件管理器会把声明了 `dsh.bundle` 的依赖加入 profile 的 bundle 层。仓库根目录执行：

```sh
node "/Applications/DeepSeek Harness.app/Contents/Resources/host/node_modules/@deepseek-ai/dsh/lib/bin.js" \
  plugin --profile web add "$PWD/plugins/dsh-suhuang-scroll"
```

然后重启 DSH Web profile。若只想检查配置树，可以执行：

```sh
node "/Applications/DeepSeek Harness.app/Contents/Resources/host/node_modules/@deepseek-ai/dsh/lib/bin.js" \
  --profile web --dump-config
```

打开 DSH 的 Settings 主菜单，选择“苏黄共阅”。默认 API 地址是 `http://127.0.0.1:8000/api`；修改地址后保存，Host 命令和 Browser UI 都会读取新的 profile 设置。

如果安装了 `dsh-better-sidebar`，在侧边栏 `+` 菜单中选择“苏黄共阅”即可打开运行控制台；`single: true` 会让重复打开操作聚焦已有 Tab。

Suhuang Runtime API 需要允许 DSH Web 的本地来源。默认配置包含 `http://127.0.0.1:3080` 和 `http://localhost:3080`；自定义 DSH 端口时，在 Runtime 环境中设置 `ALLOWED_ORIGINS`，不要使用 `*`。

## 安全边界

插件只接受 loopback Runtime API 地址，拒绝账号、密码、查询参数、片段和非本机域名。模型服务的远程 Base URL 必须使用 HTTPS；本机模型服务可使用 HTTP。API Key 直接发送给本机 Runtime，保存在系统用户配置中，不写入 DSH profile、不在接口中回显；macOS/Linux 下配置文件权限为 `0600`。状态与资源读取是只读的。“开始阅卷”和“结束本次阅卷”会在 UI 中确认；暂停与继续即时生效。“开始阅卷”会按评分置信度阈值自动提交成绩，请确认评分标准与目标阅卷平台无误后再使用。插件不会在无人操作的情况下自行启动评分任务。

真实评分流程仍要由操作者在 Runtime、Chrome 和目标网站工作流中确认。测试只应使用状态读取和取消确认，不写入成绩、不提交数据。
