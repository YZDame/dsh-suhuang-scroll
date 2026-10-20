import css from "./styles.css";

const PACKAGE = "dsh-suhuang-scroll";
const STYLE_KEY = `${PACKAGE}/styles.css`;

/**
 * Install this plugin's stylesheet once.
 *
 * The loader claims untagged <style> tags after the bundle materializes and owns
 * their removal on unload/HMR, as long as they carry `data-plugin`. Keep the
 * `data-plugin-css` key stable so re-materializing the bundle never duplicates
 * the sheet.
 */
export function installStyles() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`style[data-plugin-css="${STYLE_KEY}"]`)) return;
  const element = document.createElement("style");
  element.dataset.plugin = PACKAGE;
  element.dataset.pluginCss = STYLE_KEY;
  element.textContent = css;
  document.head.appendChild(element);
}
