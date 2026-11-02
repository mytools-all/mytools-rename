export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => [...document.querySelectorAll(selector)];
export function status(text, error = false) {
  const el = $("#status");
  if (el) {
    el.textContent = text;
    el.dataset.error = String(error);
  }
}
export function action(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      status(e.message || String(e), true);
    }
  };
}
export async function call(id, args = {}) {
  if (!window.mytools) throw Error("请从 MyTools 打开此工具");
  return window.mytools.call(id, args);
}
export const copy = async (text) => {
  await call("clipboard.write", { text: String(text) });
  status("已复制到剪贴板");
};
export function ready(fn) {
  if (window.mytools) window.mytools.onPluginReady(action(fn));
  else status("预览模式：系统能力需从 MyTools 使用");
}
export const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function download(name, text, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function debounce(fn, ms = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
export const formatBytes = (n) =>
  n < 1024
    ? n + " B"
    : n < 1048576
      ? (n / 1024).toFixed(1) + " KB"
      : (n / 1048576).toFixed(1) + " MB";
const savedTheme = localStorage.getItem("tool-theme");
document.documentElement.dataset.theme =
  savedTheme ||
  (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
$("#theme")?.addEventListener("click", () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("tool-theme", theme);
});
