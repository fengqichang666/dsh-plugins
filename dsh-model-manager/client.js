window.__ModuleLoader__.load({
  id: 'dsh-model-manager',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

    // client.source.js
    var client_source_exports = {};
    __export(client_source_exports, {
      apply: () => apply,
      inject: () => inject
    });
    module.exports = __toCommonJS(client_source_exports);
    var React = __toESM(require("react"), 1);
    var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

    // model-data.js
    var MODEL_SETTINGS_NAMESPACE = "llm-pi-ai";
    var DEFAULT_CONTEXT_WINDOW = 1e6;
    function isRecord(value) {
      return typeof value === "object" && value !== null && !Array.isArray(value);
    }
    function getAtPath(value, path) {
      return path.reduce((current, key) => {
        if (!isRecord(current)) return void 0;
        return current[key];
      }, value);
    }
    function configuredModelProviders(directory, settingsView, registered = []) {
      if (!Array.isArray(directory)) throw new TypeError("Provider directory must be an array");
      if (!Array.isArray(settingsView?.namespaces)) throw new TypeError("Settings namespaces are missing");
      if (typeof settingsView.writable !== "boolean") throw new TypeError("Settings writability is missing");
      const entries = directory.filter((entry) => entry?.settingsNs === MODEL_SETTINGS_NAMESPACE);
      const namespace = settingsView.namespaces.find((item) => item.ns === MODEL_SETTINGS_NAMESPACE);
      if (!namespace) throw new Error(`Settings namespace ${MODEL_SETTINGS_NAMESPACE} is unavailable`);
      if (!isRecord(namespace.value)) throw new TypeError(`Settings namespace ${MODEL_SETTINGS_NAMESPACE} has no value`);
      if (namespace.revision === void 0) throw new TypeError(`Settings namespace ${MODEL_SETTINGS_NAMESPACE} has no revision`);
      const providers = [];
      for (const entry of entries) {
        if (typeof entry.provider !== "string" || typeof entry.displayName !== "string" || !Array.isArray(entry.settingsPath) || entry.settingsPath.length === 0) {
          throw new TypeError("Configurable provider metadata is incomplete");
        }
        const config = getAtPath(namespace.value, entry.settingsPath);
        if (config === void 0) continue;
        if (!isRecord(config)) throw new TypeError(`Provider ${entry.provider} settings are invalid`);
        if (config.models !== void 0 && !Array.isArray(config.models)) throw new TypeError(`Provider ${entry.provider} models are invalid`);
        providers.push({
          provider: entry.provider,
          displayName: entry.displayName,
          settingsPath: [...entry.settingsPath],
          revision: namespace.revision,
          models: config.models ?? []
        });
      }
      return {
        writable: settingsView.writable,
        providers,
        revision: namespace.revision,
        taken: [.../* @__PURE__ */ new Set([
          ...directory.map((entry) => entry.provider),
          ...registered.map((provider) => provider.id),
          ...Object.keys(namespace.value.providers ?? {})
        ])]
      };
    }
    function historyModels(providers) {
      const models = /* @__PURE__ */ new Map();
      for (const provider of providers) {
        for (const model of provider.models) {
          if (typeof model?.id !== "string" || model.id.length === 0 || models.has(model.id)) continue;
          models.set(model.id, { id: model.id, name: typeof model.name === "string" ? model.name : "" });
        }
      }
      return [...models.values()];
    }
    function fillModelFromHistory(draft, choice) {
      return { ...draft, id: choice.id, name: choice.name };
    }
    function validateModelDraft(draft, models) {
      const id = draft.id.trim();
      const name = draft.name.trim();
      const contextWindow = Number(draft.contextWindow);
      if (!id) return { error: "idRequired" };
      if (!name) return { error: "nameRequired" };
      if (!Number.isSafeInteger(contextWindow) || contextWindow <= 0) return { error: "contextWindowInvalid" };
      if (models.some((model) => model?.id === id)) return { error: "duplicateModel" };
      return { value: { id, name, contextWindow } };
    }
    function modelSettingsPath(provider) {
      return [...provider.settingsPath, "models"];
    }
    function buildModelEntry({ id, name, contextWindow, imageSupport }) {
      return { id, name, contextWindow, input: imageSupport ? ["text", "image"] : ["text"] };
    }

    // provider-data.js
    var PROTOCOLS = ["openai-completions", "openai-responses", "anthropic-messages"];
    function validateApiKey(draft) {
      if (draft === "") return void 0;
      const value = draft.trim();
      if (!/^[\x21-\x7E]+$/.test(value) || /^[A-Z][A-Z0-9_]*=[^=]/.test(value) || /^(["']).*\1$/.test(value)) return "keyInvalid";
    }
    function validateProviderDraft(draft, taken) {
      const route = draft.route.trim();
      const baseURL = draft.baseURL.trim();
      if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(route)) return { error: "routeInvalid" };
      if (taken.includes(route)) return { error: "routeTaken" };
      if (!PROTOCOLS.includes(draft.api)) return { error: "protocolInvalid" };
      try {
        const url = new URL(baseURL);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
          return { error: "baseURLInvalid" };
        }
      } catch {
        return { error: "baseURLInvalid" };
      }
      const keyError = validateApiKey(draft.apiKey);
      if (keyError) return { error: keyError };
      const keyRef = `${route.toUpperCase().replace(/-/g, "_")}_API_KEY`;
      const displayName = draft.displayName.trim();
      return {
        value: {
          route,
          keyRef,
          profile: {
            ...displayName ? { displayName } : {},
            ...draft.apiKey ? { apiKeyEnv: keyRef } : {},
            api: draft.api,
            baseURL
          }
        }
      };
    }
    async function saveNewProvider(remote, creation, key, committed, onCommitted) {
      if (!committed) {
        const response = await remote.settings.mutate(
          MODEL_SETTINGS_NAMESPACE,
          [{ op: "set", path: ["providers", creation.route], value: creation.profile }],
          creation.revision
        );
        if (!response.ok) return { stage: "settings", error: response.error };
        onCommitted();
      }
      if (creation.profile.apiKeyEnv) {
        try {
          const response = await remote.credentials.set(creation.keyRef, key.trim());
          if (!response.ok) return { stage: "credentials" };
        } catch {
          return { stage: "credentials" };
        }
      }
      return { ok: true };
    }

    // client.source.js
    var NS = "dsh-model-manager";
    var inject = ["slots", "locale", "remote", "remote.llm", "remote.settings", "remote.credentials"];
    var messages = {
      zh: {
        nav: "\u6A21\u578B\u7BA1\u7406",
        title: "\u63D0\u4F9B\u5546\u4E0E\u6A21\u578B\u7BA1\u7406",
        mode: "\u6DFB\u52A0\u65B9\u5F0F",
        newProvider: "\u65B0\u5EFA\u63D0\u4F9B\u5546\u53CA\u6A21\u578B",
        existingProvider: "\u5411\u5DF2\u6709\u63D0\u4F9B\u5546\u6DFB\u52A0\u6A21\u578B",
        route: "\u63D0\u4F9B\u5546 ID\uFF08\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u8FDE\u5B57\u7B26\uFF09",
        displayName: "\u63D0\u4F9B\u5546\u540D\u79F0\uFF08\u9009\u586B\uFF09",
        baseURL: "\u670D\u52A1\u7AEF\u5730\u5740\uFF08Base URL\uFF09",
        api: "\u63A5\u53E3\u683C\u5F0F",
        apiKey: "API Key\uFF08\u65E0\u9274\u6743\u670D\u52A1\u53EF\u7559\u7A7A\uFF09",
        keyHelp: "\u53EA\u586B\u5199\u5BC6\u94A5\u672C\u8EAB\u3002\u5BC6\u94A5\u901A\u8FC7 DSH \u51ED\u636E\u63A5\u53E3\u4FDD\u5B58\uFF1B\u66F4\u6539\u5DF2\u6709\u63D0\u4F9B\u5546\u8FDE\u63A5\u53C2\u6570\u8BF7\u4F7F\u7528\u539F\u751F Models\u3002",
        baseURLHelp: "\u586B\u5199\u670D\u52A1\u5546\u63D0\u4F9B\u7684 API \u57FA\u7840\u5730\u5740\u3002OpenAI \u517C\u5BB9\u5730\u5740\u901A\u5E38\u5305\u542B /v1\uFF1BAnthropic \u901A\u5E38\u4E0D\u542B /v1/messages\u3002",
        create: "\u521B\u5EFA\u63D0\u4F9B\u5546\u5E76\u6DFB\u52A0\u6A21\u578B",
        createConfirm: "\u786E\u8BA4\u521B\u5EFA\u63D0\u4F9B\u5546\u53CA\u6A21\u578B",
        createDescription: "\u5C06\u521B\u5EFA\u4E0B\u5217\u63D0\u4F9B\u5546\u5E76\u540C\u6B65\u9996\u4E2A\u6A21\u578B\u5230\u539F\u751F Models\uFF1B\u975E\u7A7A API Key \u5C06\u5355\u72EC\u4FDD\u5B58\u5230 DSH \u51ED\u636E\u3002",
        created: "\u63D0\u4F9B\u5546\u53CA\u6A21\u578B\u5DF2\u540C\u6B65\u5230\u539F\u751F Models\u3002",
        keyPending: "\u63D0\u4F9B\u5546\u548C\u6A21\u578B\u5DF2\u4FDD\u5B58\uFF0C\u4F46 API Key \u4FDD\u5B58\u5931\u8D25\u3002\u8BF7\u68C0\u67E5\u6216\u91CD\u65B0\u586B\u5199\u5BC6\u94A5\u540E\u91CD\u8BD5\uFF1B\u4E0D\u4F1A\u91CD\u590D\u521B\u5EFA\u63D0\u4F9B\u5546\u3002",
        retryKey: "\u91CD\u8BD5\u4FDD\u5B58 API Key",
        routeInvalid: "\u63D0\u4F9B\u5546 ID \u5FC5\u987B\u4EE5\u5C0F\u5199\u5B57\u6BCD\u5F00\u5934\uFF0C\u4EC5\u5305\u542B\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u548C\u5355\u4E2A\u8FDE\u5B57\u7B26\uFF0C\u4F8B\u5982 my-provider\u3002",
        routeTaken: "\u8BE5\u63D0\u4F9B\u5546 ID \u5DF2\u88AB\u5360\u7528\uFF0C\u8BF7\u4F7F\u7528\u65B0\u7684 ID\u3002",
        protocolInvalid: "\u8BF7\u9009\u62E9\u652F\u6301\u7684\u63A5\u53E3\u683C\u5F0F\u3002",
        baseURLInvalid: "\u8BF7\u8F93\u5165\u6709\u6548\u7684 HTTP/HTTPS \u57FA\u7840\u5730\u5740\uFF0C\u4E0D\u542B\u8D26\u53F7\u5BC6\u7801\u3001\u67E5\u8BE2\u53C2\u6570\u6216\u7247\u6BB5\u3002",
        keyInvalid: "API Key \u5E94\u4E3A\u53EF\u89C1 ASCII \u5B57\u7B26\uFF0C\u4E0D\u80FD\u5305\u542B\u7A7A\u683C\u3001\u5F15\u53F7\u5305\u88C5\u6216 KEY= \u8D4B\u503C\u8BED\u53E5\u3002",
        intro: "\u6DFB\u52A0\u540E\u4F1A\u5199\u5165 DSH \u539F\u751F Models \u914D\u7F6E\uFF0C\u5E76\u540C\u6B65\u5230\u6A21\u578B\u9009\u62E9\u5668\u3002",
        loading: "\u6B63\u5728\u8BFB\u53D6\u6A21\u578B\u914D\u7F6E\u2026",
        retry: "\u91CD\u8BD5",
        provider: "\u63D0\u4F9B\u5546",
        chooseProvider: "\u9009\u62E9\u63D0\u4F9B\u5546",
        history: "\u5386\u53F2\u6A21\u578B",
        chooseHistory: "\u9009\u62E9\u6A21\u578B ID\uFF0C\u4EC5\u56DE\u586B ID \u548C\u540D\u79F0",
        modelId: "\u6A21\u578B ID",
        modelName: "\u6A21\u578B\u540D\u79F0",
        contextWindow: "\u4E0A\u4E0B\u6587\u7A97\u53E3\uFF08tokens\uFF09",
        imageSupport: "\u652F\u6301\u56FE\u7247\u8F93\u5165",
        add: "\u6DFB\u52A0\u6A21\u578B",
        confirmTitle: "\u786E\u8BA4\u6DFB\u52A0\u6A21\u578B",
        confirmDescription: "\u786E\u8BA4\u540E\u4F1A\u5C06\u6A21\u578B\u5199\u5165\u6240\u9009\u63D0\u4F9B\u5546\u7684\u539F\u751F Models \u914D\u7F6E\u3002",
        close: "\u5173\u95ED",
        cancel: "\u53D6\u6D88",
        confirm: "\u786E\u8BA4\u5E76\u540C\u6B65",
        saving: "\u6B63\u5728\u4FDD\u5B58\u2026",
        saved: "\u6A21\u578B\u5DF2\u540C\u6B65\u5230\u539F\u751F Models\u3002",
        readOnly: "\u5F53\u524D\u8BBE\u7F6E\u4E3A\u53EA\u8BFB\uFF0C\u65E0\u6CD5\u4FDD\u5B58\u6A21\u578B\u3002",
        noProviders: "\u6682\u65E0\u5DF2\u914D\u7F6E\u7684\u63D0\u4F9B\u5546\uFF0C\u8BF7\u5207\u6362\u5230\u201C\u65B0\u5EFA\u63D0\u4F9B\u5546\u53CA\u6A21\u578B\u201D\u3002",
        loadFailed: "\u8BFB\u53D6\u6A21\u578B\u914D\u7F6E\u5931\u8D25\uFF1A",
        saveFailed: "\u4FDD\u5B58\u5931\u8D25\uFF1A",
        conflict: "\u914D\u7F6E\u5DF2\u88AB\u5176\u4ED6\u9875\u9762\u4FEE\u6539\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5\u3002",
        idRequired: "\u8BF7\u8F93\u5165\u6A21\u578B ID\u3002",
        nameRequired: "\u8BF7\u8F93\u5165\u6A21\u578B\u540D\u79F0\u3002",
        contextWindowInvalid: "\u4E0A\u4E0B\u6587\u7A97\u53E3\u5FC5\u987B\u662F\u5927\u4E8E 0 \u7684\u6574\u6570\u3002",
        duplicateModel: "\u8BE5\u63D0\u4F9B\u5546\u4E2D\u5DF2\u5B58\u5728\u6B64\u6A21\u578B ID\u3002"
      },
      en: {
        nav: "Model Manager",
        title: "Providers and models",
        mode: "Add to",
        newProvider: "New provider and model",
        existingProvider: "Existing provider",
        route: "Provider ID (lowercase letters, digits and hyphens)",
        displayName: "Provider name (optional)",
        baseURL: "Server address (Base URL)",
        api: "API format",
        apiKey: "API Key (optional for services without authentication)",
        keyHelp: "Enter only the key. Keys use DSH credential storage. Edit existing connection settings in native Models.",
        baseURLHelp: "Use the API base URL from your service. OpenAI URLs usually include /v1; Anthropic URLs usually omit /v1/messages.",
        create: "Create provider and model",
        createConfirm: "Confirm provider and model creation",
        createDescription: "Create this provider and its first model in native Models. A nonempty API Key is stored separately in DSH credentials.",
        created: "Provider and model synced to native Models.",
        keyPending: "Provider and model saved, but the API Key could not be stored. Check or replace the key and retry; the provider will not be created again.",
        retryKey: "Retry saving API Key",
        routeInvalid: "Use a lowercase letter followed by lowercase letters, digits or single hyphens, for example my-provider.",
        routeTaken: "This provider ID is already taken. Choose another ID.",
        protocolInvalid: "Choose a supported API format.",
        baseURLInvalid: "Enter an HTTP/HTTPS base URL without credentials, query parameters or a fragment.",
        keyInvalid: "Use visible ASCII characters without spaces, surrounding quotes or KEY= assignment syntax.",
        intro: "Models are written to DSH native Models settings and appear in the model picker.",
        loading: "Loading model settings\u2026",
        retry: "Retry",
        provider: "Provider",
        chooseProvider: "Choose a provider",
        history: "Saved models",
        chooseHistory: "Choose a model ID to fill only its ID and name",
        modelId: "Model ID",
        modelName: "Model name",
        contextWindow: "Context window (tokens)",
        imageSupport: "Accept image input",
        add: "Add model",
        confirmTitle: "Confirm model addition",
        confirmDescription: "This writes the model to the selected provider in native Models settings.",
        close: "Close",
        cancel: "Cancel",
        confirm: "Confirm and sync",
        saving: "Saving\u2026",
        saved: "Model synced to native Models.",
        readOnly: "Settings are read-only; models cannot be saved.",
        noProviders: "No providers are configured yet. Switch to New provider and model.",
        loadFailed: "Could not read model settings: ",
        saveFailed: "Could not save model: ",
        conflict: "Settings changed elsewhere. Refresh and try again.",
        idRequired: "Enter a model ID.",
        nameRequired: "Enter a model name.",
        contextWindowInvalid: "Context window must be a positive integer.",
        duplicateModel: "This provider already has a model with this ID."
      }
    };
    var emptyDraft = () => ({ id: "", name: "", contextWindow: DEFAULT_CONTEXT_WINDOW, imageSupport: true });
    var controlStyle = {
      boxSizing: "border-box",
      width: "100%",
      minWidth: 0,
      height: 34,
      border: "1px solid var(--dsw-alias-border-l3)",
      borderRadius: "var(--dsw-radius-md)",
      background: "var(--dsw-alias-bg-layer-1)",
      color: "var(--dsw-alias-label-primary)",
      font: "inherit",
      padding: "0 10px"
    };
    function Field(label, control, key) {
      return React.createElement("label", {
        key,
        style: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }
      }, React.createElement("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, label), control);
    }
    function ModelFields({ t, history, draft, setDraft, disabled }) {
      return React.createElement(
        React.Fragment,
        null,
        Field(t("history"), React.createElement(
          "select",
          {
            value: "",
            disabled: disabled || history.length === 0,
            style: controlStyle,
            onChange: (event) => {
              const choice = history.find((item) => item.id === event.target.value);
              if (!choice) return;
              setDraft((current) => fillModelFromHistory(current, choice));
            }
          },
          React.createElement("option", { value: "" }, t("chooseHistory")),
          ...history.map((item) => React.createElement("option", { key: item.id, value: item.id }, item.id))
        )),
        React.createElement(
          "div",
          { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 } },
          ...["id", "name"].map((key) => Field(t(key === "id" ? "modelId" : "modelName"), React.createElement("input", {
            type: "text",
            value: draft[key],
            autoComplete: "off",
            disabled,
            style: controlStyle,
            onChange: (event) => setDraft((current) => ({ ...current, [key]: event.target.value }))
          }), key))
        ),
        Field(t("contextWindow"), React.createElement("input", {
          type: "number",
          min: 1,
          step: 1,
          value: draft.contextWindow,
          disabled,
          style: controlStyle,
          onChange: (event) => setDraft((current) => ({ ...current, contextWindow: event.target.value }))
        })),
        React.createElement(
          "label",
          { style: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 } },
          React.createElement("input", {
            type: "checkbox",
            checked: draft.imageSupport,
            disabled,
            onChange: (event) => setDraft((current) => ({ ...current, imageSupport: event.target.checked }))
          }),
          t("imageSupport")
        )
      );
    }
    function Notice({ notice }) {
      return notice && React.createElement("p", {
        role: notice.type === "error" ? "alert" : "status",
        style: { margin: 0, color: notice.type === "error" ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-state-success-primary)" }
      }, notice.message);
    }
    function NewProviderForm({ ctx, t, snapshot, reload, onLockChange }) {
      const [provider, setProvider] = React.useState({ route: "", displayName: "", baseURL: "", api: PROTOCOLS[0], apiKey: "" });
      const [draft, setDraft] = React.useState(emptyDraft);
      const [confirmation, setConfirmation] = React.useState(null);
      const [modalOpen, setModalOpen] = React.useState(false);
      const [committed, setCommitted] = React.useState(false);
      const [saving, setSaving] = React.useState(false);
      const [notice, setNotice] = React.useState(null);
      const savingRef = React.useRef(false);
      const committedRef = React.useRef(false);
      const unavailable = snapshot.loading || Boolean(snapshot.error) || !snapshot.writable;
      const disabled = unavailable || saving || committed;
      const requestSave = () => {
        if (savingRef.current) return;
        if (committedRef.current) {
          setModalOpen(true);
          return;
        }
        if (unavailable) return;
        const validated = validateProviderDraft(provider, snapshot.taken);
        const model = validateModelDraft(draft, []);
        const error = validated.error || model.error;
        if (error) return setNotice({ type: "error", message: t(error) });
        try {
          setConfirmation({
            ...validated.value,
            profile: { ...validated.value.profile, models: [buildModelEntry({ ...model.value, imageSupport: draft.imageSupport })] },
            revision: snapshot.revision
          });
          setNotice(null);
          setModalOpen(true);
          onLockChange(true);
        } catch (error2) {
          setNotice({ type: "error", message: error2 instanceof Error ? error2.message : String(error2) });
        }
      };
      const confirmSave = async () => {
        if (savingRef.current || !confirmation) return;
        const keyError = validateApiKey(provider.apiKey);
        if (keyError || confirmation.profile.apiKeyEnv && !provider.apiKey.trim()) {
          setNotice({ type: "error", message: t(keyError || "keyInvalid") });
          return;
        }
        savingRef.current = true;
        setSaving(true);
        setNotice(null);
        try {
          const outcome = await saveNewProvider(ctx.remote, confirmation, provider.apiKey, committedRef.current, () => {
            committedRef.current = true;
            setCommitted(true);
          });
          if (!outcome.ok) {
            if (outcome.stage === "credentials") {
              setNotice({ type: "error", message: t("keyPending") });
            } else if (outcome.error.code === "settings/conflict") {
              setModalOpen(false);
              setConfirmation(null);
              onLockChange(false);
              setNotice({ type: "error", message: t("conflict") });
              await reload();
            } else {
              setNotice({ type: "error", message: `${t("saveFailed")}${outcome.error.message}` });
            }
            return;
          }
          setConfirmation(null);
          setModalOpen(false);
          committedRef.current = false;
          setCommitted(false);
          onLockChange(false);
          setProvider({ route: "", displayName: "", baseURL: "", api: PROTOCOLS[0], apiKey: "" });
          setDraft(emptyDraft());
          setNotice({ type: "success", message: t("created") });
          await reload();
        } catch (error) {
          setNotice({ type: "error", message: `${t("saveFailed")}${error instanceof Error ? error.message : String(error)}` });
        } finally {
          savingRef.current = false;
          setSaving(false);
        }
      };
      const closeConfirmation = () => {
        if (savingRef.current) return;
        setModalOpen(false);
        if (!committedRef.current) {
          setConfirmation(null);
          onLockChange(false);
        }
      };
      const keyInput = () => React.createElement("input", {
        type: "password",
        value: provider.apiKey,
        autoComplete: "new-password",
        disabled: saving,
        style: controlStyle,
        onChange: (event) => setProvider((current) => ({ ...current, apiKey: event.target.value }))
      });
      return React.createElement(
        React.Fragment,
        null,
        ...["route", "displayName", "baseURL"].map((key) => Field(t(key), React.createElement("input", {
          type: "text",
          value: provider[key],
          autoComplete: "off",
          disabled,
          style: controlStyle,
          placeholder: key === "route" ? "my-provider" : key === "baseURL" ? provider.api === "anthropic-messages" ? "https://gateway.example" : "https://gateway.example/v1" : "",
          onChange: (event) => setProvider((current) => ({ ...current, [key]: event.target.value }))
        }), key)),
        Field(t("api"), React.createElement("select", {
          value: provider.api,
          disabled,
          style: controlStyle,
          onChange: (event) => setProvider((current) => ({ ...current, api: event.target.value }))
        }, ...PROTOCOLS.map((api) => React.createElement("option", { key: api, value: api }, {
          "openai-completions": "OpenAI Chat Completions",
          "openai-responses": "OpenAI Responses",
          "anthropic-messages": "Anthropic Messages"
        }[api])))),
        React.createElement("p", { style: { margin: 0, fontSize: 12 } }, t("baseURLHelp")),
        Field(t("apiKey"), keyInput()),
        React.createElement("p", { style: { margin: 0, fontSize: 12 } }, t("keyHelp")),
        React.createElement(ModelFields, { t, history: historyModels(snapshot.providers), draft, setDraft, disabled }),
        React.createElement(Notice, { notice }),
        React.createElement(import_dsh_client_ui_primitives.Button, { variant: "outline", disabled: committed ? saving : disabled, onClick: requestSave }, t(committed ? "retryKey" : "create")),
        React.createElement(
          import_dsh_client_ui_primitives.Modal,
          {
            open: modalOpen,
            onClose: closeConfirmation,
            title: t("createConfirm"),
            closeLabel: t("close"),
            description: confirmation ? `${t("createDescription")} ${confirmation.profile.displayName || confirmation.route} (${confirmation.route}) \xB7 ${confirmation.profile.api} \xB7 ${confirmation.profile.baseURL} \xB7 ${confirmation.profile.models[0].id}` : "",
            footer: React.createElement(
              React.Fragment,
              null,
              React.createElement(import_dsh_client_ui_primitives.Button, { variant: "outline", disabled: saving, onClick: closeConfirmation, "data-modal-autofocus": true }, t(committed ? "close" : "cancel")),
              React.createElement(import_dsh_client_ui_primitives.Button, { variant: "outline", disabled: saving, onClick: confirmSave }, t(saving ? "saving" : committed ? "retryKey" : "confirm"))
            )
          },
          committed && Field(t("apiKey"), keyInput()),
          React.createElement(Notice, { notice })
        )
      );
    }
    function ModelManagerSection({ ctx, t }) {
      const [snapshot, setSnapshot] = React.useState({ loading: true, error: null, writable: false, providers: [] });
      const [providerId, setProviderId] = React.useState("");
      const [mode, setMode] = React.useState("new");
      const [newProviderLocked, setNewProviderLocked] = React.useState(false);
      const [draft, setDraft] = React.useState(emptyDraft);
      const [notice, setNotice] = React.useState(null);
      const [confirmation, setConfirmation] = React.useState(null);
      const [saving, setSaving] = React.useState(false);
      const savingRef = React.useRef(false);
      const loadGeneration = React.useRef(0);
      const selectedProvider = snapshot.providers.find((provider) => provider.provider === providerId);
      const history = historyModels(snapshot.providers);
      const reload = React.useCallback(async () => {
        const generation = ++loadGeneration.current;
        setSnapshot((current) => ({ ...current, loading: true, error: null }));
        try {
          const [directory, settings, registered] = await Promise.all([
            ctx.remote.llm.listConfigurableProviders(),
            ctx.remote.settings.describe(),
            ctx.remote.llm.listProviders()
          ]);
          if (!directory.ok) throw new Error(directory.error.message);
          if (!settings.ok) throw new Error(settings.error.message);
          if (!registered.ok) throw new Error(registered.error.message);
          const result = configuredModelProviders(directory.value, settings.value, registered.value);
          if (generation !== loadGeneration.current) return;
          setSnapshot({ loading: false, error: null, ...result });
          setProviderId((current) => result.providers.some((provider) => provider.provider === current) ? current : result.providers[0]?.provider ?? "");
        } catch (error) {
          if (generation !== loadGeneration.current) return;
          setSnapshot((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
        }
      }, [ctx]);
      React.useEffect(() => {
        void reload();
        const refresh = () => {
          void reload();
        };
        const disposers = [
          ctx.remote.$on("settings/document-updated", refresh),
          ctx.remote.$on("llm/adapters-updated", refresh),
          ctx.on("connection/reset", refresh)
        ];
        return () => {
          loadGeneration.current += 1;
          for (const dispose of disposers) dispose();
        };
      }, [ctx, reload]);
      const requestSave = () => {
        if (savingRef.current || !selectedProvider || snapshot.loading || snapshot.error) return;
        if (!snapshot.writable) {
          setNotice({ type: "error", message: t("readOnly") });
          return;
        }
        const validation = validateModelDraft(draft, selectedProvider.models);
        if (validation.error) {
          setNotice({ type: "error", message: t(validation.error) });
          return;
        }
        try {
          const model = buildModelEntry({ ...validation.value, imageSupport: draft.imageSupport });
          setConfirmation({ provider: selectedProvider, model });
          setNotice(null);
        } catch (error) {
          setNotice({ type: "error", message: error instanceof Error ? error.message : String(error) });
        }
      };
      const confirmSave = async () => {
        if (savingRef.current || !confirmation) return;
        savingRef.current = true;
        setSaving(true);
        try {
          const { provider, model } = confirmation;
          const response = await ctx.remote.settings.mutate(
            MODEL_SETTINGS_NAMESPACE,
            [{ op: "set", path: modelSettingsPath(provider), value: [...provider.models, model] }],
            provider.revision
          );
          if (!response.ok) {
            if (response.error.code === "settings/conflict") {
              setConfirmation(null);
              setNotice({ type: "error", message: t("conflict") });
              await reload();
            } else {
              setNotice({ type: "error", message: `${t("saveFailed")}${response.error.message}` });
            }
            return;
          }
          setConfirmation(null);
          setDraft(emptyDraft());
          setNotice({ type: "success", message: t("saved") });
          await reload();
        } catch (error) {
          setNotice({ type: "error", message: `${t("saveFailed")}${error instanceof Error ? error.message : String(error)}` });
        } finally {
          savingRef.current = false;
          setSaving(false);
        }
      };
      const disabled = saving || snapshot.loading || Boolean(snapshot.error) || !snapshot.writable || !selectedProvider;
      const providerSelect = React.createElement(
        "select",
        {
          value: providerId,
          disabled: snapshot.loading || snapshot.providers.length === 0 || saving,
          onChange: (event) => {
            setProviderId(event.target.value);
            setDraft(emptyDraft());
            setNotice(null);
          },
          style: controlStyle
        },
        React.createElement("option", { value: "" }, t("chooseProvider")),
        ...snapshot.providers.map((provider) => React.createElement("option", {
          key: provider.provider,
          value: provider.provider
        }, `${provider.displayName} (${provider.provider})`))
      );
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "section",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 14,
              maxWidth: 720,
              color: "var(--dsw-alias-label-primary)"
            }
          },
          React.createElement("h2", { style: { margin: 0, fontSize: 16, fontWeight: 500 } }, t("title")),
          React.createElement("p", { style: { margin: 0, color: "var(--dsw-alias-label-tertiary)", fontSize: 13 } }, t("intro")),
          snapshot.loading && React.createElement("p", { role: "status", style: { margin: 0 } }, t("loading")),
          snapshot.error && React.createElement("p", { role: "alert", style: { margin: 0, color: "var(--dsw-alias-state-error-primary)" } }, `${t("loadFailed")}${snapshot.error}`),
          snapshot.error && React.createElement(import_dsh_client_ui_primitives.Button, { variant: "outline", disabled: snapshot.loading, onClick: () => {
            void reload();
          } }, t("retry")),
          Field(t("mode"), React.createElement(
            "select",
            {
              value: mode,
              disabled: saving || newProviderLocked || confirmation !== null,
              style: controlStyle,
              onChange: (event) => {
                setMode(event.target.value);
                setNotice(null);
              }
            },
            React.createElement("option", { value: "new" }, t("newProvider")),
            React.createElement("option", { value: "existing" }, t("existingProvider"))
          )),
          !snapshot.writable && !snapshot.loading && !snapshot.error && React.createElement("p", { role: "status", style: { margin: 0 } }, t("readOnly")),
          mode === "new" ? React.createElement(NewProviderForm, { ctx, t, snapshot, reload, onLockChange: setNewProviderLocked }) : React.createElement(
            React.Fragment,
            null,
            !snapshot.loading && !snapshot.error && snapshot.providers.length === 0 && React.createElement("p", { role: "status", style: { margin: 0 } }, t("noProviders")),
            Field(t("provider"), providerSelect),
            React.createElement(ModelFields, { t, history, draft, setDraft, disabled }),
            React.createElement(Notice, { notice }),
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "flex-end" } },
              React.createElement(import_dsh_client_ui_primitives.Button, { variant: "outline", disabled, onClick: requestSave }, t("add"))
            )
          )
        ),
        React.createElement(import_dsh_client_ui_primitives.Modal, {
          open: confirmation !== null,
          onClose: () => {
            if (!savingRef.current) setConfirmation(null);
          },
          title: t("confirmTitle"),
          closeLabel: t("close"),
          description: confirmation ? `${t("confirmDescription")} ${confirmation.provider.displayName}: ${confirmation.model.id} (${confirmation.model.name})` : "",
          footer: React.createElement(
            React.Fragment,
            null,
            React.createElement(import_dsh_client_ui_primitives.Button, {
              variant: "outline",
              "data-modal-autofocus": true,
              disabled: saving,
              onClick: () => setConfirmation(null)
            }, t("cancel")),
            React.createElement(import_dsh_client_ui_primitives.Button, {
              variant: "outline",
              disabled: saving,
              onClick: confirmSave
            }, saving ? t("saving") : t("confirm"))
          )
        }, React.createElement(Notice, { notice }))
      );
    }
    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, messages), "dsh-model-manager: locale");
      const injected = () => ({ ctx, t });
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "model-manager",
        order: 20,
        label: () => t("nav"),
        locale: NS,
        inject: injected
      }, ModelManagerSection));
    }

    return module.exports
  },
})
