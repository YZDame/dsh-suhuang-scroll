# dsh-suhuang-scroll（苏黄共阅）

`dsh-suhuang-scroll` 是一个 DSH Web 插件，把本机 Suhuang Scroll Runtime 接入 DSH 的设置主菜单，并在 Better Sidebar 中提供简洁的阅卷控制台。

插件负责配置、状态展示和人工控制。评分规则、Spec 解析、任务状态和网站适配器仍由 Suhuang Scroll Runtime 与浏览器扩展负责。

## 使用前准备

需要依次准备：

1. 已能运行的 DSH Web。
2. [Suhuang Scroll Runtime](https://github.com/YZDame/SuhuangScroll)。
3. [`dsh-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar)。它是运行控制台所在的侧边栏底座。
4. 本插件 `dsh-suhuang-scroll`。

macOS 和 Linux 可用官方安装器安装或升级 Suhuang Scroll Runtime：

```sh
curl -fsSL https://raw.githubusercontent.com/YZDame/SuhuangScroll/main/scripts/install/install.sh | bash
```

安装器会校验发布包并默认安装到 `~/.local/suhuang-scroll`。如需先审阅脚本，可下载后再执行。Windows 安装方法见 [Suhuang Scroll 安装文档](https://github.com/YZDame/SuhuangScroll/blob/main/docs/install-upgrade-uninstall.md)。

## 安装 DSH 插件

在 DSH 所在环境的终端执行以下一行命令。它会先安装 Better Sidebar，再安装苏黄共阅插件，并自动把两个 bundle 加入 Web profile：

```sh
cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add dsh-suhuang-scroll
```

完成后重启 DSH Web，并在浏览器中硬刷新页面。打开 DSH 设置主菜单中的“苏黄共阅”，再从 Better Sidebar 的 `+` 菜单打开“苏黄共阅”Tab。

从 GitHub 安装开发版时，将最后一个包名替换为：

```sh
git+https://github.com/YZDame/dsh-suhuang-scroll.git
```

## 首次配置

1. Runtime API 默认使用 `http://127.0.0.1:8000/api`，一般无需修改。
2. 选择评分标准和阅卷平台适配器。
3. 在“模型服务商”中填写 Base URL、模型 ID 和 API Key。
4. 点击“测试连接”。连接测试只读取 OpenAI 兼容服务的 `/models`，不会启动阅卷。
5. 保存设置后，打开侧边栏中的苏黄共阅控制台。

插件会依次查找用户填写的后端位置、SuhuangScroll 源码目录以及 `~/.local/suhuang-scroll` 下的标准 Runtime。使用自定义安装目录时，在设置中填写安装根目录或 `core/python` 目录。

## 阅卷控制

- “启动苏黄共阅”只启动本机 Runtime，不会自动开始阅卷。
- “开始阅卷”经过确认后启动连续阅卷，默认逐份处理并自动进入下一份，直到队列结束、用户暂停、用户结束或发生错误。
- “暂停阅卷”会请求在安全节点暂停；按钮随即进入“正在暂停”。暂停完成后可点击“继续阅卷”。
- “结束本次阅卷”会终止当前连续任务，不会关闭由其他程序启动的 Runtime。
- Runtime 由插件启动时，可以在没有运行任务的情况下从“连接详情”停止服务。

真实阅卷会根据 Spec 和置信度阈值自动提交符合条件的成绩。开始前请确认评分标准、模型配置和目标阅卷平台；不要在测试环境中使用真实学生数据。

## 功能概览

- DSH 设置主菜单中的“苏黄共阅”配置页。
- Runtime API、Spec、适配器、模型服务商、Base URL、模型 ID、API Key 和置信度阈值配置。
- 模型连接测试以及 Runtime、资源和协议版本检查。
- Better Sidebar 单实例运行 Tab，展示任务阶段、完成数量和用时。
- 连续阅卷的开始、暂停、继续、结束，以及插件管理的 Runtime 启停。
- 浅色与深色模式自适应。

未安装 `dsh-better-sidebar` 时，设置页仍可加载，但不会注册侧边栏运行 Tab。

## 更新与卸载

更新插件及其前置依赖：

```sh
cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar@latest && dsh plugin --profile web add dsh-suhuang-scroll@latest
```

卸载插件：

```sh
cd ~/.dsh && dsh plugin --profile web remove dsh-suhuang-scroll
```

只有在没有其他插件使用 Better Sidebar 时，才继续执行：

```sh
cd ~/.dsh && dsh plugin --profile web remove dsh-better-sidebar
```

卸载 DSH 插件不会删除 Suhuang Scroll Runtime、模型配置、Specs 或阅卷记录。

## 常见问题

### 显示“未找到苏黄共阅 Runtime”

先运行 `suhuang doctor`。使用非默认目录安装时，在设置中填写安装根目录或包含 `main.py` 的 `core/python` 目录，然后重新点击“启动苏黄共阅”。

### 测试连接显示 Not Found

确认 Base URL 指向 OpenAI 兼容接口的服务根路径。插件会让 Runtime 请求该地址的 `/models`；部分服务需要在 Base URL 中包含 `/v1`。

### 点击继续阅卷时提示后端不可用

展开“连接详情”检查 Runtime 状态。若旧进程由其他程序启动，先在原终端结束旧进程，再由侧边栏启动当前版本。

### 页面里没有“苏黄共阅”Tab

确认 `dsh-better-sidebar` 和 `dsh-suhuang-scroll` 都已安装到同一个 `web` profile，然后重启 DSH Web 并硬刷新浏览器。

## 本地开发

在 SuhuangScroll 仓库根目录执行：

```sh
dsh plugin --profile web add "$PWD/plugins/dsh-suhuang-scroll"
dsh --profile web --dump-config
```

默认允许 `http://127.0.0.1:3080` 和 `http://localhost:3080` 访问本机 Runtime。自定义 DSH 端口时，在 Runtime 环境中追加精确的 `ALLOWED_ORIGINS`，不要使用 `*`。

## 安全边界

- Runtime API 只接受 loopback 地址，不接受账号、密码、查询参数或非本机域名。
- 远程模型 Base URL 必须使用 HTTPS；本机模型服务可以使用 HTTP。
- API Key 直接发给本机 Runtime，保存在系统用户配置中，不写入 DSH profile，也不会在接口中回显。
- 状态读取和连接测试不会开始阅卷；开始与结束操作需要 UI 确认。
- 插件不会强行终止由其他程序启动的 Runtime。

## 许可证

[Apache License 2.0](./LICENSE)
