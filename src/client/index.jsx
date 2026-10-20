import { dictionaries, NS } from "./i18n.js";
import { registerSurfaces } from "./slots.jsx";
import { installStyles } from "./styles.js";
import { boot, getState, refreshAll, __resetForTests } from "./store.js";

export const inject = ["slots", "locale"];

// Test-only handle: the bundle runs in a browser module loader, so tests that
// need a booted store (ready/running/awaiting render fixtures) reach it here.
// The host only consumes `apply`/`inject`.
export const __testing = { boot, getState, refreshAll, __resetForTests };

/**
 * Client half of the DSH plugin. The host calls this once per page after the
 * injected services exist; everything registered here is owned by the host's
 * effect scope and disposed when the plugin unloads.
 */
export function apply(ctx) {
  installStyles();
  ctx.effect(() => ctx.locale.register(NS, dictionaries), "suhuang-scroll: dictionaries");
  const locale = ctx.locale;
  const t = locale.bind(NS);
  registerSurfaces(ctx, { locale, t });
}
