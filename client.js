window.__ModuleLoader__.load({
  id: "dsh-suhuang-scroll",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api";
    const DEFAULT_CONFIDENCE_THRESHOLD = 0.9;
    const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
    const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
    const SETTINGS_NAMESPACE = "suhuang-scroll";
    const SIDEBAR_TAB_ID = "suhuang-scroll:runtime";
    const SETTINGS_BRIDGE_PATH = "/suhuang-scroll/settings";
    const NS = "settings.suhuangScroll";

    const zh = {
      tab: "苏黄共阅",
      title: "苏黄共阅",
      description: "本地评分 Runtime 的运行默认值与连接设置。运行控制位于侧边栏 Tab。",
      apiAddress: "Runtime API 地址",
      apiAddressHint: "仅允许连接 localhost、127.0.0.1 或 ::1；不会保存凭据。",
      defaultSpec: "默认 Spec",
      defaultSpecHint: "启动时使用；留空时使用当前 Spec 列表首项。",
      defaultAdapter: "默认站点适配器",
      defaultProvider: "默认 Provider",
      defaultModel: "默认 Model",
      confidenceThreshold: "运行置信度阈值",
      confidenceThresholdHint: "范围 0 到 1；仅影响本次人工确认运行的建议阈值。",
      followRuntime: "跟随 Runtime 默认值（{value}）",
      followRuntimeUnknown: "跟随 Runtime 默认值",
      save: "保存设置",
      reset: "恢复默认值",
      resetConfirm: "确认恢复苏黄共阅的默认设置吗？这会修改当前 DSH Profile 设置。",
      saveSuccess: "设置已保存到当前 DSH Profile。",
      resetSuccess: "已恢复默认设置。",
      settingsUnavailable: "DSH Profile 设置暂不可用，当前页面只能显示默认值。",
      settingsReadOnly: "当前 DSH Profile 设置不可写。",
      runtimeStatus: "Runtime 连接测试",
      connectionTest: "连接测试",
      connected: "已连接",
      notConnected: "Runtime 未连接，请检查 API 地址和本地服务。",
      connectionIdle: "尚未测试连接。",
      runtimeVersion: "Runtime 版本",
      protocolVersion: "协议版本",
      resources: "Runtime 资源",
      refreshResources: "刷新资源",
      resourcesIdle: "尚未读取资源。",
      resourcesLoading: "正在读取 Spec、Provider 和适配器……",
      resourcesSuccess: "已读取 {specs} 个 Spec、{providers} 个 Provider、{adapters} 个适配器。",
      resourceFailure: "资源读取失败：{error}",
      specs: "Spec",
      providers: "Provider",
      adapters: "适配器",
      currentTask: "当前任务",
      runtimeControls: "运行控制",
      noTask: "当前没有评分任务。",
      status: "状态",
      adapter: "适配器",
      spec: "Spec 文件",
      completed: "已完成",
      pending: "待人工确认",
      runError: "运行错误",
      runtimeUnavailable: "Runtime 不可用：{error}",
      loading: "读取中……",
      manualOnly: "侧边栏只启动人工确认模式；此处没有成绩提交或自动提交操作。",
      start: "启动",
      pause: "暂停",
      resume: "继续",
      stop: "停止",
      startConfirm: "确认启动一次苏黄共阅人工确认评分任务吗？不会自动提交成绩。",
      confirmControl: "确认执行“{action}”吗？这会改变本地评分任务状态。",
      controlSent: "已发送“{action}”操作。",
      noSpec: "没有可用的默认 Spec，请先在设置主菜单中选择 Spec。",
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
    };
    const en = {
      tab: "Suhuang Scroll",
      title: "Suhuang Scroll",
      description: "Local grading Runtime defaults and connection settings. Runtime controls are in the sidebar tab.",
      apiAddress: "Runtime API address",
      apiAddressHint: "Only localhost, 127.0.0.1, and ::1 are allowed; credentials are never stored.",
      defaultSpec: "Default Spec",
      defaultSpecHint: "Used when starting a run; an empty value uses the first available Spec.",
      defaultAdapter: "Default site adapter",
      defaultProvider: "Default Provider",
      defaultModel: "Default Model",
      confidenceThreshold: "Run confidence threshold",
      confidenceThresholdHint: "From 0 to 1; applies to the manual-confirmation run's suggestion threshold.",
      followRuntime: "Follow Runtime default ({value})",
      followRuntimeUnknown: "Follow Runtime default",
      save: "Save settings",
      reset: "Restore defaults",
      resetConfirm: "Restore Suhuang Scroll defaults? This changes the current DSH Profile settings.",
      saveSuccess: "Settings saved to the current DSH Profile.",
      resetSuccess: "Default settings restored.",
      settingsUnavailable: "DSH Profile settings are unavailable; this page is showing defaults only.",
      settingsReadOnly: "The current DSH Profile settings are read-only.",
      runtimeStatus: "Runtime connection test",
      connectionTest: "Test connection",
      connected: "Connected",
      notConnected: "Runtime is not connected. Check the API address and local service.",
      connectionIdle: "Connection has not been tested.",
      runtimeVersion: "Runtime version",
      protocolVersion: "Protocol version",
      resources: "Runtime resources",
      refreshResources: "Refresh resources",
      resourcesIdle: "Resources have not been read.",
      resourcesLoading: "Reading Specs, Providers, and adapters…",
      resourcesSuccess: "Read {specs} Specs, {providers} Providers, and {adapters} adapters.",
      resourceFailure: "Resource read failed: {error}",
      specs: "Specs",
      providers: "Providers",
      adapters: "Adapters",
      currentTask: "Current task",
      runtimeControls: "Runtime controls",
      noTask: "There is no grading task.",
      status: "Status",
      adapter: "Adapter",
      spec: "Spec file",
      completed: "Completed",
      pending: "Pending confirmation",
      runError: "Run error",
      runtimeUnavailable: "Runtime unavailable: {error}",
      loading: "Loading…",
      manualOnly: "The sidebar starts manual-confirmation runs only; it has no score submission or auto-submit action.",
      start: "Start",
      pause: "Pause",
      resume: "Resume",
      stop: "Stop",
      startConfirm: "Start a Suhuang Scroll manual-confirmation grading run? Scores will not be submitted automatically.",
      confirmControl: "Confirm “{action}”? This changes the local grading task state.",
      controlSent: "“{action}” was sent.",
      noSpec: "No default Spec is available. Select a Spec in the main settings menu first.",
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
        defaultSpec: String(value.defaultSpec ?? "").trim(),
        adapter: String(value.adapter ?? "").trim(),
        provider: String(value.provider ?? "").trim(),
        model: String(value.model ?? "").trim(),
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
        dev: true,
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
        for (const field of ["apiBaseUrl", "defaultSpec", "adapter", "provider", "model", "confidenceThreshold"]) {
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

    function ActionButton({ children, disabled, onClick, tone = "neutral" }) {
      const background = tone === "danger"
        ? "var(--dsw-alias-state-error-primary)"
        : "var(--dsw-alias-state-business-primary)";
      return React.createElement("button", {
        type: "button",
        disabled,
        onClick,
        style: {
          border: "0",
          borderRadius: 7,
          color: "white",
          background: disabled ? "var(--dsw-alias-bg-layer-3)" : background,
          cursor: disabled ? "not-allowed" : "pointer",
          padding: "7px 11px",
          font: "inherit",
          opacity: disabled ? 0.55 : 1,
        },
      }, children);
    }

    function FieldLabel({ htmlFor, children, hint }) {
      return React.createElement("div", { style: { marginBottom: 6 } },
        React.createElement("label", { htmlFor, style: { display: "block", fontSize: 13 } }, children),
        hint ? React.createElement("div", { style: { ...mutedStyle, marginTop: 4 } }, hint) : null,
      );
    }

    function TextField({ id, label, hint, value, onChange, disabled, type = "text", min, max, step }) {
      return React.createElement("div", null,
        React.createElement(FieldLabel, { htmlFor: id, hint }, label),
        React.createElement("input", {
          id,
          value,
          type,
          min,
          max,
          step,
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
      const [saving, setSaving] = React.useState(false);
      const [error, setError] = React.useState("");
      const [message, setMessage] = React.useState("");
      const [connection, setConnection] = React.useState({ state: "idle", health: null, automation: null, error: "" });
      const [catalog, setCatalog] = React.useState({ state: "idle", data: null, error: "" });
      const settings = useSettingsBinding(settingsScope);
      const { snapshot } = settings;

      React.useEffect(() => {
        if (!dirty && snapshot.value) setDraft(normalizeSettings(snapshot.value));
      }, [dirty, snapshot.value]);

      const refreshResources = React.useCallback(async (baseUrl = DEFAULT_API_BASE_URL) => {
        setCatalog({ state: "loading", data: null, error: "" });
        try {
          const normalized = resolveApiBaseUrl(baseUrl);
          const [resources, specs] = await Promise.all([
            requestJson(normalized, "/resources"),
            requestJson(normalized, "/specs"),
          ]);
          setCatalog({ state: "ready", data: { resources, specs }, error: "" });
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
        setError("");
        setMessage("");
      };

      const saveSettings = async () => {
        setSaving(true);
        setError("");
        setMessage("");
        try {
          const apiBaseUrl = resolveApiBaseUrl(draft.apiBaseUrl);
          const next = normalizeSettings({ ...draft, apiBaseUrl });
          await settings.update(next);
          setDraft(next);
          setDirty(false);
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
      const providerKey = draft.provider || defaultProvider;
      const models = resourceData.modelsByProvider?.[providerKey] ?? [];
      const defaultModel = models.find((option) => option.hint === "默认")?.value || "";
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
          React.createElement(SelectField, {
            id: "suhuang-default-provider",
            label: t("defaultProvider"),
            value: draft.provider,
            disabled: settingsDisabled || catalog.state === "loading",
            onChange: (event) => updateDraft("provider", event.target.value),
            options: [{ value: "", label: followRuntime(defaultProvider) }, ...resourceData.providers.map((option) => ({ value: option.value, label: option.label || option.value }))],
          }),
          React.createElement(SelectField, {
            id: "suhuang-default-model",
            label: t("defaultModel"),
            value: draft.model,
            disabled: settingsDisabled || catalog.state === "loading",
            onChange: (event) => updateDraft("model", event.target.value),
            options: [{ value: "", label: followRuntime(defaultModel) }, ...models.map((option) => ({ value: option.value, label: option.label || option.value }))],
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
          setError(formatError(cause));
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

      const control = async (action, label) => {
        if (!globalThis.confirm(t("confirmControl", { action: label }))) return;
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
          setError(t("runtimeUnavailable", { error: formatError(cause) }));
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
        if (!globalThis.confirm(t("startConfirm"))) return;
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
          setMessage(t("controlSent", { action: t("start") }));
          setAutomation((current) => ({ ...(current ?? {}), run: result, active: true }));
          await refreshStatus();
        } catch (cause) {
          setError(t("runtimeUnavailable", { error: formatError(cause) }));
        } finally {
          setBusy(false);
        }
      };

      const run = automation?.run;
      const connected = Boolean(health && automation);
      const active = Boolean(automation?.active);
      const canControl = Boolean(automation?.active && run);
      const hasSpec = Boolean(effectiveDefaultSpec(settings, catalog.specs));
      const runRows = run
        ? [
          [t("status"), runStateLabel(run.state, t)],
          [t("adapter"), run.adapter || t("followRuntimeUnknown")],
          [t("spec"), safeBasename(run.spec_path)],
          [t("completed"), String(run.completed_count ?? 0)],
        ]
        : [[t("status"), t("noTask")]];
      if (run?.pending_decision) runRows.push([t("pending"), t("pending")]);
      if (run?.error_message) runRows.push([t("runError"), run.error_message]);
      const resourceData = catalog.resources;
      const defaultSpec = effectiveDefaultSpec(settings, catalog.specs);

      return React.createElement("div", {
        "data-testid": "suhuang-scroll-runtime-tab",
        style: { width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, padding: 14, color: "var(--dsw-alias-label-primary)" },
      },
        React.createElement("div", null,
          React.createElement("h2", { style: { margin: 0, fontSize: 17 } }, t("title")),
          React.createElement("p", { style: { ...mutedStyle, margin: "6px 0 0" } }, t("manualOnly")),
        ),
        React.createElement("section", { style: cardStyle },
          React.createElement("h3", { style: { margin: "0 0 10px", fontSize: 14 } }, t("runtimeStatus")),
          connected
            ? React.createElement(DetailGrid, { rows: [
              [t("status"), t("connected")],
              [t("runtimeVersion"), health.version ?? "—"],
              [t("protocolVersion"), health.protocol_version ?? "—"],
            ] })
            : React.createElement("p", { style: { ...mutedStyle, margin: 0, color: "var(--dsw-alias-state-error-primary)" } }, error ? t("runtimeUnavailable", { error }) : t("notConnected")),
        ),
        React.createElement("section", { style: cardStyle },
          React.createElement("h3", { style: { margin: "0 0 10px", fontSize: 14 } }, t("runtimeControls")),
          React.createElement(DetailGrid, { rows: runRows }),
          run?.pending_decision
            ? React.createElement("p", { style: { ...mutedStyle, margin: "10px 0 0", color: "var(--dsw-alias-state-warning-primary, #b26a00)" } }, t("pending"))
            : null,
        ),
        React.createElement("section", { style: cardStyle },
          React.createElement("h3", { style: { margin: "0 0 10px", fontSize: 14 } }, t("defaultSpec")),
          React.createElement(DetailGrid, { rows: [
            [t("spec"), defaultSpec ? safeBasename(defaultSpec) : t("noSpec")],
            [t("adapter"), settings.adapter || resourceData?.defaultAdapter || t("followRuntimeUnknown")],
            [t("defaultProvider"), settings.provider || resourceData?.defaultProvider || t("followRuntimeUnknown")],
            [t("defaultModel"), settings.model || t("followRuntimeUnknown")],
          ] }),
        ),
        React.createElement("section", { style: cardStyle },
          React.createElement("h3", { style: { margin: "0 0 10px", fontSize: 14 } }, t("currentTask")),
          React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            React.createElement(ActionButton, { onClick: () => void start(), disabled: busy || !connected || active || !hasSpec }, t("start")),
            React.createElement(ActionButton, { onClick: () => void control("pause", t("pause")), disabled: busy || !connected || !canControl }, t("pause")),
            React.createElement(ActionButton, { onClick: () => void control("resume", t("resume")), disabled: busy || !connected || !canControl }, t("resume")),
            React.createElement(ActionButton, { onClick: () => void control("stop", t("stop")), disabled: busy || !connected || !canControl }, t("stop")),
          ),
          !hasSpec ? React.createElement("p", { style: { ...mutedStyle, margin: "10px 0 0", color: "var(--dsw-alias-state-error-primary)" } }, t("noSpec")) : null,
        ),
        React.createElement(MessageBlock, { error, message }),
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
