export function evaluate(source) {
  const text = String(source)
    .replace(/[,，\s]/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/");
  let p = 0;
  const eat = (c) => (text[p] === c ? (p++, true) : false);
  function expr() {
    let v = term();
    for (;;) {
      if (eat("+")) v += term();
      else if (eat("-")) v -= term();
      else return v;
    }
  }
  function term() {
    let v = unary();
    for (;;) {
      if (eat("*")) v *= unary();
      else if (eat("/")) {
        const d = unary();
        if (d === 0) throw Error("不能除以零");
        v /= d;
      } else return v;
    }
  }
  function unary() {
    if (eat("+")) return unary();
    if (eat("-")) return -unary();
    return power();
  }
  function power() {
    let v = primary();
    while (eat("%")) v /= 100;
    if (eat("^")) v = Math.pow(v, unary());
    return v;
  }
  function primary() {
    if (eat("(")) {
      const v = expr();
      if (!eat(")")) throw Error("缺少右括号");
      return v;
    }
    const m = text.slice(p).match(/^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?/i);
    if (!m) throw Error("请输入有效的计算公式");
    p += m[0].length;
    return Number(m[0]);
  }
  if (!text) throw Error("表达式为空");
  const v = expr();
  if (p !== text.length || !Number.isFinite(v)) throw Error("计算公式不完整");
  return Number(v.toPrecision(14));
}
export function renamePreview(files, rule) {
  const targets = new Map();
  const rows = files.map((file, i) => {
    const dot = file.directory ? -1 : file.name.lastIndexOf(".");
    const ext = dot > 0 ? file.name.slice(dot) : "";
    let base = rule.extension
      ? file.name
      : dot > 0
        ? file.name.slice(0, dot)
        : file.name;
    if (rule.mode === "replace") {
      if (rule.find) {
        base = rule.regex
          ? base.replace(new RegExp(rule.find, "g"), rule.replace)
          : base.split(rule.find).join(rule.replace);
      }
    }
    if (rule.mode === "append") {
      const seq = String(
        (Number.isFinite(Number(rule.start)) ? Number(rule.start) : 1) +
          i * (Number(rule.step) || 1),
      ).padStart(Number(rule.pad) || 1, "0");
      const text = String(rule.text || "").replaceAll("{n}", seq);
      base =
        rule.position === "before"
          ? text + base
          : rule.position === "at"
            ? base.slice(0, Number(rule.index) || 0) +
              text +
              base.slice(Number(rule.index) || 0)
            : base + text;
    }
    if (rule.mode === "sequence")
      base =
        (rule.prefix || "") +
        String(
          (Number.isFinite(Number(rule.start)) ? Number(rule.start) : 1) +
            i * (Number(rule.step) || 1),
        ).padStart(Number(rule.pad) || 1, "0") +
        (rule.suffix || "");
    if (rule.mode === "case")
      base =
        rule.case === "upper"
          ? base.toUpperCase()
          : rule.case === "title"
            ? base.replace(/\b\p{L}/gu, (c) => c.toUpperCase())
            : base.toLowerCase();
    if (rule.mode === "manual")
      base =
        String(rule.lines || "")
          .split("\n")
          [i]?.trim() || base;
    const name = base + (rule.extension ? "" : ext);
    const stem = name.split(".")[0];
    const invalid =
      /[\\/:*?"<>|\x00-\x1f]/.test(name) ||
      /[. ]$/.test(name) ||
      !name ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem);
    const to = file.path.slice(0, file.path.length - file.name.length) + name;
    const row = {
      ...file,
      to,
      newName: name,
      error: invalid ? "文件名无效" : "",
      changed: name !== file.name,
    };
    const key = to.toLowerCase();
    if (targets.has(key)) {
      row.error = "目标重名";
      targets.get(key).error = "目标重名";
    }
    targets.set(key, row);
    return row;
  });
  const existing = new Set(files.map((f) => f.path.toLowerCase()));
  for (const row of rows)
    if (row.changed && existing.has(row.to.toLowerCase()))
      row.error = "目标已存在";
  return rows;
}
export function jsonPath(value, path) {
  const parts = String(path)
    .trim()
    .replace(/^\$\.?/, "")
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  if (!parts.length) return value;
  let values = [value];
  let wildcard = false;
  for (const part of parts) {
    if (part === "*") {
      wildcard = true;
      values = values.flatMap((v) =>
        v && typeof v === "object" ? Object.values(v) : [],
      );
    } else
      values = values
        .map((v) =>
          v != null && Object.hasOwn(Object(v), part) ? v[part] : undefined,
        )
        .filter((v) => v !== undefined);
  }
  if (!values.length) throw Error("路径未匹配任何值");
  return wildcard ? values : values[0];
}
export function toXml(value, name = "root") {
  const esc = (s) =>
    String(s ?? "").replace(
      /[<>&"']/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  const tag = /^[A-Za-z_][\w.-]*$/.test(name) ? name : "item";
  if (Array.isArray(value))
    return `<${tag}>${value.map((v) => toXml(v, "item")).join("")}</${tag}>`;
  if (value && typeof value === "object")
    return `<${tag}>${Object.entries(value)
      .map(([k, v]) => toXml(v, k))
      .join("")}</${tag}>`;
  return `<${tag}>${esc(value)}</${tag}>`;
}
export function toTypescript(value) {
  function type(v) {
    if (v === null) return "null";
    if (Array.isArray(v))
      return v.length
        ? "(" + [...new Set(v.map(type))].join(" | ") + ")[]"
        : "unknown[]";
    if (typeof v === "object")
      return (
        "{\n" +
        Object.entries(v)
          .map(([k, x]) => "  " + JSON.stringify(k) + ": " + type(x) + ";")
          .join("\n") +
        "\n}"
      );
    return typeof v;
  }
  return "type Root = " + type(value) + ";";
}
