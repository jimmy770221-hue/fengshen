/* nezha-sprite.js v2 — 無依賴、時間驅動的逐格動畫播放器（iPhone Safari 可用）
   - 圖集格寬高＝圖片實際尺寸 ÷ grid，更換圖集不必改程式
   - 每個動畫是「格號＋停留秒數」的序列；缺專用圖的動畫用 fx 程式效果暫代
   - 事件與圖片是否載入無關；圖載入失敗時用簡單形狀備援 */
(function (global) {
  'use strict';

  var DEFAULT = {
    image: 'nezha-idle-sheet.png',
    grid: [2, 2],                    // 欄 × 列（格號由左到右、由上到下）
    anchor: [0.5, 0.94],             // 腳底錨點（格內比例；翻轉以此為軸）
    shadow: [0.22, 0.05],            // 地面陰影半徑（格寬、格高的比例）
    anims: {
      // 待機：沿用首頁原 CSS 動畫的時間軸，2.5 秒一輪（格 2 為眨眼）
      idle: { steps: [[0, 1.125], [1, 0.325], [2, 0.125], [3, 0.375], [0, 0.55]], loop: true, still: 0 },
      // 以下三個尚無專用圖集：暫用待機格 + fx 程式效果；之後換成專用格即可，其餘程式不用動
      move: { steps: [[0, 0.16], [1, 0.16], [3, 0.16], [1, 0.16]], loop: true, still: 0, fx: 'run', refSpeed: 50 },
      cast: { steps: [[1, 0.08], [3, 0.08], [0, 0.08]], loop: false, still: 1, prio: 1, fx: 'cast',
              events: { 0: { name: 'cast', at: [0.78, 0.2] } } },        // at＝施法點（格內比例）
      hit:  { steps: [[2, 0.09], [2, 0.09]], loop: false, still: 2, prio: 2, restart: true, fx: 'hit' }
    }
  };

  // 降動態：只改畫面（定格、不套 fx），時間與事件不變，不影響戰鬥
  var mq = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = !!(mq && mq.matches);
  if (mq) {
    var onMq = function (e) { reduced = e.matches; };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  var cache = {};
  function loadImage(src) {
    if (cache[src]) return cache[src];
    var e = cache[src] = { img: new Image(), ok: false, failed: false };
    e.img.decoding = 'async';
    e.img.onload = function () { e.ok = true; };
    e.img.onerror = function () { e.failed = true; };
    e.img.src = src;
    return e;
  }

  function prepare(m) {
    for (var k in m.anims) {
      var a = m.anims[k], t = 0;
      if (a.cum) continue;
      a.cum = [];
      for (var i = 0; i < a.steps.length; i++) { t += a.steps[i][1]; a.cum.push(t); }
      a.total = t;
    }
    return m;
  }
  prepare(DEFAULT);

  // 動畫第 t 秒落在第幾個步驟
  function stepAt(a, t) {
    t = a.loop ? t % a.total : Math.min(t, a.total - 1e-6);
    for (var i = 0; i < a.cum.length; i++) if (t < a.cum[i]) return i;
    return a.cum.length - 1;
  }

  // 給 DOM 版（CSS 背景圖）用：全域時間 → 目前格號，重新渲染後相位不會歸零
  function cellAt(name, seconds, manifest) {
    var m = prepare(manifest || DEFAULT), a = m.anims[name];
    return a.steps[stepAt(a, seconds)][0];
  }

  function NezhaSprite(opts) {
    opts = opts || {};
    this.m = prepare(opts.manifest || DEFAULT);
    this.height = opts.height || 0;       // 一格畫出的高度（畫面單位）；優先於 scale
    this.scale = opts.scale || 1;         // 格內原尺寸的倍率
    this.facing = 1;                      // 1 朝右，-1 朝左（繞腳底錨點翻轉）
    this.shadow = opts.shadow !== false;
    this.reduceMotion = opts.reduceMotion; // true/false 可強制；undefined 跟隨系統
    this.onEvent = opts.onEvent || null;   // ({name, anim, frame, offset:[dx,dy]})
    this.onEnd = opts.onEnd || null;       // ({name, interrupted})
    this.base = 'idle';
    this.t = 0;
    this.rate = 1;
    this.one = null;
    this.asset = loadImage(this.m.image);
  }
  var P = NezhaSprite.prototype;

  // 待機／移動；speed＝實際移動速度（畫面單位/秒），用來讓步伐貼地
  P.setMoving = function (on, speed) {
    var b = on ? 'move' : 'idle', ref = this.m.anims.move && this.m.anims.move.refSpeed;
    if (b !== this.base) { this.base = b; this.t = 0; }
    this.rate = on && speed && ref ? Math.min(1.6, Math.max(0.6, speed / ref)) : 1;
  };

  // 一次性動畫（cast／hit）；成功播放回傳 true，被更高優先或重複而忽略回傳 false
  P.play = function (name) {
    var a = this.m.anims[name];
    if (!a || a.loop) return false;
    var cur = this.one && this.m.anims[this.one.name];
    if (cur && (a.prio || 0) < (cur.prio || 0)) return false;
    if (cur && name === this.one.name && !a.restart) return false;
    if (this.one) this._finish(true);
    this.one = { name: name, t: 0, fired: {} };
    return true;
  };

  P.current = function () { return this.one ? this.one.name : this.base; };
  P.busy = function () { return !!this.one; };
  P.ready = function () { return this._usable(); };

  P._finish = function (interrupted) {
    var n = this.one.name;
    this.one = null;
    this.t = 0;
    if (this.onEnd) this.onEnd({ name: n, interrupted: !!interrupted });
  };

  P._fire = function (a, one, k) {
    one.fired[k] = 1;
    var ev = a.events[k], at = ev.at, an = this.m.anchor, d = this._dims();
    if (this.onEvent) this.onEvent({
      name: ev.name, anim: one.name, frame: +k,
      offset: at ? [(at[0] - an[0]) * d.w * this.facing, (at[1] - an[1]) * d.h] : [0, 0]
    });
  };

  // 時間驅動：每個畫面呼叫一次，dt 單位為秒。事件與圖片是否載入無關
  P.update = function (dt) {
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    var one = this.one;
    if (!one) { this.t += dt * this.rate; return; }
    var a = this.m.anims[one.name];
    one.t += dt;
    var idx = stepAt(a, one.t), done = one.t >= a.total;
    for (var k in a.events) {
      if (this.one !== one) return;                     // 事件回呼中已改播其他動畫
      if (!one.fired[k] && (done || idx >= +k)) this._fire(a, one, k);
    }
    if (done && this.one === one) this._finish(false);
  };

  P._pose = function () {
    var name = this.current(), a = this.m.anims[name], t = this.one ? this.one.t : this.t;
    var rm = this.reduceMotion === undefined ? reduced : this.reduceMotion;
    var cell = rm ? a.still : a.steps[stepAt(a, t)][0];
    var u = a.loop ? (t % a.total) / a.total : Math.min(1, t / a.total);
    return { name: name, cell: cell, u: u, fx: rm ? null : a.fx };
  };

  P._usable = function () {
    var A = this.asset;
    return !A.failed && A.ok && A.img.naturalWidth > 0;
  };

  // 目前一格畫出的寬高與倍率（圖未載入時用備援尺寸）
  P._dims = function (o) {
    var g = this.m.grid, s;
    if (this._usable()) {
      var cw = Math.floor(this.asset.img.naturalWidth / g[0]), ch = Math.floor(this.asset.img.naturalHeight / g[1]);
      s = (o && o.scale) || (this.height ? this.height / ch : this.scale);
      return { cw: cw, ch: ch, s: s, w: cw * s, h: ch * s };
    }
    var h = this.height || 170 * this.scale;
    return { cw: 0, ch: 0, s: 1, w: h, h: h };
  };

  // 程式暫代效果：回傳 {dx,dy,rot,sc,alpha}，位移以格寬／格高為單位
  function fxOf(p, d) {
    var r = { dx: 0, dy: 0, rot: 0, sc: 1, alpha: 1 }, e;
    if (p.fx === 'run') r.rot = 0.05;
    else if (p.fx === 'cast') { e = Math.sin(Math.PI * p.u); r.dx = 0.06 * d.w * e; r.sc = 1 + 0.1 * e; r.rot = 0.04 * e; }
    else if (p.fx === 'hit') { r.dx = -0.04 * d.w * Math.sin(Math.PI * p.u); r.alpha = Math.floor(p.u * 6) % 2 ? 0.55 : 1; }
    return r;
  }

  // (x, y)＝腳底位置（畫布座標）。o 可覆寫 scale、facing、alpha
  P.draw = function (ctx, x, y, o) {
    o = o || {};
    var face = (o.facing || this.facing) < 0 ? -1 : 1, p = this._pose(), d = this._dims(o), an = this.m.anchor;
    ctx.save();
    ctx.translate(x, y);
    var baseAlpha = o.alpha === undefined ? 1 : o.alpha;
    ctx.globalAlpha = baseAlpha;
    if (this.shadow) {
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.m.shadow[0] * d.w, this.m.shadow[1] * d.h, 0, 0, 6.2832);
      ctx.fill();
    }
    ctx.scale(face, 1);
    var f = fxOf(p, d);
    ctx.translate(f.dx, f.dy);
    if (f.rot) ctx.rotate(f.rot);
    if (f.sc !== 1) ctx.scale(f.sc, f.sc);
    ctx.globalAlpha = baseAlpha * f.alpha;
    if (this._usable()) {
      var g = this.m.grid, ins = 1;   // 來源矩形內縮 1px，避免縮放時串到相鄰格
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.asset.img,
        (p.cell % g[0]) * d.cw + ins, Math.floor(p.cell / g[0]) * d.ch + ins, d.cw - 2 * ins, d.ch - 2 * ins,
        (-an[0] * d.cw + ins) * d.s, (-an[1] * d.ch + ins) * d.s, (d.cw - 2 * ins) * d.s, (d.ch - 2 * ins) * d.s);
    } else {
      this._fallback(ctx, p, d.h / 170);
    }
    ctx.restore();
  };

  // 備援：圖載入失敗時，用簡單形狀頂替，腳底仍在原點
  P._fallback = function (ctx, p, k) {
    var bob = p.name === 'move' ? Math.sin(p.u * 6.2832 * 2) * 5 * k : 0, hit = p.name === 'hit';
    ctx.fillStyle = hit ? '#ffffff' : '#d8412f';
    ctx.beginPath(); ctx.ellipse(0, -50 * k - bob, 30 * k, 40 * k, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = hit ? '#ffe9e0' : '#ffd9b3';
    ctx.beginPath(); ctx.arc(0, -112 * k - bob, 34 * k, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#2b1b17';
    [-28, 28].forEach(function (dx) {
      ctx.beginPath(); ctx.arc(dx * k, -140 * k - bob, 13 * k, 0, 6.2832); ctx.fill();
    });
    ctx.beginPath(); ctx.arc(14 * k, -112 * k - bob, 4 * k, 0, 6.2832); ctx.fill();
    if (p.name === 'cast') {
      ctx.strokeStyle = '#f4c542'; ctx.lineWidth = 4 * k;
      ctx.beginPath(); ctx.arc(70 * k, -80 * k, (14 + p.u * 10) * k, 0, 6.2832); ctx.stroke();
    }
  };

  // 展示台：把動畫掛到一個 <canvas>，回傳 {stop()}
  NezhaSprite.mount = function (canvas, sprite) {
    var ctx = canvas.getContext('2d'), last = 0, raf = 0, stopped = false;
    function tick(now) {
      if (stopped) return;
      var dpr = Math.min(global.devicePixelRatio || 1, 3);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      sprite.update(last ? (now - last) / 1000 : 0);
      last = now;
      sprite.draw(ctx, w / 2, h * 0.88);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return { stop: function () { stopped = true; cancelAnimationFrame(raf); } };
  };

  NezhaSprite.DEFAULT = DEFAULT;
  NezhaSprite.cellAt = cellAt;
  global.NezhaSprite = NezhaSprite;
})(typeof window !== 'undefined' ? window : globalThis);
