window.__ModuleLoader__.load({
  id: "dsh-suhuang-scroll",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const { IconListPenOutline16 } = require("@deepseek-ai/dsh-client-ui-primitives");

    const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api";
    const DEFAULT_CONFIDENCE_THRESHOLD = 0.9;
    const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
    const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
    const SETTINGS_NAMESPACE = "suhuang-scroll";
    const SIDEBAR_TAB_ID = "suhuang-scroll:runtime";
    const SETTINGS_BRIDGE_PATH = "/suhuang-scroll/settings";
    const RUNTIME_BRIDGE_PATH = "/suhuang-scroll/runtime";
    const NS = "settings.suhuangScroll";

    const zh = {
      tab: "苏黄共阅",
      title: "苏黄共阅",
      description: "设置本地评分的默认选项和连接方式。评分控制就在侧边栏的「苏黄共阅」页面。",
      apiAddress: "后端连接地址",
      apiAddressHint: "只允许连接本机（localhost / 127.0.0.1），不会保存账号或密码。",
      defaultSpec: "默认评分标准",
      defaultSpecHint: "开始评分时使用；留空会自动选用第一个。",
      defaultAdapter: "默认阅卷平台",
      modelService: "模型服务",
      modelServiceHint: "用于识别与评分。配置保存在本机苏黄共阅中，API Key 不会显示或写入插件设置。",
      defaultProvider: "模型服务商",
      defaultModel: "模型 ID",
      defaultModelHint: "填写服务商提供的完整模型标识，例如 Qwen/Qwen3.6-27B。",
      providerBaseUrl: "Base URL",
      providerBaseUrlHint: "填写 OpenAI 兼容接口地址，远程服务须使用 HTTPS。",
      providerApiKey: "API Key",
      providerApiKeyConfigured: "已配置 API Key；留空保存会保留原密钥。",
      providerApiKeyMissing: "尚未配置 API Key。",
      providerApiKeyHint: "密钥只发送到本机后端并保存在用户配置中；留空不会清除已有密钥。",
      modelConnectionTest: "测试模型连接",
      modelConnectionIdle: "尚未测试模型连接。",
      modelConnectionSuccess: "模型服务连接正常。",
      modelConnectionFailure: "模型服务连接失败：{error}",
      modelApiKeyRequired: "请填写 API Key，或先保存一个有效密钥。",
      modelAuthFailed: "API Key 无效或当前账号无权访问该服务（HTTP {status}）。",
      modelTimeout: "连接超时，请检查 Base URL 和网络。",
      confidenceThreshold: "评分置信度",
      confidenceThresholdHint: "范围 0 到 1。数值越高，评分越有把握才自动通过。",
      followRuntime: "跟随系统默认（{value}）",
      followRuntimeUnknown: "跟随系统默认",
      save: "保存设置",
      reset: "恢复默认值",
      resetConfirm: "确认恢复苏黄共阅的默认设置吗？这会修改当前本地设置。",
      saveSuccess: "设置已保存。",
      resetSuccess: "已恢复默认设置。",
      settingsUnavailable: "当前设置暂不可用，此处只显示默认值。",
      settingsReadOnly: "当前设置不可修改。",
      runtimeStatus: "后端连接状态",
      connectionTest: "测试连接",
      connected: "已连接",
      notConnected: "后端未连接，请先启动后端或检查连接地址。",
      connectionIdle: "尚未测试连接。",
      runtimeVersion: "后端版本",
      protocolVersion: "接口版本",
      resources: "可用配置",
      refreshResources: "刷新配置",
      resourcesIdle: "尚未读取配置。",
      resourcesLoading: "正在读取评分标准、模型和阅卷平台……",
      resourcesSuccess: "已读取 {specs} 套评分标准、{providers} 个模型服务商、{adapters} 个阅卷平台。",
      resourceFailure: "读取配置失败：{error}",
      specs: "评分标准",
      providers: "模型服务商",
      adapters: "阅卷平台",
      currentTask: "当前任务",
      runtimeControls: "评分控制",
      noTask: "当前没有评分任务。",
      readyTitle: "准备开始阅卷",
      readyDescription: "选择好评分标准后即可开始。",
      serviceTitle: "启动苏黄共阅",
      serviceDescription: "启动本地服务后即可开始阅卷。",
      serviceConnectingTitle: "正在准备苏黄共阅",
      serviceConnectingDescription: "本地服务正在启动，请稍候。",
      gradingTitle: "正在连续阅卷",
      gradingDescription: "系统正在按顺序处理下一份。",
      pausedTitle: "阅卷已暂停",
      pausedDescription: "已完成的评分会保留，可以随时继续。",
      pausingTitle: "正在暂停阅卷",
      pausingDescription: "系统会在当前步骤完成后暂停。",
      completedTitle: "本轮阅卷已完成",
      completedDescription: "当前列表中的试卷均已处理完成。",
      stoppedTitle: "本轮阅卷已结束",
      stoppedDescription: "已完成的评分记录已经保留。",
      errorTitle: "阅卷遇到问题",
      errorDescription: "处理已暂停，请查看提示后重试。",
      awaitingTitle: "等待处理",
      awaitingDescription: "当前结果需要处理后才能继续。",
      badgeReady: "系统已就绪",
      badgeStarting: "正在启动",
      badgeGrading: "正在阅卷",
      badgePaused: "已暂停",
      badgePausing: "正在暂停",
      badgeCompleted: "已完成",
      badgeStopped: "已结束",
      badgeError: "任务异常",
      badgeOffline: "尚未启动",
      completedPapers: "已完成",
      elapsed: "用时",
      currentStage: "当前阶段",
      papersUnit: "份",
      selectedSpec: "评分标准",
      selectedAdapter: "阅卷平台",
      connectionDetails: "连接详情",
      localService: "本地服务",
      closeService: "关闭本地服务",
      serviceReady: "连接正常",
      serviceManaged: "由苏黄共阅管理",
      serviceExternal: "由其他程序启动",
      startProduct: "启动苏黄共阅",
      startGrading: "开始阅卷",
      startNewRound: "开始新一轮",
      pauseGrading: "暂停阅卷",
      resumeGrading: "继续阅卷",
      retryGrading: "重新尝试",
      endGrading: "结束本次阅卷",
      startProductPending: "正在启动……",
      connectionFailed: "无法连接本地服务。",
      startContinuousConfirm: "确认开始阅卷吗？开始后将自动逐份评分并进入下一份，直到全部完成或你主动暂停。",
      endGradingConfirm: "确认结束本轮阅卷吗？已完成的评分会保留。",
      stopServiceConfirm: "确认关闭本地服务吗？",
      serviceCloseBlocked: "阅卷进行中，请先结束本轮阅卷。",
      status: "状态",
      adapter: "阅卷平台",
      spec: "评分标准",
      completed: "已完成",
      pending: "待人工确认",
      runError: "运行错误",
      runtimeUnavailable: "后端不可用：{error}",
      loading: "读取中……",
      start: "启动",
      pause: "暂停",
      resume: "继续",
      stop: "停止",
      controlSent: "已发送“{action}”。",
      noSpec: "没有可用的评分标准，请先在设置里选择。",
      state_idle: "空闲",
      state_starting: "启动中",
      state_capturing: "采集中",
      state_grading: "评分中",
      state_awaiting_confirmation: "待人工确认",
      state_submitting: "提交中",
      state_waiting_next_page: "等待下一页",
      state_paused: "已暂停",
      state_stopped: "已停止",
      state_error: "错误",
      state_unknown: "未知",
      backendProcess: "后端进程",
      backendDir: "后端所在文件夹",
      backendDirHint: "留空会自动识别，一般不用手动填写。",
      backendRunning: "运行中",
      backendStopped: "未运行",
      backendExternal: "外部已运行",
      backendStarting: "启动中……",
      backendStopping: "停止中……",
      startBackend: "启动后端",
      stopBackend: "停止后端",
      backendPid: "进程 PID",
      backendPort: "端口",
      backendPython: "运行环境",
      backendNotManaged: "这个后端不是从这里启动的，无法停止。",
      startBackendConfirm: "确认启动本地苏黄共阅后端吗？",
      stopBackendConfirm: "确认停止由本插件启动的苏黄共阅后端吗？",
      backendStarted: "后端已启动并完成检查。",
      backendStartPending: "后端已启动，正在等待就绪。",
      backendStoppedMsg: "后端已停止。",
      backendAlreadyRunning: "后端已在运行。",
      backendAlreadyStopped: "后端当前未运行。",
      backendBridgeUnavailable: "后端控制不可用：{error}",
      backendDirMissing: "未找到后端，请在设置里填写后端所在文件夹。",
    };
    const en = {
      tab: "Suhuang Scroll",
      title: "Suhuang Scroll",
      description: "Set local grading defaults and connection options. Grading controls live in the sidebar.",
      apiAddress: "Backend address",
      apiAddressHint: "Only localhost, 127.0.0.1, and ::1 are allowed; credentials are never stored.",
      defaultSpec: "Default grading spec",
      defaultSpecHint: "Used when grading starts; an empty value uses the first available option.",
      defaultAdapter: "Default grading platform",
      modelService: "Model service",
      modelServiceHint: "Used for answer recognition and grading. Configuration stays in local Suhuang Scroll; the API key is never shown or stored in plugin settings.",
      defaultProvider: "Model provider",
      defaultModel: "Model ID",
      defaultModelHint: "Enter the complete model identifier supplied by the provider, such as Qwen/Qwen3.6-27B.",
      providerBaseUrl: "Base URL",
      providerBaseUrlHint: "Enter an OpenAI-compatible API address. Remote services must use HTTPS.",
      providerApiKey: "API key",
      providerApiKeyConfigured: "An API key is configured. Leave this blank to keep it unchanged.",
      providerApiKeyMissing: "No API key is configured.",
      providerApiKeyHint: "The key is sent only to the local backend and stored in user configuration. Leaving it blank does not clear an existing key.",
      modelConnectionTest: "Test model connection",
      modelConnectionIdle: "Model connection has not been tested.",
      modelConnectionSuccess: "Model service connection succeeded.",
      modelConnectionFailure: "Model service connection failed: {error}",
      modelApiKeyRequired: "Enter an API key or save a valid key first.",
      modelAuthFailed: "The API key is invalid or the account cannot access this service (HTTP {status}).",
      modelTimeout: "The connection timed out. Check the Base URL and network.",
      confidenceThreshold: "Grading confidence",
      confidenceThresholdHint: "From 0 to 1. Higher values make grading pass automatically only with more confidence.",
      followRuntime: "Follow system default ({value})",
      followRuntimeUnknown: "Follow system default",
      save: "Save settings",
      reset: "Restore defaults",
      resetConfirm: "Restore Suhuang Scroll defaults? This changes the local settings.",
      saveSuccess: "Settings saved.",
      resetSuccess: "Default settings restored.",
      settingsUnavailable: "Settings are unavailable; this page is showing defaults only.",
      settingsReadOnly: "Settings are currently read-only.",
      runtimeStatus: "Backend connection",
      connectionTest: "Test connection",
      connected: "Connected",
      notConnected: "Backend is not connected. Start the backend or check the connection address.",
      connectionIdle: "Connection has not been tested.",
      runtimeVersion: "Backend version",
      protocolVersion: "Interface version",
      resources: "Available options",
      refreshResources: "Refresh options",
      resourcesIdle: "Options have not been read.",
      resourcesLoading: "Reading grading specs, models, and platforms…",
      resourcesSuccess: "Read {specs} grading specs, {providers} model providers, and {adapters} platforms.",
      resourceFailure: "Failed to read options: {error}",
      specs: "Grading specs",
      providers: "Model providers",
      adapters: "Grading platforms",
      currentTask: "Current task",
      runtimeControls: "Grading controls",
      noTask: "There is no grading task.",
      readyTitle: "Ready to grade",
      readyDescription: "Choose a grading spec, then start when ready.",
      serviceTitle: "Start Suhuang Scroll",
      serviceDescription: "Start the local service before grading.",
      serviceConnectingTitle: "Preparing Suhuang Scroll",
      serviceConnectingDescription: "The local service is starting. This may take a moment.",
      gradingTitle: "Continuous grading in progress",
      gradingDescription: "The next paper is being processed automatically.",
      pausedTitle: "Grading paused",
      pausedDescription: "Completed scores are preserved. Resume whenever you are ready.",
      pausingTitle: "Pausing grading",
      pausingDescription: "Grading will pause after the current step finishes.",
      completedTitle: "This grading round is complete",
      completedDescription: "All available papers have been processed.",
      stoppedTitle: "This grading round has ended",
      stoppedDescription: "Completed grading records have been preserved.",
      errorTitle: "Grading needs attention",
      errorDescription: "Processing is paused. Review the message and try again.",
      awaitingTitle: "Waiting for action",
      awaitingDescription: "The current result needs attention before grading can continue.",
      badgeReady: "Ready",
      badgeStarting: "Starting",
      badgeGrading: "Grading",
      badgePaused: "Paused",
      badgePausing: "Pausing",
      badgeCompleted: "Complete",
      badgeStopped: "Ended",
      badgeError: "Needs attention",
      badgeOffline: "Not started",
      completedPapers: "Completed",
      elapsed: "Elapsed",
      currentStage: "Stage",
      papersUnit: "papers",
      selectedSpec: "Grading spec",
      selectedAdapter: "Platform",
      connectionDetails: "Connection details",
      localService: "Local service",
      closeService: "Close local service",
      serviceReady: "Connected",
      serviceManaged: "Managed by Suhuang Scroll",
      serviceExternal: "Started by another application",
      startProduct: "Start Suhuang Scroll",
      startGrading: "Start grading",
      startNewRound: "Start a new round",
      pauseGrading: "Pause grading",
      resumeGrading: "Resume grading",
      retryGrading: "Try again",
      endGrading: "End this grading round",
      startProductPending: "Starting…",
      connectionFailed: "Could not connect to the local service.",
      startContinuousConfirm: "Start grading? Papers will be scored one by one until all are complete or you pause the run.",
      endGradingConfirm: "End this grading round? Completed scores will be preserved.",
      stopServiceConfirm: "Close the local service?",
      serviceCloseBlocked: "End the current grading round before closing the service.",
      status: "Status",
      adapter: "Grading platform",
      spec: "Grading spec",
      completed: "Completed",
      pending: "Pending confirmation",
      runError: "Run error",
      runtimeUnavailable: "Backend unavailable: {error}",
      loading: "Loading…",
      start: "Start",
      pause: "Pause",
      resume: "Resume",
      stop: "Stop",
      controlSent: "“{action}” was sent.",
      noSpec: "No grading spec is available. Select one in settings first.",
      state_idle: "Idle",
      state_starting: "Starting",
      state_capturing: "Capturing",
      state_grading: "Grading",
      state_awaiting_confirmation: "Pending confirmation",
      state_submitting: "Submitting",
      state_waiting_next_page: "Waiting for next page",
      state_paused: "Paused",
      state_stopped: "Stopped",
      state_error: "Error",
      state_unknown: "Unknown",
      backendProcess: "Backend service",
      backendDir: "Backend folder",
      backendDirHint: "Leave empty to auto-detect; usually no need to set this manually.",
      backendRunning: "Running",
      backendStopped: "Not running",
      backendExternal: "Running externally",
      backendStarting: "Starting…",
      backendStopping: "Stopping…",
      startBackend: "Start backend",
      stopBackend: "Stop backend",
      backendPid: "PID",
      backendPort: "Port",
      backendPython: "Runtime",
      backendNotManaged: "This backend was not started here, so it cannot be stopped.",
      startBackendConfirm: "Start the local Suhuang Scroll backend?",
      stopBackendConfirm: "Stop the Suhuang Scroll backend started here?",
      backendStarted: "Backend started and passed checks.",
      backendStartPending: "Backend started; waiting for it to become ready.",
      backendStoppedMsg: "Backend stopped.",
      backendAlreadyRunning: "Backend is already running.",
      backendAlreadyStopped: "Backend is not running.",
      backendBridgeUnavailable: "Backend control unavailable: {error}",
      backendDirMissing: "Backend not found. Enter the backend folder in settings.",
    };

    function resolveApiBaseUrl(value) {
      const candidate = String(value ?? DEFAULT_API_BASE_URL).trim() || DEFAULT_API_BASE_URL;
      const url = new URL(candidate);
      if (!HTTP_PROTOCOLS.has(url.protocol)) throw new Error("API 地址必须使用 http 或 https。");
      if (url.username || url.password || url.search || url.hash) {
        throw new Error("API 地址不能包含账号、密码、查询参数或片段。");
      }
      if (!LOOPBACK_HOSTS.has(url.hostname)) {
        throw new Error("只允许连接本机 loopback API。");
      }
      return url.toString().replace(/\/$/, "");
    }

    function timeoutSignal() {
      return globalThis.AbortSignal?.timeout?.(5000);
    }

    async function requestJson(apiBaseUrl, path, init = {}) {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        ...init,
        headers: {
          accept: "application/json",
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...(init.headers ?? {}),
        },
        signal: init.signal ?? timeoutSignal(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof body.detail === "string" ? body.detail : `HTTP ${response.status}`;
        const error = new Error(detail);
        error.status = response.status;
        throw error;
      }
      return body;
    }

    async function requestSettingsBridge(init = {}) {
      const response = await fetch(SETTINGS_BRIDGE_PATH, {
        ...init,
        headers: {
          accept: "application/json",
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...(init.headers ?? {}),
        },
        signal: init.signal ?? timeoutSignal(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) {
        throw new Error(typeof body.error === "string" ? body.error : `HTTP ${response.status}`);
      }
      return body;
    }

    async function requestRuntimeBridge(init = {}) {
      const response = await fetch(RUNTIME_BRIDGE_PATH, {
        ...init,
        headers: {
          accept: "application/json",
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...(init.headers ?? {}),
        },
        signal: init.signal ?? timeoutSignal(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) {
        throw new Error(typeof body.error === "string" ? body.error : `HTTP ${response.status}`);
      }
      return body;
    }

    async function readRuntimeStatus(apiBaseUrl) {
      const [health, automation] = await Promise.all([
        requestJson(apiBaseUrl, "/health"),
        requestJson(apiBaseUrl, "/automation/status"),
      ]);
      return { health, automation };
    }

    async function readRuntimeCatalog(apiBaseUrl) {
      const [resources, specs] = await Promise.all([
        requestJson(apiBaseUrl, "/resources"),
        requestJson(apiBaseUrl, "/specs"),
      ]);
      return { resources, specs };
    }

    function normalizeSettings(value = {}) {
      const threshold = Number(value.confidenceThreshold);
      return {
        apiBaseUrl: String(value.apiBaseUrl ?? DEFAULT_API_BASE_URL).trim() || DEFAULT_API_BASE_URL,
        backendDir: String(value.backendDir ?? "").trim(),
        defaultSpec: String(value.defaultSpec ?? "").trim(),
        adapter: String(value.adapter ?? "").trim(),
        provider: String(value.provider ?? "").trim(),
        model: String(value.model ?? "").trim(),
        providerBaseUrl: String(value.providerBaseUrl ?? "").trim(),
        providerApiKey: "",
        confidenceThreshold: Number.isFinite(threshold)
          ? Math.min(1, Math.max(0, threshold))
          : DEFAULT_CONFIDENCE_THRESHOLD,
      };
    }

    function effectiveDefaultSpec(settings, specs = []) {
      return settings.defaultSpec || specs[0]?.value || "";
    }

    function createStartPayload(settings, specs = []) {
      const normalized = normalizeSettings(settings);
      const specPath = effectiveDefaultSpec(normalized, specs);
      if (!specPath) throw new Error(zh.noSpec);
      const payload = {
        spec_path: specPath,
        dev: false,
        confidence_threshold: normalized.confidenceThreshold,
      };
      if (normalized.adapter) payload.adapter = normalized.adapter;
      if (normalized.provider) payload.provider = normalized.provider;
      if (normalized.model) payload.model = normalized.model;
      return payload;
    }

    function safeBasename(value) {
      const pieces = String(value ?? "").split(/[\\/]/);
      return pieces.at(-1) || "未指定";
    }

    function errorMessage(error) {
      return error instanceof Error ? error.message : String(error);
    }

    function useSettingsSnapshot(settingsScope) {
      const subscribe = React.useCallback((listener) => settingsScope.subscribe(listener), [settingsScope]);
      const getSnapshot = React.useCallback(() => settingsScope.getSnapshot(), [settingsScope]);
      return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    }

    function useSettingsBinding(settingsScope) {
      const officialSnapshot = useSettingsSnapshot(settingsScope);
      const [bridgeSnapshot, setBridgeSnapshot] = React.useState(null);
      const useBridge = officialSnapshot.status === "unavailable";

      React.useEffect(() => {
        if (!useBridge) {
          setBridgeSnapshot(null);
          return undefined;
        }
        let disposed = false;
        void requestSettingsBridge()
          .then((snapshot) => {
            if (!disposed) setBridgeSnapshot(snapshot);
          })
          .catch(() => {
            if (!disposed) setBridgeSnapshot(null);
          });
        return () => {
          disposed = true;
        };
      }, [useBridge]);

      const snapshot = useBridge && bridgeSnapshot ? bridgeSnapshot : officialSnapshot;
      const update = React.useCallback(async (value) => {
        if (useBridge) {
          const next = await requestSettingsBridge({
            method: "POST",
            body: JSON.stringify({
              operation: "update",
              patch: value,
              expectedRevision: snapshot.revision,
            }),
          });
          setBridgeSnapshot(next);
          return next;
        }
        for (const [field, fieldValue] of Object.entries(value)) {
          await settingsScope.set(field, fieldValue);
        }
        return settingsScope.getSnapshot();
      }, [settingsScope, snapshot.revision, useBridge]);
      const reset = React.useCallback(async () => {
        if (useBridge) {
          const next = await requestSettingsBridge({
            method: "POST",
            body: JSON.stringify({ operation: "reset", expectedRevision: snapshot.revision }),
          });
          setBridgeSnapshot(next);
          return next;
        }
        for (const field of ["apiBaseUrl", "backendDir", "defaultSpec", "adapter", "provider", "model", "confidenceThreshold"]) {
          await settingsScope.unset(field);
        }
        return settingsScope.getSnapshot();
      }, [settingsScope, snapshot.revision, useBridge]);

      return { snapshot, update, reset };
    }

    function useTranslation(locale) {
      const subscribe = React.useCallback((listener) => locale.subscribe(listener), [locale]);
      const getRevision = React.useCallback(() => locale.getSnapshot().revision, [locale]);
      React.useSyncExternalStore(subscribe, getRevision, getRevision);
      return locale.bind(NS);
    }

    function runStateLabel(state, t) {
      return t(`state_${state || "unknown"}`) || state || t("state_unknown");
    }

    function formatError(error) {
      return errorMessage(error);
    }

    function friendlyError(error, t) {
      const message = formatError(error);
      return /failed to fetch|fetch failed|networkerror/i.test(message) ? t("connectionFailed") : message;
    }

    function friendlyProviderError(message, t) {
      if (/api key is empty/i.test(message)) return t("modelApiKeyRequired");
      const httpStatus = message.match(/HTTP\s+(401|403)/i)?.[1];
      if (httpStatus) return t("modelAuthFailed", { status: httpStatus });
      if (/timed out|timeout/i.test(message)) return t("modelTimeout");
      return message;
    }

    function formatDuration(value) {
      const totalSeconds = Math.max(0, Number(value) || 0);
      if (totalSeconds < 60) return `${Math.floor(totalSeconds)}s`;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      if (!hours) return `${minutes}m`;
      return `${hours}h ${minutes}m`;
    }

    const inputStyle = {
      border: "1px solid var(--dsw-alias-border-l2)",
      borderRadius: 7,
      background: "var(--dsw-alias-bg-layer-1)",
      color: "var(--dsw-alias-label-primary)",
      padding: "7px 9px",
      font: "inherit",
      minWidth: 0,
      width: "100%",
      boxSizing: "border-box",
    };
    const cardStyle = {
      border: "1px solid var(--dsw-alias-border-l2)",
      borderRadius: 10,
      background: "var(--dsw-alias-bg-layer-2)",
      padding: 14,
    };
    const mutedStyle = { color: "var(--dsw-alias-label-tertiary)", fontSize: 13, lineHeight: 1.55 };

    function ActionButton({ children, disabled, onClick, tone = "primary", wide = false }) {
      const danger = tone === "danger";
      const secondary = tone === "secondary";
      const background = disabled
        ? "var(--dsw-alias-bg-layer-3)"
        : danger || secondary
          ? "var(--dsw-alias-bg-layer-1)"
          : "var(--dsw-alias-state-business-primary)";
      const color = disabled
        ? "var(--dsw-alias-label-tertiary)"
        : danger
          ? "var(--dsw-alias-state-error-primary)"
          : secondary
            ? "var(--dsw-alias-label-primary)"
            : "white";
      return React.createElement("button", {
        type: "button",
        disabled,
        onClick,
        style: {
          boxSizing: "border-box",
          width: wide ? "100%" : "auto",
          minWidth: wide ? 0 : 72,
          height: wide ? 42 : 32,
          border: danger
            ? "1px solid var(--dsw-alias-state-error-primary)"
            : secondary
              ? "1px solid var(--dsw-alias-border-l2)"
              : "1px solid transparent",
          borderRadius: wide ? 10 : 16,
          color,
          background,
          cursor: disabled ? "not-allowed" : "pointer",
          padding: wide ? "0 18px" : "0 14px",
          font: "inherit",
          fontSize: wide ? 14 : 13,
          fontWeight: wide ? 600 : 500,
          lineHeight: "20px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          whiteSpace: "nowrap",
          opacity: disabled ? 0.62 : 1,
        },
      }, children);
    }

    const runtimeTabCss = `
      .suhuang-runtime {
        width: 100%; box-sizing: border-box; display: flex; flex-direction: column;
        gap: 14px; padding: 16px; color: var(--dsw-alias-label-primary);
      }
      .suhuang-runtime__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .suhuang-runtime__title { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.015em; }
      .suhuang-runtime__panel {
        position: relative; overflow: hidden; padding: 17px; border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 14px; background: linear-gradient(145deg, var(--dsw-alias-bg-layer-2), var(--dsw-alias-bg-layer-1));
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.055);
      }
      .suhuang-runtime__heading { margin: 0; font-size: 18px; line-height: 1.35; font-weight: 700; letter-spacing: -0.012em; }
      .suhuang-runtime__description { margin: 7px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 1.6; }
      .suhuang-runtime__badge {
        display: inline-flex; align-items: center; gap: 7px; flex: none; padding: 5px 9px;
        border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px;
        background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 600;
      }
      .suhuang-runtime__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-label-tertiary); }
      .suhuang-runtime__badge[data-tone="success"] .suhuang-runtime__dot { background: var(--dsw-alias-state-success-primary); }
      .suhuang-runtime__badge[data-tone="business"] .suhuang-runtime__dot { background: var(--dsw-alias-state-business-primary); }
      .suhuang-runtime__badge[data-tone="warning"] .suhuang-runtime__dot { background: var(--dsw-alias-state-warn-primary); }
      .suhuang-runtime__badge[data-tone="error"] .suhuang-runtime__dot { background: var(--dsw-alias-state-error-primary); }
      .suhuang-runtime__metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 17px; }
      .suhuang-runtime__metric { min-width: 0; padding: 11px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
      .suhuang-runtime__metric-label { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.4; }
      .suhuang-runtime__metric-value { margin-top: 4px; overflow: hidden; color: var(--dsw-alias-label-primary); font-size: 15px; font-weight: 700; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
      .suhuang-runtime__config { display: grid; grid-template-columns: minmax(0, 1fr); gap: 9px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--dsw-alias-border-l2); }
      .suhuang-runtime__config-row { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 10px; align-items: baseline; font-size: 12px; }
      .suhuang-runtime__config-label { color: var(--dsw-alias-label-tertiary); }
      .suhuang-runtime__config-value { overflow: hidden; color: var(--dsw-alias-label-secondary); text-overflow: ellipsis; white-space: nowrap; }
      .suhuang-runtime__actions { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; margin-top: 17px; }
      .suhuang-runtime__actions--running { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
      .suhuang-runtime__message { margin-top: 12px; padding: 10px 11px; border-radius: 9px; background: var(--dsw-alias-bg-layer-1); font-size: 12px; line-height: 1.55; }
      .suhuang-runtime__message--error { color: var(--dsw-alias-state-error-primary); }
      .suhuang-runtime__message--success { color: var(--dsw-alias-state-success-primary); }
      .suhuang-runtime__details { border-top: 1px solid var(--dsw-alias-border-l2); padding-top: 2px; }
      .suhuang-runtime__details summary { padding: 11px 2px; color: var(--dsw-alias-label-tertiary); cursor: pointer; font-size: 12px; user-select: none; }
      .suhuang-runtime__details-body { display: flex; flex-direction: column; gap: 10px; padding: 3px 2px 2px; }
      @media (max-width: 340px) {
        .suhuang-runtime { padding: 12px; }
        .suhuang-runtime__panel { padding: 14px; }
        .suhuang-runtime__metrics { grid-template-columns: 1fr; }
        .suhuang-runtime__actions--running { grid-template-columns: 1fr; }
      }
    `;

    function StatusBadge({ children, tone = "neutral" }) {
      return React.createElement("span", { className: "suhuang-runtime__badge", "data-tone": tone },
        React.createElement("span", { className: "suhuang-runtime__dot", "aria-hidden": true }),
        children,
      );
    }

    function RuntimeMetric({ label, value }) {
      return React.createElement("div", { className: "suhuang-runtime__metric" },
        React.createElement("div", { className: "suhuang-runtime__metric-label" }, label),
        React.createElement("div", { className: "suhuang-runtime__metric-value", title: String(value) }, value),
      );
    }

    function FieldLabel({ htmlFor, children, hint }) {
      return React.createElement("div", { style: { marginBottom: 6 } },
        React.createElement("label", { htmlFor, style: { display: "block", fontSize: 13 } }, children),
        hint ? React.createElement("div", { style: { ...mutedStyle, marginTop: 4 } }, hint) : null,
      );
    }

    function TextField({ id, label, hint, value, onChange, disabled, type = "text", min, max, step, placeholder, autoComplete }) {
      return React.createElement("div", null,
        React.createElement(FieldLabel, { htmlFor: id, hint }, label),
        React.createElement("input", {
          id,
          value,
          type,
          min,
          max,
          step,
          placeholder,
          autoComplete,
          disabled,
          onChange,
          style: inputStyle,
          spellCheck: false,
        }),
      );
    }

    function SelectField({ id, label, hint, value, onChange, options, disabled }) {
      return React.createElement("div", null,
        React.createElement(FieldLabel, { htmlFor: id, hint }, label),
        React.createElement("select", { id, value, onChange, disabled, style: inputStyle },
          options.map((option, index) => React.createElement("option", {
            key: `${id}-${option.value || "empty"}-${index}`,
            value: option.value,
          }, option.label)),
        ),
      );
    }

    function DetailGrid({ rows }) {
      return React.createElement("dl", {
        style: {
          margin: 0,
          display: "grid",
          gridTemplateColumns: "minmax(76px, auto) minmax(0, 1fr)",
          gap: "6px 12px",
          fontSize: 13,
        },
      }, ...rows.flatMap(([label, value], index) => [
        React.createElement("dt", { key: `${index}-${label}-dt`, style: mutedStyle }, label),
        React.createElement("dd", { key: `${index}-${label}-dd`, style: { margin: 0, overflowWrap: "anywhere" } }, value),
      ]));
    }

    function MessageBlock({ error, message }) {
      return React.createElement(React.Fragment, null,
        error ? React.createElement("p", {
          role: "alert",
          style: { margin: 0, color: "var(--dsw-alias-state-error-primary)", fontSize: 13 },
        }, error) : null,
        message ? React.createElement("p", {
          role: "status",
          style: { margin: 0, color: "var(--dsw-alias-state-success-primary)", fontSize: 13 },
        }, message) : null,
      );
    }

    function useInitialCatalog(snapshot, refreshResources, testConnection) {
      const loaded = React.useRef(false);
      React.useEffect(() => {
        if (loaded.current || snapshot.status === "loading") return;
        loaded.current = true;
        const baseUrl = normalizeSettings(snapshot.value).apiBaseUrl;
        void refreshResources(baseUrl);
        void testConnection(baseUrl);
      }, [snapshot.status, snapshot.value, refreshResources, testConnection]);
      return snapshot;
    }

    function SuhuangSettingsSection({ settingsScope, locale }) {
      const t = useTranslation(locale);
      const [draft, setDraft] = React.useState(() => normalizeSettings());
      const [dirty, setDirty] = React.useState(false);
      const [modelDirty, setModelDirty] = React.useState(false);
      const [saving, setSaving] = React.useState(false);
      const [error, setError] = React.useState("");
      const [message, setMessage] = React.useState("");
      const [connection, setConnection] = React.useState({ state: "idle", health: null, automation: null, error: "" });
      const [modelConnection, setModelConnection] = React.useState({ state: "idle", ok: null, message: "", apiKeyConfigured: false });
      const [catalog, setCatalog] = React.useState({ state: "idle", data: null, error: "" });
      const dirtyRef = React.useRef(false);
      const settings = useSettingsBinding(settingsScope);
      const { snapshot } = settings;

      React.useEffect(() => {
        if (!dirty && snapshot.value) {
          setDraft((current) => ({
            ...normalizeSettings(snapshot.value),
            providerBaseUrl: current.providerBaseUrl,
            providerApiKey: "",
          }));
        }
      }, [dirty, snapshot.value]);

      const refreshResources = React.useCallback(async (baseUrl = DEFAULT_API_BASE_URL) => {
        setCatalog({ state: "loading", data: null, error: "" });
        try {
          const normalized = resolveApiBaseUrl(baseUrl);
          const [resources, specs, provider] = await Promise.all([
            requestJson(normalized, "/resources"),
            requestJson(normalized, "/specs"),
            requestJson(normalized, "/provider/status"),
          ]);
          setCatalog({ state: "ready", data: { resources, specs, provider }, error: "" });
          setModelConnection({ state: "idle", ok: null, message: "", apiKeyConfigured: Boolean(provider.api_key_configured) });
          if (!dirtyRef.current) {
            setDraft((current) => ({
              ...current,
              provider: provider.provider || current.provider,
              model: provider.model || current.model,
              providerBaseUrl: provider.base_url || current.providerBaseUrl,
              providerApiKey: "",
            }));
          }
        } catch (cause) {
          setCatalog({ state: "error", data: null, error: formatError(cause) });
        }
      }, []);

      const testConnection = React.useCallback(async (baseUrl = DEFAULT_API_BASE_URL) => {
        setConnection({ state: "loading", health: null, automation: null, error: "" });
        try {
          const normalized = resolveApiBaseUrl(baseUrl);
          const result = await readRuntimeStatus(normalized);
          setConnection({ state: "ready", ...result, error: "" });
        } catch (cause) {
          setConnection({ state: "error", health: null, automation: null, error: formatError(cause) });
        }
      }, []);

      useInitialCatalog(snapshot, refreshResources, testConnection);

      const updateDraft = (field, value) => {
        setDraft((current) => ({ ...current, [field]: value }));
        setDirty(true);
        dirtyRef.current = true;
        if (["provider", "model", "providerBaseUrl", "providerApiKey"].includes(field)) {
          setModelDirty(true);
          setModelConnection((current) => ({ ...current, state: "idle", ok: null, message: "" }));
        }
        setError("");
        setMessage("");
      };

      const providerPayload = () => ({
        provider: draft.provider,
        model: draft.model,
        base_url: draft.providerBaseUrl,
        api_key: draft.providerApiKey || undefined,
      });

      const testModelConnection = async () => {
        setModelConnection((current) => ({ ...current, state: "loading", ok: null, message: "" }));
        try {
          const apiBaseUrl = resolveApiBaseUrl(draft.apiBaseUrl);
          const result = await requestJson(apiBaseUrl, "/provider/test", {
            method: "POST",
            body: JSON.stringify(providerPayload()),
            signal: globalThis.AbortSignal?.timeout?.(20000),
          });
          setModelConnection({
            state: "ready",
            ok: result.connection_test?.ok === true,
            message: result.connection_test?.message || "",
            apiKeyConfigured: Boolean(result.api_key_configured),
          });
        } catch (cause) {
          setModelConnection((current) => ({ ...current, state: "error", ok: false, message: formatError(cause) }));
        }
      };

      const saveSettings = async () => {
        setSaving(true);
        setError("");
        setMessage("");
        try {
          const apiBaseUrl = resolveApiBaseUrl(draft.apiBaseUrl);
          const next = normalizeSettings({ ...draft, apiBaseUrl });
          const providerResult = modelDirty
            ? await requestJson(apiBaseUrl, "/provider/config", {
              method: "PUT",
              body: JSON.stringify(providerPayload()),
            })
            : null;
          await settings.update(next);
          setDraft({
            ...next,
            provider: providerResult?.provider ?? next.provider,
            model: providerResult?.model ?? next.model,
            providerBaseUrl: providerResult?.base_url ?? next.providerBaseUrl,
            providerApiKey: "",
          });
          setDirty(false);
          setModelDirty(false);
          dirtyRef.current = false;
          if (providerResult) {
            setModelConnection((current) => ({ ...current, apiKeyConfigured: Boolean(providerResult.api_key_configured) }));
          }
          setMessage(t("saveSuccess"));
          void refreshResources(apiBaseUrl);
          void testConnection(apiBaseUrl);
        } catch (cause) {
          setError(formatError(cause));
        } finally {
          setSaving(false);
        }
      };

      const resetSettings = async () => {
        if (!globalThis.confirm(t("resetConfirm"))) return;
        setSaving(true);
        setError("");
        setMessage("");
        try {
          await settings.reset();
          const next = normalizeSettings();
          setDraft(next);
          setDirty(false);
          setModelDirty(false);
          dirtyRef.current = false;
          setMessage(t("resetSuccess"));
          void refreshResources(next.apiBaseUrl);
          void testConnection(next.apiBaseUrl);
        } catch (cause) {
          setError(formatError(cause));
        } finally {
          setSaving(false);
        }
      };

      const resourceData = catalog.data?.resources ?? { providers: [], modelsByProvider: {}, adapters: [], defaultProvider: null, defaultAdapter: null };
      const specs = catalog.data?.specs?.specs ?? [];
      const defaultProvider = resourceData.defaultProvider || resourceData.providers[0]?.value || "";
      const defaultAdapter = resourceData.defaultAdapter || resourceData.adapters[0]?.value || "";
      const followRuntime = (value) => value ? t("followRuntime", { value }) : t("followRuntimeUnknown");
      const settingsDisabled = saving || !snapshot.writable || snapshot.status !== "ready";
      const connected = connection.state === "ready";

      return React.createElement("div", {
        "data-testid": "suhuang-scroll-settings",
        style: { width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 14, color: "var(--dsw-alias-label-primary)" },
      },
        React.createElement("div", null,
          React.createElement("h2", { style: { margin: 0, fontSize: 18 } }, t("title")),
          React.createElement("p", { style: { ...mutedStyle, margin: "6px 0 0" } }, t("description")),
        ),
        snapshot.status === "unavailable"
          ? React.createElement("p", { role: "status", style: { ...mutedStyle, margin: 0 } }, t("settingsUnavailable"))
          : !snapshot.writable
            ? React.createElement("p", { role: "status", style: { ...mutedStyle, margin: 0 } }, t("settingsReadOnly"))
            : null,
        React.createElement("section", { style: cardStyle },
          React.createElement(TextField, {
            id: "suhuang-api-base-url",
            label: t("apiAddress"),
            hint: t("apiAddressHint"),
            value: draft.apiBaseUrl,
            disabled: settingsDisabled,
            onChange: (event) => updateDraft("apiBaseUrl", event.target.value),
          }),
        ),
        React.createElement("section", { style: cardStyle },
          React.createElement(TextField, {
            id: "suhuang-backend-dir",
            label: t("backendDir"),
            hint: t("backendDirHint"),
            value: draft.backendDir,
            disabled: settingsDisabled,
            onChange: (event) => updateDraft("backendDir", event.target.value),
          }),
        ),
        React.createElement("section", { style: { ...cardStyle, display: "flex", flexDirection: "column", gap: 13 } },
          React.createElement(SelectField, {
            id: "suhuang-default-spec",
            label: t("defaultSpec"),
            hint: t("defaultSpecHint"),
            value: draft.defaultSpec || specs[0]?.value || "",
            disabled: settingsDisabled || catalog.state === "loading",
            onChange: (event) => updateDraft("defaultSpec", event.target.value),
            options: specs.length
              ? specs.map((spec) => ({ value: spec.value, label: spec.label || spec.value }))
              : [{ value: "", label: catalog.state === "loading" ? t("loading") : t("noSpec") }],
          }),
          React.createElement(SelectField, {
            id: "suhuang-default-adapter",
            label: t("defaultAdapter"),
            value: draft.adapter,
            disabled: settingsDisabled || catalog.state === "loading",
            onChange: (event) => updateDraft("adapter", event.target.value),
            options: [{ value: "", label: followRuntime(defaultAdapter) }, ...resourceData.adapters.map((option) => ({ value: option.value, label: option.label || option.value }))],
          }),
          React.createElement(TextField, {
            id: "suhuang-confidence-threshold",
            label: t("confidenceThreshold"),
            hint: t("confidenceThresholdHint"),
            value: String(draft.confidenceThreshold),
            type: "number",
            min: 0,
            max: 1,
            step: 0.01,
            disabled: settingsDisabled,
            onChange: (event) => {
              const raw = event.target.value.trim();
              if (raw === "") return;
              const next = Number(raw);
              if (Number.isFinite(next)) updateDraft("confidenceThreshold", next);
            },
          }),
        ),
        React.createElement("section", { style: { ...cardStyle, display: "flex", flexDirection: "column", gap: 13 } },
          React.createElement("div", null,
            React.createElement("h3", { style: { margin: 0, fontSize: 15 } }, t("modelService")),
            React.createElement("p", { style: { ...mutedStyle, margin: "5px 0 0" } }, t("modelServiceHint")),
          ),
          React.createElement(SelectField, {
            id: "suhuang-default-provider",
            label: t("defaultProvider"),
            value: draft.provider,
            disabled: settingsDisabled || catalog.state === "loading",
            onChange: (event) => updateDraft("provider", event.target.value),
            options: [{ value: "", label: followRuntime(defaultProvider) }, ...resourceData.providers.map((option) => ({ value: option.value, label: option.label || option.value }))],
          }),
          React.createElement(TextField, {
            id: "suhuang-default-model",
            label: t("defaultModel"),
            hint: t("defaultModelHint"),
            value: draft.model,
            disabled: settingsDisabled,
            onChange: (event) => updateDraft("model", event.target.value),
          }),
          React.createElement(TextField, {
            id: "suhuang-provider-base-url",
            label: t("providerBaseUrl"),
            hint: t("providerBaseUrlHint"),
            value: draft.providerBaseUrl,
            disabled: settingsDisabled,
            placeholder: "https://api.example.com/v1",
            onChange: (event) => updateDraft("providerBaseUrl", event.target.value),
          }),
          React.createElement(TextField, {
            id: "suhuang-provider-api-key",
            label: t("providerApiKey"),
            hint: t("providerApiKeyHint"),
            value: draft.providerApiKey,
            type: "password",
            autoComplete: "new-password",
            disabled: settingsDisabled,
            placeholder: modelConnection.apiKeyConfigured ? "••••••••••••" : "sk-…",
            onChange: (event) => updateDraft("providerApiKey", event.target.value),
          }),
          React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" } },
            React.createElement("span", { style: { ...mutedStyle, color: modelConnection.apiKeyConfigured ? "var(--dsw-alias-state-success-primary)" : undefined } },
              t(modelConnection.apiKeyConfigured ? "providerApiKeyConfigured" : "providerApiKeyMissing"),
            ),
            React.createElement(ActionButton, {
              onClick: () => void testModelConnection(),
              disabled: saving || modelConnection.state === "loading",
              tone: "secondary",
            }, modelConnection.state === "loading" ? t("loading") : t("modelConnectionTest")),
          ),
          modelConnection.state === "ready" && modelConnection.ok
            ? React.createElement("p", { role: "status", style: { ...mutedStyle, margin: 0, color: "var(--dsw-alias-state-success-primary)" } }, t("modelConnectionSuccess"))
            : modelConnection.state === "error" || (modelConnection.state === "ready" && !modelConnection.ok)
              ? React.createElement("p", { role: "alert", style: { ...mutedStyle, margin: 0, color: "var(--dsw-alias-state-error-primary)" } }, t("modelConnectionFailure", { error: friendlyProviderError(modelConnection.message, t) }))
              : React.createElement("p", { style: { ...mutedStyle, margin: 0 } }, t("modelConnectionIdle")),
        ),
        React.createElement("section", { style: cardStyle },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            React.createElement("h3", { style: { margin: 0, fontSize: 14 } }, t("runtimeStatus")),
            React.createElement(ActionButton, { onClick: () => void testConnection(draft.apiBaseUrl), disabled: saving }, t("connectionTest")),
          ),
          connection.state === "loading"
            ? React.createElement("p", { style: { ...mutedStyle, margin: "10px 0 0" } }, t("loading"))
            : connected
              ? React.createElement(React.Fragment, null,
                React.createElement("p", { style: { ...mutedStyle, margin: "10px 0 8px", color: "var(--dsw-alias-state-success-primary)" } }, t("connected")),
                React.createElement(DetailGrid, { rows: [
                  [t("runtimeVersion"), connection.health?.version ?? "—"],
                  [t("protocolVersion"), connection.health?.protocol_version ?? "—"],
                  [t("status"), runStateLabel(connection.automation?.run?.state, t)],
                ] }),
              )
              : React.createElement("p", { style: { ...mutedStyle, margin: "10px 0 0" } }, connection.error || (connection.state === "idle" ? t("connectionIdle") : t("notConnected"))),
        ),
        React.createElement("section", { style: cardStyle },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            React.createElement("h3", { style: { margin: 0, fontSize: 14 } }, t("resources")),
            React.createElement(ActionButton, { onClick: () => void refreshResources(draft.apiBaseUrl), disabled: saving }, t("refreshResources")),
          ),
          catalog.state === "loading"
            ? React.createElement("p", { style: { ...mutedStyle, margin: "10px 0 0" } }, t("resourcesLoading"))
            : catalog.state === "ready"
              ? React.createElement("p", { style: { ...mutedStyle, margin: "10px 0 0", color: "var(--dsw-alias-state-success-primary)" } }, t("resourcesSuccess", { specs: specs.length, providers: resourceData.providers.length, adapters: resourceData.adapters.length }))
              : catalog.state === "error"
                ? React.createElement("p", { style: { ...mutedStyle, margin: "10px 0 0", color: "var(--dsw-alias-state-error-primary)" } }, t("resourceFailure", { error: catalog.error }))
                : React.createElement("p", { style: { ...mutedStyle, margin: "10px 0 0" } }, t("resourcesIdle")),
        ),
        React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          React.createElement(ActionButton, { onClick: () => void saveSettings(), disabled: settingsDisabled || !dirty }, t("save")),
          React.createElement(ActionButton, { onClick: () => void resetSettings(), disabled: settingsDisabled }, t("reset")),
        ),
        React.createElement(MessageBlock, { error, message }),
      );
    }

    function SuhuangRuntimeTab({ settingsScope, locale, visible }) {
      const t = useTranslation(locale);
      const { snapshot } = useSettingsBinding(settingsScope);
      const settings = normalizeSettings(snapshot.value);
      const [health, setHealth] = React.useState(null);
      const [automation, setAutomation] = React.useState(null);
      const [catalog, setCatalog] = React.useState({ resources: null, specs: [] });
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState("");
      const [message, setMessage] = React.useState("");
      const [backend, setBackend] = React.useState(null);
      const [backendBusy, setBackendBusy] = React.useState(false);
      const [backendError, setBackendError] = React.useState("");

      const refreshStatus = React.useCallback(async () => {
        try {
          const apiBaseUrl = resolveApiBaseUrl(settings.apiBaseUrl);
          const result = await readRuntimeStatus(apiBaseUrl);
          setHealth(result.health);
          setAutomation(result.automation);
          setError("");
        } catch (cause) {
          setHealth(null);
          setAutomation(null);
          setError(friendlyError(cause, t));
        }
      }, [settings.apiBaseUrl]);

      const refreshCatalog = React.useCallback(async () => {
        try {
          const apiBaseUrl = resolveApiBaseUrl(settings.apiBaseUrl);
          const result = await readRuntimeCatalog(apiBaseUrl);
          setCatalog({ resources: result.resources, specs: result.specs?.specs ?? [] });
        } catch {
          setCatalog({ resources: null, specs: [] });
        }
      }, [settings.apiBaseUrl]);

      React.useEffect(() => {
        if (!visible) return undefined;
        void refreshStatus();
        const timer = globalThis.setInterval(() => void refreshStatus(), 4000);
        return () => globalThis.clearInterval(timer);
      }, [visible, refreshStatus]);

      React.useEffect(() => {
        if (visible) void refreshCatalog();
      }, [visible, refreshCatalog]);

      const control = async (action, label, confirmMessage = "") => {
        if (confirmMessage && !globalThis.confirm(confirmMessage)) return;
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const apiBaseUrl = resolveApiBaseUrl(settings.apiBaseUrl);
          const result = await requestJson(apiBaseUrl, `/automation/${action}`, { method: "POST" });
          setMessage(t("controlSent", { action: label }));
          setAutomation((current) => ({ ...(current ?? {}), run: result, active: result.state !== "stopped" }));
          await refreshStatus();
        } catch (cause) {
          setError(t("runtimeUnavailable", { error: friendlyError(cause, t) }));
        } finally {
          setBusy(false);
        }
      };

      const start = async () => {
        const defaultSpec = effectiveDefaultSpec(settings, catalog.specs);
        if (!defaultSpec) {
          setError(t("noSpec"));
          return;
        }
        if (!globalThis.confirm(t("startContinuousConfirm"))) return;
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const apiBaseUrl = resolveApiBaseUrl(settings.apiBaseUrl);
          const payload = createStartPayload(settings, catalog.specs);
          const result = await requestJson(apiBaseUrl, "/automation/start", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          setMessage(t("controlSent", { action: t("startGrading") }));
          setAutomation((current) => ({ ...(current ?? {}), run: result, active: true }));
          await refreshStatus();
        } catch (cause) {
          setError(t("runtimeUnavailable", { error: friendlyError(cause, t) }));
        } finally {
          setBusy(false);
        }
      };

      const refreshBackend = React.useCallback(async () => {
        try {
          const state = await requestRuntimeBridge();
          setBackend(state);
          setBackendError("");
        } catch (cause) {
          setBackendError(t("backendBridgeUnavailable", { error: friendlyError(cause, t) }));
        }
      }, []);

      React.useEffect(() => {
        if (!visible) return undefined;
        void refreshBackend();
        const timer = globalThis.setInterval(() => void refreshBackend(), 5000);
        return () => globalThis.clearInterval(timer);
      }, [visible, refreshBackend]);

      const startBackend = async () => {
        setBackendBusy(true);
        setBackendError("");
        try {
          const state = await requestRuntimeBridge({
            method: "POST",
            body: JSON.stringify({ action: "start" }),
          });
          setBackend(state);
          if (state.health) {
            setMessage(t("backendStarted"));
          } else if (state.alreadyManaged) {
            setMessage(t("backendAlreadyRunning"));
          } else {
            setMessage(t("backendStartPending"));
          }
          await refreshStatus();
        } catch (cause) {
          setBackendError(t("backendBridgeUnavailable", { error: friendlyError(cause, t) }));
        } finally {
          setBackendBusy(false);
        }
      };

      const stopBackend = async () => {
        if (!globalThis.confirm(t("stopServiceConfirm"))) return;
        setBackendBusy(true);
        setBackendError("");
        try {
          const state = await requestRuntimeBridge({
            method: "POST",
            body: JSON.stringify({ action: "stop" }),
          });
          setBackend(state);
          if (state.alreadyStopped) {
            setMessage(t("backendAlreadyStopped"));
          } else {
            setMessage(t("backendStoppedMsg"));
          }
          await refreshStatus();
        } catch (cause) {
          setBackendError(t("backendBridgeUnavailable", { error: friendlyError(cause, t) }));
        } finally {
          setBackendBusy(false);
        }
      };

      const run = automation?.run;
      const connected = Boolean(health && automation);
      const active = Boolean(automation?.active);
      const canControl = Boolean(automation?.active && run);
      const hasSpec = Boolean(effectiveDefaultSpec(settings, catalog.specs));
      const state = run?.state ?? "idle";
      const runningStates = new Set(["starting", "capturing", "grading", "submitting", "waiting_next_page"]);
      const isRunning = runningStates.has(state);
      const isPaused = state === "paused";
      const isPausePending = Boolean(run?.pause_requested && !isPaused);
      const isAwaiting = state === "awaiting_confirmation";
      const isError = state === "error";
      const isCompleted = state === "stopped" && run?.pause_reason === "end_of_queue";
      const serviceStarting = backendBusy || Boolean(backend?.process?.running && !connected);
      const completedCount = Number(run?.completed_count ?? 0);
      const specValue = run?.spec_path || effectiveDefaultSpec(settings, catalog.specs);
      const adapterValue = run?.adapter || settings.adapter || catalog.resources?.defaultAdapter || "—";

      let title = t("serviceTitle");
      let description = t("serviceDescription");
      let badge = t("badgeOffline");
      let badgeTone = "neutral";
      if (serviceStarting) {
        title = t("serviceConnectingTitle");
        description = t("serviceConnectingDescription");
        badge = t("badgeStarting");
        badgeTone = "business";
      }
      if (connected) {
        title = t("readyTitle");
        description = t("readyDescription");
        badge = t("badgeReady");
        badgeTone = "success";
      }
      if (isPausePending) {
        title = t("pausingTitle");
        description = t("pausingDescription");
        badge = t("badgePausing");
        badgeTone = "warning";
      } else if (isRunning) {
        title = t("gradingTitle");
        description = t("gradingDescription");
        badge = t("badgeGrading");
        badgeTone = "business";
      } else if (isPaused) {
        title = t("pausedTitle");
        description = t("pausedDescription");
        badge = t("badgePaused");
        badgeTone = "warning";
      } else if (isAwaiting) {
        title = t("awaitingTitle");
        description = t("awaitingDescription");
        badge = t("pending");
        badgeTone = "warning";
      } else if (isError) {
        title = t("errorTitle");
        description = run?.error_message || t("errorDescription");
        badge = t("badgeError");
        badgeTone = "error";
      } else if (isCompleted) {
        title = t("completedTitle");
        description = t("completedDescription");
        badge = t("badgeCompleted");
        badgeTone = "success";
      } else if (state === "stopped") {
        title = t("stoppedTitle");
        description = t("stoppedDescription");
        badge = t("badgeStopped");
      }

      let actionContent;
      if (!connected) {
        actionContent = React.createElement(ActionButton, {
          wide: true,
          onClick: () => void startBackend(),
          disabled: backendBusy || Boolean(backend?.process?.running),
        }, serviceStarting ? t("startProductPending") : t("startProduct"));
      } else if (!active || state === "stopped") {
        actionContent = React.createElement(ActionButton, {
          wide: true,
          onClick: () => void start(),
          disabled: busy || !hasSpec,
        }, isCompleted ? t("startNewRound") : t("startGrading"));
      } else if (isPausePending || isPaused || isError) {
        actionContent = React.createElement(ActionButton, {
          wide: true,
          onClick: () => void control("resume", isError ? t("retryGrading") : t("resumeGrading")),
          disabled: busy || !canControl,
        }, isError ? t("retryGrading") : t("resumeGrading"));
      } else if (isAwaiting) {
        actionContent = React.createElement(ActionButton, {
          wide: true,
          tone: "secondary",
          disabled: true,
        }, t("awaitingTitle"));
      } else {
        actionContent = React.createElement(React.Fragment, null,
          React.createElement(ActionButton, {
            wide: true,
            tone: "secondary",
            onClick: () => void control("pause", t("pauseGrading")),
            disabled: busy || !canControl,
          }, t("pauseGrading")),
          React.createElement(ActionButton, {
            wide: true,
            tone: "danger",
            onClick: () => void control("stop", t("endGrading"), t("endGradingConfirm")),
            disabled: busy || !canControl,
          }, t("endGrading")),
        );
      }

      const visibleError = error || (!connected ? backendError : "");
      const showMetrics = Boolean(run && state !== "idle");
      const showRunningActions = Boolean(connected && active && !isPausePending && !isPaused && !isError && !isAwaiting);

      return React.createElement("div", {
        "data-testid": "suhuang-scroll-runtime-tab",
        className: "suhuang-runtime",
      },
        React.createElement("style", null, runtimeTabCss),
        React.createElement("header", { className: "suhuang-runtime__header" },
          React.createElement("h2", { className: "suhuang-runtime__title" }, t("title")),
          React.createElement(StatusBadge, { tone: badgeTone }, badge),
        ),
        React.createElement("section", { className: "suhuang-runtime__panel" },
          React.createElement("h3", { className: "suhuang-runtime__heading" }, title),
          React.createElement("p", { className: "suhuang-runtime__description" }, description),
          showMetrics
            ? React.createElement("div", { className: "suhuang-runtime__metrics" },
              React.createElement(RuntimeMetric, { label: t("completedPapers"), value: `${completedCount} ${t("papersUnit")}` }),
              React.createElement(RuntimeMetric, {
                label: t("currentStage"),
                value: isCompleted ? t("badgeCompleted") : isPausePending ? t("badgePausing") : runStateLabel(state, t),
              }),
              React.createElement(RuntimeMetric, { label: t("elapsed"), value: formatDuration(run?.elapsed_seconds) }),
            )
            : null,
          React.createElement("div", { className: "suhuang-runtime__config" },
            React.createElement("div", { className: "suhuang-runtime__config-row" },
              React.createElement("span", { className: "suhuang-runtime__config-label" }, t("selectedSpec")),
              React.createElement("span", { className: "suhuang-runtime__config-value", title: String(specValue || "") }, specValue ? safeBasename(specValue) : "—"),
            ),
            React.createElement("div", { className: "suhuang-runtime__config-row" },
              React.createElement("span", { className: "suhuang-runtime__config-label" }, t("selectedAdapter")),
              React.createElement("span", { className: "suhuang-runtime__config-value", title: String(adapterValue) }, adapterValue),
            ),
          ),
          React.createElement("div", {
            className: `suhuang-runtime__actions${showRunningActions ? " suhuang-runtime__actions--running" : ""}`,
          }, actionContent),
          !hasSpec && connected
            ? React.createElement("div", { className: "suhuang-runtime__message suhuang-runtime__message--error" }, t("noSpec"))
            : null,
          visibleError
            ? React.createElement("div", { role: "alert", className: "suhuang-runtime__message suhuang-runtime__message--error" }, visibleError)
            : message
              ? React.createElement("div", { role: "status", className: "suhuang-runtime__message suhuang-runtime__message--success" }, message)
              : null,
        ),
        React.createElement("details", { className: "suhuang-runtime__details" },
          React.createElement("summary", null, t("connectionDetails")),
          React.createElement("div", { className: "suhuang-runtime__details-body" },
            React.createElement(DetailGrid, { rows: [
              [t("localService"), connected ? t("serviceReady") : backend?.process?.running ? t("backendStarting") : t("backendStopped")],
              [t("backendPort"), String(backend?.port ?? "—")],
              [t("status"), connected
                ? backend?.process?.managed ? t("serviceManaged") : t("serviceExternal")
                : backend?.process?.running ? t("backendStarting") : t("backendStopped")],
            ] }),
            backendError
              ? React.createElement("div", { className: "suhuang-runtime__message suhuang-runtime__message--error" }, backendError)
              : null,
            backend?.process?.managed
              ? React.createElement(React.Fragment, null,
                React.createElement(ActionButton, {
                  tone: "danger",
                  onClick: () => void stopBackend(),
                  disabled: backendBusy || active,
                }, t("closeService")),
                active ? React.createElement("div", { style: mutedStyle }, t("serviceCloseBlocked")) : null,
              )
              : null,
          ),
        ),
      );
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "suhuang-scroll: browser dictionaries");
      const settingsScope = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE });
      const locale = ctx.locale;
      const t = locale.bind(NS);

      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "suhuang-scroll",
        order: 120,
        label: () => t("tab"),
        locale: NS,
        inject: () => ({ settingsScope, locale }),
      }, SuhuangSettingsSection));

      ctx.inject(["betterSidebar"], (sidebarCtx) => {
        const sidebar = sidebarCtx.get("betterSidebar");
        if (!sidebar) return;
        sidebarCtx.effect(() => sidebar.registerTab({
          id: SIDEBAR_TAB_ID,
          title: () => t("tab"),
          icon: (size) => React.createElement(IconListPenOutline16, { size }),
          order: 60,
          single: true,
          component: (props) => React.createElement(SuhuangRuntimeTab, {
            ...props,
            settingsScope,
            locale,
          }),
        }), "suhuang-scroll: better-sidebar runtime tab");
      });
    }

    const inject = ["slots", "locale", "connection", "remote", "settingsScope"];

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
