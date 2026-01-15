var detailFontSize = 16;
var detailLineHeight = 24;

function openSettingsPanel() {
  var panel = document.getElementById('settingsPanel');
  if (!panel) return;
  // 初始化时，将设置面板内容替换为按钮式界面（一次性初始化）
  if (!panel.dataset.initialized) {
    panel.innerHTML = `
<div style=\"margin-bottom:8px;\">字号:\n  <button onclick=\"adjustFontSize(-1)\" aria-label=\"font-decrease\">-</button>\n  <span id=\"detailFontSizeVal\">16px</span>\n  <button onclick=\"adjustFontSize(1)\" aria-label=\"font-increase\">+</button>\n</div>\n<div style=\"margin-bottom:8px;\">行距:\n  <button onclick=\"adjustLineHeight(-1)\" aria-label=\"lineheight-decrease\">-</button>\n  <span id=\"detailLineHeightVal\">24px</span>\n  <button onclick=\"adjustLineHeight(1)\" aria-label=\"lineheight-increase\">+</button>\n</div>\n<div>\n  <button onclick=\"applySettings()\">应用</button>\n  <button onclick=\"resetSettings()\">重置默认值</button>\n  <button onclick=\"closeSettingsPanel()\">关闭</button>\n</div>\n`;
    panel.dataset.initialized = '1';
  }
  // 读取并应用历史设置
  detailFontSize = parseInt(localStorage.getItem('detail-font-size') || '16', 10);
  detailLineHeight = parseInt(localStorage.getItem('detail-line-height') || '24', 10);
  updateDisplays();
  panel.style.display = 'block';
}

function closeSettingsPanel() {
  var panel = document.getElementById('settingsPanel');
  if (panel) panel.style.display = 'none';
}

function clampFont(n) {
  return Math.max(12, Math.min(28, n));
}
function clampLine(n) {
  return Math.max(20, Math.min(40, n));
}

function adjustFontSize(delta) {
  detailFontSize = clampFont(detailFontSize + delta);
  updateDisplays();
}

function adjustLineHeight(delta) {
  detailLineHeight = clampLine(detailLineHeight + delta);
  updateDisplays();
}

function updateDisplays() {
  var fontVal = detailFontSize;
  var lineVal = detailLineHeight;
  var fontEl = document.getElementById('detailFontSizeVal');
  var lineEl = document.getElementById('detailLineHeightVal');
  if (fontEl) fontEl.textContent = fontVal + 'px';
  if (lineEl) lineEl.textContent = lineVal + 'px';
  applyFont(fontVal);
  applyLineHeight(lineVal);
}

function applySettings() {
  localStorage.setItem('detail-font-size', detailFontSize);
  localStorage.setItem('detail-line-height', detailLineHeight);
  closeSettingsPanel();
}

function applyFont(px) {
  var rem = (px / 16).toFixed(3) + 'rem';
  var nodes = document.querySelectorAll('#content1 p');
  if (nodes.length) nodes.forEach(function (p) { p.style.fontSize = rem; });
}

function applyLineHeight(px) {
  var rem = (px / 16).toFixed(3) + 'rem';
  var nodes = document.querySelectorAll('#content1 p');
  if (nodes.length) nodes.forEach(function (p) { p.style.lineHeight = rem; });
}

function resetSettings() {
  detailFontSize = 16;
  detailLineHeight = 24;
  updateDisplays();
  localStorage.setItem('detail-font-size', detailFontSize);
  localStorage.setItem('detail-line-height', detailLineHeight);
}

document.addEventListener('DOMContentLoaded', function () {
  detailFontSize = parseInt(localStorage.getItem('detail-font-size') || '16', 10);
  detailLineHeight = parseInt(localStorage.getItem('detail-line-height') || '24', 10);
  updateDisplays();
});
