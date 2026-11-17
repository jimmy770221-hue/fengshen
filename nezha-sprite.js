/* nezha-sprite.js v2 — 無依賴、時間驅動的逐格動畫播放器（iPhone Safari 可用）
   - 圖集格寬高＝圖片實際尺寸 ÷ grid，更換圖集不必改程式
   - 每個動畫是「格號＋停留秒數」的序列；缺專用圖的動畫用 fx 程式效果暫代
   - 事件與圖片是否載入無關；圖載入失敗時用簡單形狀備援 */
(function (global) {
  'use strict';

  var DEFAULT = {
    // 四張圖集（各 2×2）；key 以 window.asset() 解析成實際網址，找不到時直接當網址用
    images: { move: 'char/nezha/sheet-move', blink: 'char/nezha/sheet-move-blink',
              attack: 'char/nezha/sheet-attack', fall: 'char/nezha/sheet-fall' },
    image: 'move',                   // 預設圖集（備援與就緒判斷用）
    grid: [2, 2],                    // 欄 × 列（格號由左到右、由上到下）
    anchor: [0.5, 0.94],             // 腳底錨點（格內比例；翻轉以此為軸）
    shadow: [0.22, 0.05],            // 地面陰影半徑（格寬、格高的比例）
    blink: { every: 3.2, dur: 0.09, image: 'blink' },   // 待機／移動時約每 3.2 秒眨眼 90 毫秒（同格號換圖）
    anims: {
      // 待機：移動圖集第 0 格定格（眨眼另計）
      idle: { steps: [[0, 1]], loop: true, still: 0, image: 'move' },
      // 移動：4 格滑行，每格 160 毫秒
      move: { steps: [[0, 0.16], [1, 0.16], [2, 0.16], [3, 0.16]], loop: true, still: 0, image: 'move', refSpeed: 50 },
      // 攻擊：90／75／270／115 毫秒；第 2 格（伸手放圈）送出「release」事件，at＝手的位置（格內比例）
      cast: { steps: [[0, 0.09], [1, 0.075], [2, 0.27], [3, 0.115]], loop: false, still: 0, prio: 1, image: 'attack',
              events: { 2: { name: 'release', at: [0.84, 0.51] } } },
      // 倒下：90／100／110／220 毫秒，只播一次，播完停在最後一格
      fall: { steps: [[0, 0.09], [1, 0.10], [2, 0.11], [3, 0.22]], loop: false, still: 3, prio: 9, image: 'fall', hold: true }
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
  function resolve(key) { return (global.asset && global.asset(key)) || key; }
  function loadImage(key) {
    var src = resolve(key);
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
    this.bt = Math.random() * 3;           // 眨眼用的獨立時鐘（不隨動畫重置）
    this.assets = {};
    for (var k in this.m.images) this.assets[k] = loadImage(this.m.images[k]);
    this.asset = this.assets[this.m.image];
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
    if (this.one && this.one.done) return false;
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
    this.bt += dt;
    var one = this.one;
    if (one && one.done) return;                         // 已定格（倒下）
    if (!one) { this.t += dt * this.rate; return; }
    var a = this.m.anims[one.name];
    one.t += dt;
    var idx = stepAt(a, one.t), done = one.t >= a.total;
    for (var k in a.events) {
      if (this.one !== one) return;                     // 事件回呼中已改播其他動畫
      if (!one.fired[k] && (done || idx >= +k)) this._fire(a, one, k);
    }
    if (done && this.one === one) {
      if (a.hold) { one.done = true; if (this.onEnd) this.onEnd({ name: one.name, interrupted: false }); }
      else this._finish(false);
    }
  };

  P._pose = function () {
    var name = this.current(), a = this.m.anims[name], t = this.one ? this.one.t : this.t;
    var rm = this.reduceMotion === undefined ? reduced : this.reduceMotion;
    var cell = rm ? a.still : a.steps[stepAt(a, t)][0];
    var u = a.loop ? (t % a.total) / a.total : Math.min(1, t / a.total);
    var img = a.image || this.m.image, b = this.m.blink;
    if (!this.one && b && !rm && (this.bt % b.every) < b.dur) img = b.image;
    return { name: name, cell: cell, u: u, fx: rm ? null : a.fx, img: img };
  };

  P._usable = function (key) {
    var A = key ? this.assets[key] : this.asset;
    return !!A && !A.failed && A.ok && A.img.naturalWidth > 0;
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

  var _tc = null;
  function tintCanvas(w, h) {
    if (!_tc) _tc = document.createElement('canvas');
    if (_tc.width !== w || _tc.height !== h) { _tc.width = w; _tc.height = h; }
    return _tc;
  }

  // (x, y)＝腳底位置（畫布座標）。o 可覆寫 scale、facing、alpha
  P.draw = function (ctx, x, y, o) {   // o.tint（0～1）＝受擊紅閃強度
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
    var cur = this.assets[p.img];
    if (this._usable() && this._usable(p.img)) {
      var g = this.m.grid, ins = 1;   // 來源矩形內縮 1px，避免縮放時串到相鄰格
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      var sx = (p.cell % g[0]) * d.cw + ins, sy = Math.floor(p.cell / g[0]) * d.ch + ins, sw = d.cw - 2 * ins, sh = d.ch - 2 * ins;
      var dx0 = (-an[0] * d.cw + ins) * d.s, dy0 = (-an[1] * d.ch + ins) * d.s, dw = sw * d.s, dh = sh * d.s;
      ctx.drawImage(cur.img, sx, sy, sw, sh, dx0, dy0, dw, dh);
      if (o.tint > 0) {   // 受擊紅閃：同一格再疊一層只染在角色身上的紅色
        var tc = tintCanvas(sw, sh), tx = tc.getContext('2d');
        tx.clearRect(0, 0, sw, sh);
        tx.globalCompositeOperation = 'source-over';
        tx.drawImage(cur.img, sx, sy, sw, sh, 0, 0, sw, sh);
        tx.globalCompositeOperation = 'source-atop';
        tx.fillStyle = 'rgba(255,40,30,1)'; tx.fillRect(0, 0, sw, sh);
        ctx.globalAlpha = baseAlpha * f.alpha * Math.min(1, o.tint);
        ctx.drawImage(tc, 0, 0, sw, sh, dx0, dy0, dw, dh);
      }
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

  // 預先載入所有圖集，回傳 Image 陣列（讓載入畫面可以等它們）
  NezhaSprite.preload = function (manifest) {
    var m = manifest || DEFAULT, out = [];
    for (var k in m.images) out.push(loadImage(m.images[k]).img);
    return out;
  };
  NezhaSprite.DEFAULT = DEFAULT;
  NezhaSprite.cellAt = cellAt;
  global.NezhaSprite = NezhaSprite;
})(typeof window !== 'undefined' ? window : globalThis);
