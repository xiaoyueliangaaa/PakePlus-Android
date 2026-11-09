/*!
 * minitool-runtime.js
 * 离线小工具运行时适配（最低基线 Chrome / WebView 61，经典脚本，ES2017）
 * 1. globalThis polyfill（Chrome 71 之前无 globalThis）
 * 2. Flex gap 布局行为检测：基线用子项 margin，支持时启用原生 gap
 * 3. --app-height 视口高度维护（地址栏 / 软键盘场景，CSS 保留 100vh 兜底）
 * 4. window.__miniTool.saveImage：Canvas 海报经 JSBridge 写入临时文件并保存到相册
 * 5. window.__miniTool.copyText：弹出可选中文本弹窗（容器禁用剪贴板 API 的替代交互）
 */
(function () {
  'use strict';

  /* ---------- 1. globalThis polyfill ---------- */
  if (typeof globalThis === 'undefined') {
    Object.defineProperty(Object.prototype, '__mtGlobalThis__', {
      get: function () { return this; },
      configurable: true
    });
    __mtGlobalThis__.globalThis = __mtGlobalThis__;
    delete Object.prototype.__mtGlobalThis__;
  }

  /* ---------- 2. Flex gap 行为检测（语法检测不能证明 Flex gap 生效，须实测布局） ---------- */
  function supportsFlexGap() {
    try {
      var flex = document.createElement('div');
      flex.style.position = 'absolute';
      flex.style.visibility = 'hidden';
      flex.style.display = 'flex';
      flex.style.flexDirection = 'column';
      flex.style.rowGap = '1px';
      flex.appendChild(document.createElement('div'));
      flex.appendChild(document.createElement('div'));
      document.body.appendChild(flex);
      var supported = flex.scrollHeight === 1;
      flex.parentNode.removeChild(flex);
      return supported;
    } catch (e) {
      return false;
    }
  }

  function initGapDetection() {
    if (supportsFlexGap()) {
      document.documentElement.classList.add('supports-flex-gap');
    }
  }

  /* ---------- 3. --app-height 维护（CSS 中以 var(--app-height, 100vh) 引用） ---------- */
  function setAppHeight() {
    document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
  }

  function initAppHeight() {
    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', function () {
      window.setTimeout(setAppHeight, 200);
    });
  }

  /* ---------- 4. 保存图片到相册：writeTempFile（须完整 data:uri）→ saveImageToPhotosAlbum ---------- */
  function saveImage(dataUrl) {
    var mt = window.xhs && window.xhs.miniTool;
    if (mt && mt.writeTempFile && mt.saveImageToPhotosAlbum) {
      return mt.writeTempFile({ data: dataUrl }).then(function (res) {
        var filePath = res && res.filePath ? res.filePath : dataUrl;
        return mt.saveImageToPhotosAlbum({ filePath: filePath });
      });
    }
    return Promise.reject(new Error('miniTool bridge unavailable'));
  }

  /* ---------- 5. 复制替代：展示可选中文本，引导长按 / 选中手动复制 ---------- */
  function copyText(text) {
    if (document.getElementById('mt-copy-modal')) return;

    var overlay = document.createElement('div');
    overlay.id = 'mt-copy-modal';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;' +
      'display:flex;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,0.6);padding:1rem;';

    var card = document.createElement('div');
    card.style.cssText =
      'width:100%;max-width:20rem;border-radius:1rem;background:#FDF8F0;' +
      'padding:1.25rem;box-shadow:0 10px 30px rgba(0,0,0,0.2);';

    var title = document.createElement('div');
    title.textContent = '复制结果链接';
    title.style.cssText = 'font-size:1rem;font-weight:600;color:#5C2E10;margin-bottom:0.5rem;';

    var tip = document.createElement('div');
    tip.textContent = '长按下方文字即可选择、复制链接：';
    tip.style.cssText = 'font-size:0.8125rem;color:#8A6B4F;margin-bottom:0.5rem;';

    var content = document.createElement('div');
    content.textContent = String(text);
    content.style.cssText =
      '-webkit-user-select:text;user-select:text;word-break:break-all;' +
      'font-size:0.8125rem;line-height:1.5;color:#3D2B1A;' +
      'background:rgba(162,59,31,0.06);border-radius:0.5rem;padding:0.75rem;' +
      'max-height:8rem;overflow-y:auto;';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '知道了';
    btn.style.cssText =
      'margin-top:1rem;width:100%;height:2.75rem;border:none;border-radius:9999px;' +
      'background:#A23B1F;color:#fff;font-size:1rem;';

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    btn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    card.appendChild(title);
    card.appendChild(tip);
    card.appendChild(content);
    card.appendChild(btn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  window.__miniTool = {
    saveImage: saveImage,
    copyText: copyText
  };

  function boot() {
    initGapDetection();
    initAppHeight();
  }

  if (document.body) {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }
})();
