# dsh-suhuang-scroll

DeepSeek Harness 插件，把本机 Suhuang Scroll Runtime 接入 DSH 的设置主菜单和侧边栏。面向用户的中文名称统一为“苏黄共阅”，技术标识继续使用 `suhuang-scroll`。

## v0.2 能力

- Settings 主菜单新增“苏黄共阅”，位于 `dsh-better-sidebar` 的侧边卡片设置项之后。
- 设置保存到 DSH profile 的 `suhuang-scroll` namespace，不使用浏览器 localStorage。
- 可配置 Runtime API 地址、默认 Spec、站点适配器、Provider、Model 和置信度阈值。
- Spec、Provider、Model 和适配器列表来自 Runtime 的 `/api/specs` 与 `/api/resources`。
- 空的适配器、Provider、Model 表示跟随 Runtime 默认值；API 地址只接受 loopback 主机。
- 安装 `dsh-better-sidebar` 后，侧边栏 `+` 菜单会出现单实例“苏黄共阅”运行 Tab。
- 运行 Tab 读取 Runtime 版本、协议版本、任务状态、适配器、Spec、完成数量、待人工确认和错误信息。
- 启动、暂停、继续、停止都经过浏览器二次确认；启动固定使用人工确认模式，不提供成绩提交或自动提交按钮。
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

插件只接受 loopback API 地址，拒绝账号、密码、查询参数、片段和非本机域名。状态与资源读取是只读的。所有运行状态变更都需要用户在 UI 中确认；运行模式固定为人工确认，插件不调用成绩提交接口，也不自动启动评分任务。

真实评分流程仍要由操作者在 Runtime、Chrome 和目标网站工作流中确认。测试只应使用状态读取和取消确认，不写入成绩、不提交数据。
