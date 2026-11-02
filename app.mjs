import {
  $,
  $$,
  action,
  status,
  ready,
  call,
  escapeHtml,
  copy,
} from "./common.mjs";
import { renamePreview } from "./utils.mjs";
let files = [],
  rows = [],
  mode = "replace",
  undo = [],
  busy = false,
  confirmed = null;
const templates = {
  replace:
    '<label>查找 <input id="find" placeholder="要替换的内容"></label><span>→</span><label>替换为 <input id="replace" placeholder="新内容"></label><label><input id="regex" type="checkbox">正则表达式</label>',
  append:
    '<label>追加内容 <input id="text" value="_{n}" placeholder="文本，可用 {n} 插入序号"></label><label>位置 <select id="position"><option value="before">名称前</option><option value="after" selected>名称后</option><option value="at">指定位置</option></select></label><label>第 <input id="index" type="number" value="1" min="0" style="width:58px">位后</label>',
  sequence:
    '<label>前面字符 <input id="prefix" value="文件_"></label><label>后面字符 <input id="suffix"></label>',
  case: '<label>转换 <select id="case"><option value="lower">全部小写</option><option value="upper">全部大写</option><option value="title">单词首字母大写</option></select></label>',
  manual:
    '<span class="muted">可直接编辑表格中的新名称，或粘贴多行名称（每行对应一个条目）</span><textarea id="lines" placeholder="粘贴来自 Excel / 文本的名称，每行一项"></textarea>',
};
function config() {
  const rule = { mode, extension: $("#extension").checked };
  for (const el of $$("#rules input,#rules select,#rules textarea"))
    rule[el.id] = el.type === "checkbox" ? el.checked : el.value;
  return rule;
}
function resetConfirmation() {
  $("#confirm-bar").classList.add("hidden");
  for (const id of ["summary", "undo", "commit"])
    $("#" + id).classList.remove("hidden");
  confirmed = null;
}
function render() {
  resetConfirmation();
  const invalid = rows.some((r) => r.error);
  const changed = rows.filter((r) => r.changed);
  $("#empty").classList.toggle("hidden", files.length > 0);
  $("#table").classList.toggle("hidden", !files.length);
  $("#files").innerHTML = rows
    .map(
      (r, i) =>
        '<tr><td class="row-number">' +
        (i + 1) +
        "</td><td>" +
        escapeHtml(r.name) +
        (r.directory ? " <small>文件夹</small>" : "") +
        '</td><td class="' +
        (r.error ? "danger" : "new-name") +
        '">' +
        (mode === "manual"
          ? '<input data-edit="' +
            i +
            '" value="' +
            escapeHtml(r.newName) +
            '" aria-label="新文件名">'
          : escapeHtml(r.newName)) +
        '</td><td class="path" title="' +
        escapeHtml(r.path) +
        '">' +
        escapeHtml(r.path.slice(0, -r.name.length)) +
        "</td><td>" +
        escapeHtml(r.error || (r.changed ? "待修改" : "未变化")) +
        '</td><td><button class="remove-file" data-remove="' +
        i +
        '" title="移出列表">×</button></td></tr>',
    )
    .join("");
  $$("[data-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        files.splice(Number(b.dataset.remove), 1);
        preview();
      }),
  );
  $$("[data-edit]").forEach(
    (input) =>
      (input.onchange = () => {
        const names = rows.map((r) => r.newName);
        names[Number(input.dataset.edit)] = input.value;
        $("#extension").checked = true;
        $("#lines").value = names.join("\n");
        preview();
      }),
  );
  $("#summary").textContent =
    "共 " +
    files.length +
    " 项 · 修改 " +
    changed.length +
    " 项" +
    (invalid ? " · 存在冲突" : "");
  $("#commit").disabled = busy || !changed.length || invalid;
  $("#undo").disabled = busy || !undo.length;
}
function preview() {
  try {
    rows = renamePreview(files, config());
    render();
    status("检查新旧名称后执行；原文件不会被覆盖");
  } catch (e) {
    $("#commit").disabled = true;
    status(e.message, true);
  }
}
function rules() {
  $("#rules").innerHTML =
    templates[mode] +
    (["append", "sequence"].includes(mode)
      ? '<label>开始序号 <input id="start" type="number" min="0" value="1" style="width:64px"></label><label>步长 <input id="step" type="number" min="1" value="1" style="width:55px"></label><label>固定位数 <input id="pad" type="number" min="1" max="10" value="3" style="width:55px"></label>'
      : "");
  $$("#rules input,#rules select,#rules textarea").forEach(
    (el) => (el.oninput = preview),
  );
  preview();
}
function add(entries) {
  files = [
    ...new Map(
      [...files, ...entries].map((f) => [f.path.toLowerCase(), f]),
    ).values(),
  ];
  if (files.length > 1000) {
    files = files.slice(0, 1000);
    status("单批最多 1000 项，请分批操作", true);
  }
  sort();
}
$("#add-files").onclick = action(async () => {
  const r = await call("fs.pickfiles");
  add(r.entries);
});
window.mytools?.onFilesDropped?.(action(async () => {
  status("正在导入拖放条目，请完成宿主授权…");
  const result = await call("fs.importdropped");
  add(result.entries);
  status("已导入拖放条目；所在目录已授权，执行前请核对预览");
}));
$("#add-folder").onclick = action(async () => {
  const r = await call("fs.pickfiles", { directories: true });
  add(r.entries);
});
$("#directory").onclick = action(async () => {
  const r = await call("fs.pickdirectory");
  const found = await call("fs.search", {
    path: r.path,
    maxResults: 1000,
    maxDepth: $("#recursive").checked ? 12 : 1,
  });
  add(found.entries);
  if (found.truncated) status("目录超出单批上限，请分批导入", true);
});
function sort() {
  files.sort((a, b) =>
    $("#sort").value === "modified"
      ? b.modified - a.modified
      : ($("#sort").value === "desc" ? -1 : 1) *
        a.name.localeCompare(b.name, "zh-CN", { numeric: true }),
  );
  preview();
}
$("#sort").onchange = sort;
$("#extension").onchange = preview;
$$("#modes button[data-mode]").forEach(
  (b) =>
    (b.onclick = () => {
      mode = b.dataset.mode;
      $$("#modes button[data-mode]").forEach((x) =>
        x.classList.toggle("active", x === b),
      );
      rules();
    }),
);
$("#clear").onclick = () => {
  files = [];
  preview();
};
$("#extract").onclick = action(() => copy(files.map((f) => f.name).join("\n")));
function confirmOperation(entries, isUndo) {
  if (!entries.length || busy) return;
  confirmed = { entries, isUndo };
  $("#confirm-text").textContent =
    (isUndo ? "撤销上次操作，恢复 " : "确认修改 ") +
    entries.length +
    " 项名称？";
  for (const id of ["summary", "undo", "commit"])
    $("#" + id).classList.add("hidden");
  $("#confirm-bar").classList.remove("hidden");
}
$("#commit").onclick = () => {
  if (rows.some((r) => r.error)) return;
  confirmOperation(
    rows.filter((r) => r.changed).map((r) => ({ from: r.path, to: r.to })),
    false,
  );
};
$("#undo").onclick = () => confirmOperation(undo, true);
$("#cancel-confirm").onclick = resetConfirmation;
$("#apply-confirm").onclick = action(async () => {
  if (!confirmed || busy) return;
  const operation = confirmed;
  busy = true;
  $$("button,input,select,textarea").forEach((el) => (el.disabled = true));
  try {
    const result = await call("fs.renamemany", { entries: operation.entries });
    for (const item of result.renamed) {
      const f = files.find((f) => f.path === item.from);
      if (f) {
        f.path = item.to;
        f.name = item.to.split(/[\\/]/).pop();
      }
    }
    undo = operation.isUndo
      ? operation.entries.filter(
          (e) => !result.renamed.some((done) => done.from === e.from),
        )
      : result.renamed.map((e) => ({ from: e.to, to: e.from })).reverse();
    busy = false;
    preview();
    status(
      (operation.isUndo ? "已恢复 " : "已修改 ") +
        result.renamed.length +
        " 项" +
        (result.failed.length ? " · 停止：" + result.failed[0].reason : ""),
      !!result.failed.length,
    );
  } finally {
    busy = false;
    $$("button,input,select,textarea").forEach((el) => (el.disabled = false));
    $("#commit").disabled =
      !rows.some((r) => r.changed) || rows.some((r) => r.error);
    $("#undo").disabled = !undo.length;
    resetConfirmation();
  }
});
rules();
ready(() => status("选择文件或文件夹 → 设置规则 → 预览 → 执行；支持撤销"));
