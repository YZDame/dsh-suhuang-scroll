// Test harness: execute the committed client bundle in a VM with a fake DSH host.
//
// The bundle is a browser artifact, so the tests materialize the real factory
// with a fake `require` map (real React + stub primitives), then inspect the
// slot registrations and server-render the registered components. No browser,
// no live DSH host and no network are involved.

import { readFileSync } from "node:fs";
import vm from "node:vm";

import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as ReactDOM from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";

const CLIENT_URL = new URL("../client.js", import.meta.url);
export const NS = "settings.suhuangScroll";

function icon(name) {
  return function Icon(props) {
    return React.createElement("span", { "data-icon": name, "data-size": props?.size });
  };
}

function passthrough(tag) {
  return function Primitive(props) {
    const { children, ...rest } = props;
    const safe = {};
    for (const key of ["title", "aria-label", "disabled", "data-testid"]) {
      if (rest[key] !== undefined) safe[key] = rest[key];
    }
    return React.createElement(tag, safe, children ?? null);
  };
}

const primitives = {
  Button: React.forwardRef(function Button(props, ref) {
    return React.createElement(
      "button",
      {
        ref,
        type: "button",
        disabled: props.disabled,
        title: props.title,
        "aria-label": props["aria-label"],
        onClick: props.onClick,
      },
      props.icon ?? null,
      props.children ?? null,
    );
  }),
  StateDot: function StateDot(props) {
    return React.createElement("span", { "data-state": props.state, "data-size": props.size });
  },
  Tag: passthrough("span"),
  Modal: function Modal(props) {
    if (!props.open) return null;
    return React.createElement(
      "div",
      { "data-modal": props.title ?? "modal" },
      props.title ? React.createElement("h2", null, props.title) : null,
      props.children ?? null,
      props.footer ?? null,
    );
  },
  Tooltip: passthrough("span"),
  DisclosureRow: passthrough("div"),
  writeClipboard: async () => {},
  IconRefreshOutlineRegular: icon("refresh"),
  IconSlidersTwoOutlineRegular: icon("sliders"),
  IconListPenOutlineRegular: icon("list-pen"),
};

const primitivesModule = new Proxy(primitives, {
  get(target, key) {
    if (key in target) return target[key];
    if (typeof key === "string" && key.startsWith("Icon")) return icon(key);
    return undefined;
  },
});

const requireShim = (specifier) => {
  switch (specifier) {
    case "react":
      return React;
    case "react/jsx-runtime":
      return jsxRuntime;
    case "react-dom":
      return ReactDOM;
    case "react-dom/client":
      return { createRoot: () => ({ render() {}, unmount() {} }) };
    case "@deepseek-ai/dsh-client-ui-primitives":
      return primitivesModule;
    default:
      return {};
  }
};

/** Build a translate function over the dictionary the plugin registered. */
export function translator(dictionaries, language = "zh") {
  return (key, params) => {
    const dictionary = dictionaries?.[NS]?.[language] ?? {};
    let text = dictionary[key] ?? key;
    if (params && typeof params === "object") {
      for (const [name, value] of Object.entries(params)) {
        text = text.split(`{${name}}`).join(String(value));
      }
    }
    return text;
  };
}

/**
 * Execute the bundle and apply it against a fake host.
 * Returns every registration plus helpers to render a registered surface.
 */
export function loadPlugin(options = {}) {
  const registrations = [];
  const calls = [];
  const dictionaries = {};
  let selectedPanel = options.selectedPanel ?? "suhuang-scroll";

  const slots = {
    inject: (_name, callback) => callback(),
    register: (registrationOptions, component) => {
      registrations.push({ options: registrationOptions, component });
      return () => {};
    },
  };

  const locale = {
    register: (namespace, value) => {
      dictionaries[namespace] = value;
      return () => {};
    },
    bind: (namespace) => translator(dictionaries, options.language ?? "zh"),
    subscribe: () => () => {},
    getSnapshot: () => ({ revision: 0 }),
  };

  const services = {
    sidebarRightTabs: {
      register: (definition) => {
        calls.push(["register", definition]);
        return () => {};
      },
    },
    sidebarRight: {
      openTab: (kind) => {
        if (options.failOpen) throw new Error("synthetic host failure");
        if (options.mounted === false || selectedPanel !== null) {
          throw new Error("no session surface is mounted");
        }
        calls.push(["open", kind]);
      },
    },
    layout: {
      panelInfo: { getSnapshot: () => ({ activePanelId: selectedPanel }) },
      selectPanel: (id) => {
        selectedPanel = id;
        calls.push(["select", id]);
      },
    },
    uiSession: {
      current: { getSnapshot: () => ({ key: options.mounted === false ? undefined : "synthetic-session" }) },
    },
  };

  const ctx = {
    slots,
    locale,
    effect: (callback) => {
      const dispose = callback();
      return typeof dispose === "function" ? dispose : () => {};
    },
    inject: (_names, callback) => {
      if (options.rightAvailable === false) return;
      callback({
        get: (name) => services[name],
        slots,
        effect: (effectCallback) => {
          const dispose = effectCallback();
          return typeof dispose === "function" ? dispose : () => {};
        },
      });
    },
    get: (name) => services[name],
  };

  let exported;
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load: ({ id, factory }) => {
          sandbox.loadedId = id;
          exported = factory(requireShim);
        },
      },
    },
    URL,
    console,
    setTimeout,
    clearTimeout,
    fetch: options.fetch ?? (async () => {
      throw new Error("fetch is not available in this test");
    }),
  };
  vm.runInNewContext(readFileSync(CLIENT_URL, "utf8"), sandbox, { filename: "client.js" });
  exported.apply(ctx);

  const t = translator(dictionaries, options.language ?? "zh");

  function find(name, key) {
    return registrations.find(
      (registration) =>
        registration.options.name === name && (key === undefined || registration.options.key === key),
    );
  }

  function render(name, props = {}, key) {
    const registration = find(name, key);
    if (!registration) throw new Error(`No registration for slot ${name}${key ? `#${key}` : ""}`);
    const injected = typeof registration.options.inject === "function" ? registration.options.inject() : {};
    const owner = name === "settings.section" ? { close: () => {} } : {};
    return renderToStaticMarkup(
      React.createElement(registration.component, { ...injected, ...owner, ...props }),
    );
  }

  function renderMarkup(element) {
    return renderToStaticMarkup(element);
  }

  return {
    exported,
    sandbox,
    registrations,
    calls,
    dictionaries,
    locale,
    t,
    services,
    loadedId: sandbox.loadedId,
    find,
    render,
    renderMarkup,
  };
}
