/* Vipra Digital — site runtime.
   Shutter loader + page transitions, VIP guide, synthesized sound, theme/easy toggles,
   3D logo, night scroll story, contact form. No build step; plain browser JS. */

/* ===== EDIT THIS ===== */
var VIPRA_CONFIG = {
  whatsapp: "916397320388",            // country code + number, digits only
  email: "agency@vipradigital.com",
  // Paste your n8n production webhook URL here (Webhook node, POST, JSON).
  // Leave empty and the form hands the enquiry over to WhatsApp instead.
  webhookUrl: ""
};
/* ===================== */

(function () {
  "use strict";
  var html = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var calm = function () { return html.classList.contains("easy") || html.classList.contains("reduce"); };
  var finePointer = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var page = html.dataset.page || "home";
  var waLink = function (msg) { return "https://wa.me/" + VIPRA_CONFIG.whatsapp + "?text=" + encodeURIComponent(msg); };

  /* ================= SOUND (all synthesized, no files) ================= */
  var Sound = {
    want: store.get("vd-sound") === "1", ctx: null, out: null, noise: null, pad: null,
    ready: function () {
      if (!this.want) return false;
      if (!this.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        try { this.ctx = new AC(); } catch (e) { return false; }
        this.out = this.ctx.createGain(); this.out.gain.value = .55; this.out.connect(this.ctx.destination);
        var len = this.ctx.sampleRate, buf = this.ctx.createBuffer(1, len, len), d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = buf;
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx.state !== "closed";
    },
    set: function (on) {
      this.want = on; store.set("vd-sound", on ? "1" : "0");
      if (on) { this.ready(); this.ambient(true); this.pop(); } else this.ambient(false);
      var b = $("#tSound"); if (b) b.setAttribute("aria-pressed", on ? "true" : "false");
    },
    env: function (node, t0, a, peak, d) {
      var g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
      node.connect(g); g.connect(this.out); return g;
    },
    tone: function (f, dur, type, vol, f2, delay) {
      if (!this.ready()) return;
      var t = this.ctx.currentTime + (delay || 0), o = this.ctx.createOscillator();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      this.env(o, t, .005, vol || .1, dur); o.start(t); o.stop(t + dur + .05);
    },
    hiss: function (dur, freq, q, vol, delay) {
      if (!this.ready()) return null;
      var t = this.ctx.currentTime + (delay || 0), s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
      s.buffer = this.noise; s.loop = true; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
      s.connect(f); var g = this.env(f, t, .01, vol, dur); s.start(t); s.stop(t + dur + .1); return { src: s, filter: f, gain: g, t: t };
    },
    tick: function () { this.tone(2100, .025, "sine", .025); },
    pop: function () { this.tone(420, .09, "triangle", .11, 820); },
    chirp: function () { this.tone(520 + Math.random() * 480, .045, "square", .018, 700 + Math.random() * 500); },
    clack: function () { this.hiss(.07, 1800, .7, .22); this.tone(95, .16, "sine", .25, 55); },
    shutter: function (up, dur) {
      if (!this.ready()) return;
      var n = this.hiss(dur, 900, 1.2, .16);
      if (!n) return;
      var lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      lfo.frequency.value = 26; lg.gain.value = .5; lfo.connect(lg); lg.connect(n.gain.gain); lfo.start(n.t); lfo.stop(n.t + dur);
      n.filter.frequency.setValueAtTime(up ? 700 : 1400, n.t); n.filter.frequency.linearRampToValueAtTime(up ? 1500 : 650, n.t + dur);
      var self = this; setTimeout(function () { self.clack(); }, dur * 1000 - 40);
    },
    buzz: function () {
      if (!this.ready()) return;
      [0, .12, .22].forEach(function (d, i) { Sound.tone(118, .07 + i * .05, "sawtooth", .03, 0, d); });
    },
    bell: function () { this.tone(1318, .9, "sine", .12, 0); this.tone(1760, .7, "sine", .07, 0, .02); this.tone(2637, .4, "sine", .03, 0, .03); },
    sw: function () { this.tone(1400, .02, "square", .04); this.tone(900, .03, "square", .035, 0, .05); },
    ambient: function (on) {
      if (on) {
        if (this.pad || !this.ready()) return;
        var ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        lp.type = "lowpass"; lp.frequency.value = 700; g.gain.value = 0; g.connect(this.out); lp.connect(g);
        lfo.frequency.value = .07; lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
        var oscs = [110, 164.8, 220.4, 277.2].map(function (f, i) { var o = ctx.createOscillator(); o.type = i % 2 ? "triangle" : "sine"; o.frequency.value = f; o.detune.value = (i - 1.5) * 6; o.connect(lp); o.start(); return o; });
        g.gain.linearRampToValueAtTime(.022, ctx.currentTime + 3);
        this.pad = { g: g, oscs: oscs.concat([lfo]) };
      } else if (this.pad && this.ctx) {
        var p = this.pad, t = this.ctx.currentTime; this.pad = null;
        p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value, t); p.g.gain.linearRampToValueAtTime(0, t + .6);
        setTimeout(function () { p.oscs.forEach(function (o) { try { o.stop(); } catch (e) {} }); }, 800);
      }
    }
  };
  // browsers start audio only after a gesture: resume on the first one if sound was left on
  var unlock = function () { if (Sound.want) { Sound.ready(); Sound.ambient(true); } window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  window.addEventListener("pointerdown", unlock); window.addEventListener("keydown", unlock);

  /* ================= VIP (speaks only when touched) ================= */
  var vipN = 0;
  function vipSVG() {
    var k = "v" + (++vipN), u = function (id) { return "url(#" + k + id + ")"; };
    return '<svg class="vip-svg" viewBox="0 0 140 170" aria-hidden="true"><defs>' +
      '<radialGradient id="' + k + 'hd" cx=".36" cy=".28" r=".9"><stop offset="0" stop-color="#E2D6FF"/><stop offset=".3" stop-color="#A782FF"/><stop offset=".72" stop-color="#6A3CF2"/><stop offset="1" stop-color="#3F16BE"/></radialGradient>' +
      '<linearGradient id="' + k + 'sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="' + k + 'vs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#261E3B"/><stop offset="1" stop-color="#07060C"/></linearGradient>' +
      '<linearGradient id="' + k + 'bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C2440"/><stop offset="1" stop-color="#0D0B14"/></linearGradient>' +
      '<radialGradient id="' + k + 'jt"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#CDB8FF" stop-opacity=".9"/><stop offset="1" stop-color="#8456FF" stop-opacity="0"/></radialGradient>' +
      '<filter id="' + k + 'gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="' + k + 'sf" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3"/></filter>' +
      '</defs>' +
      '<ellipse class="vs-shadow" cx="70" cy="164" rx="25" ry="3.6" fill="#000" opacity=".3"/>' +
      '<g class="boing"><g class="float">' +
      '<g class="jet"><ellipse cx="70" cy="147" rx="14" ry="5" fill="' + u("jt") + '"/><path d="M62.5 144Q70 165 77.5 144Z" fill="' + u("jt") + '"/></g>' +
      '<g class="arm-l"><path d="M49 109C41 114 37 122 38 129" stroke="#2A2339" stroke-width="10.5" stroke-linecap="round" fill="none"/><path d="M47 110.5C41 115 38.6 121 38.8 126" stroke="#fff" stroke-opacity=".12" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M33.6 129.5h9" stroke="#E6E0F2" stroke-width="2.6" stroke-linecap="round"/><circle cx="38" cy="134" r="7" fill="' + u("hd") + '"/></g>' +
      '<g class="arm-r"><path d="M91 109C99 114 103 122 102 129" stroke="#2A2339" stroke-width="10.5" stroke-linecap="round" fill="none"/><path d="M93 110.5C99 115 101.4 121 101.2 126" stroke="#fff" stroke-opacity=".12" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M97.4 129.5h9" stroke="#E6E0F2" stroke-width="2.6" stroke-linecap="round"/><circle cx="102" cy="134" r="7" fill="' + u("hd") + '"/></g>' +
      '<path d="M50 101Q70 95 90 101L95 135Q95 142 88 143H52Q45 142 45 135Z" fill="' + u("bd") + '"/>' +
      '<path d="M53 102Q70 97 87 102" stroke="#fff" stroke-opacity=".14" stroke-width="1.4" fill="none"/>' +
      '<path d="M70 105V142" stroke="#3B3252" stroke-width="1.2"/>' +
      '<path d="M57 100Q70 94 83 100L82.4 106Q70 101.6 57.6 106Z" fill="#30284A" stroke="#4B4068" stroke-width=".6"/>' +
      '<path d="M68.5 101.2L70 105.6 71.5 101.2" fill="#0D0B14"/>' +
      '<g fill="#E6E0F2"><circle cx="70" cy="112" r="1.9"/><circle cx="70" cy="120" r="1.9"/><circle cx="70" cy="128" r="1.9"/></g>' +
      '<path d="M77.5 114h10.5" stroke="#3B3252" stroke-width="1.2"/><path d="M78.6 114l2.6-4.8 2.1 3.5 2.3-4.2 1.6 5.5z" fill="#A27DFF"/>' +
      '<rect x="50.5" y="111" width="14" height="8" rx="2" fill="#F4F1FA"/><text x="57.5" y="117.2" text-anchor="middle" font-size="5.2" font-weight="800" fill="#4E22D8" font-family="Hanken Grotesk, Arial, sans-serif">VIP</text>' +
      '<ellipse cx="70" cy="100" rx="15" ry="3.2" fill="#000" opacity=".35"/>' +
      '<g class="head">' +
      '<path d="M70 27Q71 17 76.5 11" stroke="#3A2D63" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse cx="70" cy="26.5" rx="6.5" ry="2.6" fill="#3A2D63"/>' +
      '<circle class="ant" cx="77.5" cy="9" r="5" fill="#C9B3FF" filter="' + u("gl") + '"/>' +
      '<circle cx="24" cy="63" r="10.5" fill="#34246E"/><circle class="led" cx="24" cy="63" r="5.6" fill="none" stroke="#C2A8FF" stroke-width="2" filter="' + u("gl") + '"/>' +
      '<circle cx="116" cy="63" r="10.5" fill="#34246E"/><circle class="led" cx="116" cy="63" r="5.6" fill="none" stroke="#C2A8FF" stroke-width="2" filter="' + u("gl") + '"/>' +
      '<rect x="24" y="24" width="92" height="77" rx="36" fill="' + u("hd") + '"/>' +
      '<rect x="24" y="24" width="92" height="77" rx="36" fill="' + u("sh") + '"/>' +
      '<ellipse cx="45" cy="36" rx="12" ry="4.6" transform="rotate(-24 45 36)" fill="#fff" opacity=".6" filter="' + u("sf") + '"/>' +
      '<path d="M40 93Q70 105 100 93" stroke="#E6DBFF" stroke-opacity=".32" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<rect x="34" y="40" width="72" height="49" rx="23" fill="' + u("vs") + '"/>' +
      '<rect x="34.5" y="40.5" width="71" height="48" rx="22.5" fill="none" stroke="#fff" stroke-opacity=".09"/>' +
      '<path d="M45 47Q53 42.6 63 42.6" stroke="#fff" stroke-opacity=".18" stroke-width="3" stroke-linecap="round" fill="none"/>' +
      '<g class="eyes">' +
      '<rect class="eye eye-l" x="50" y="53" width="11" height="18" rx="5.5" fill="#F7F2FF" filter="' + u("gl") + '"/>' +
      '<rect class="eye eye-r" x="79" y="53" width="11" height="18" rx="5.5" fill="#F7F2FF" filter="' + u("gl") + '"/>' +
      '<g class="ex ex-happy" fill="none" stroke="#F7F2FF" stroke-width="3.4" stroke-linecap="round" filter="' + u("gl") + '"><path d="M49.5 65q6-8 12 0"/><path d="M78.5 65q6-8 12 0"/></g>' +
      '<g class="ex ex-wink" fill="none" stroke="#F7F2FF" stroke-width="3.4" stroke-linecap="round" filter="' + u("gl") + '"><path d="M78.5 65q6-8 12 0"/></g>' +
      '<g class="ex ex-wow" fill="#F7F2FF" filter="' + u("gl") + '"><circle cx="55.5" cy="62" r="6.4"/><circle cx="84.5" cy="62" r="6.4"/></g>' +
      '<g class="ex ex-love" fill="#D9C7FF" filter="' + u("gl") + '"><path d="M55.5 69l-6.4-6.2a3.7 3.7 0 0 1 6.4-4.3 3.7 3.7 0 0 1 6.4 4.3z"/><path d="M84.5 69l-6.4-6.2a3.7 3.7 0 0 1 6.4-4.3 3.7 3.7 0 0 1 6.4 4.3z"/></g>' +
      '<ellipse cx="44.5" cy="77" rx="4.6" ry="2.5" fill="#B794FF" opacity=".42"/><ellipse cx="95.5" cy="77" rx="4.6" ry="2.5" fill="#B794FF" opacity=".42"/>' +
      '<path class="mouth" d="M65 78.5q5 4 10 0" stroke="#D2C1FF" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<ellipse class="mouth-o" cx="70" cy="79.5" rx="3.6" ry="3" fill="#D2C1FF"/>' +
      '</g></g></g></g></svg>';
  }
  function sparkle(host, n) {
    if (calm()) return;
    for (var i = 0; i < (n || 7); i++) {
      var s = document.createElement("span"), a = -Math.PI / 2 + (Math.random() - .5) * 2.4, d = 38 + Math.random() * 46;
      s.className = "spark" + (i % 3 ? "" : " spark--w");
      s.style.setProperty("--tx", (Math.cos(a) * d).toFixed(1) + "px"); s.style.setProperty("--ty", (Math.sin(a) * d).toFixed(1) + "px");
      s.style.setProperty("--sz", (6 + Math.random() * 8).toFixed(1) + "px"); s.style.animationDelay = (i * 25) + "ms";
      host.appendChild(s); setTimeout(function (el) { el.remove(); }.bind(null, s), 1100);
    }
  }
  function react(svg, m) {
    svg.classList.remove("is-boing", "ex-happy", "ex-wow", "ex-love", "ex-wink"); void svg.getBoundingClientRect();
    svg.classList.add("is-boing", "ex-" + m);
    clearTimeout(svg._t); svg._t = setTimeout(function () { svg.classList.remove("ex-" + m, "is-boing"); }, 1800);
  }

  var Vip = (function () {
    var root = $("#vip"), fig = $("#vipFig"), panel = $("#vipPanel");
    if (!root || !fig || !panel) return { mood: function () {}, hide: function () {}, open: function () {} };
    var met = false; try { met = !!sessionStorage.getItem("vd-vip-met"); } catch (e) {}
    fig.innerHTML = vipSVG() + (met ? "" : '<span class="vip__dot" aria-hidden="true"></span>') + '<span class="vip__hint" aria-hidden="true">Tap to ask VIP</span>';
    var svg = $("svg", fig), eyes = $(".eyes", svg), head = $(".head", svg);
    var st = { x: 20, y: innerHeight - 20, s: 1, drag: false, free: false, fx: 0, fy: 0, gx: 0, gy: 0, moved: false };
    var anchor = $("#vipAnchor"), moodT = null;

    function target() {
      var dock = { x: 16, y: innerHeight - 14, s: 1 };
      if (!anchor || innerWidth < 1040) return dock;
      var r = anchor.getBoundingClientRect(), t = ease(clamp(scrollY / (innerHeight * .5), 0, 1));
      return { x: lerp(r.left, dock.x, t), y: lerp(r.top, dock.y, t), s: lerp(1.5, 1, t) };
    }
    function apply() {
      root.style.setProperty("--x", st.x.toFixed(1) + "px"); root.style.setProperty("--y", st.y.toFixed(1) + "px"); root.style.setProperty("--s", st.s.toFixed(3));
      if (open) clampPanel();
    }
    function place() {
      if (st.drag) return;
      var t = target();
      if (st.free) {
        st.x = lerp(st.x, t.x, .14); st.y = lerp(st.y, t.y, .14); st.s = lerp(st.s, t.s, .14);
        if (Math.abs(st.x - t.x) < .5 && Math.abs(st.y - t.y) < .5) st.free = false;
        requestAnimationFrame(place);
      } else { st.x = t.x; st.y = t.y; st.s = t.s; }
      apply();
    }
    function mood(m, ms) {
      svg.classList.remove("ex-happy", "ex-wow", "ex-love", "ex-wink"); clearTimeout(moodT);
      if (m) { svg.classList.add("ex-" + m); moodT = setTimeout(function () { svg.classList.remove("ex-" + m); }, ms || 2200); }
    }
    function wave() { svg.classList.remove("is-wave"); void svg.getBoundingClientRect(); svg.classList.add("is-wave"); setTimeout(function () { svg.classList.remove("is-wave"); }, 2100); }

    /* ---- chat panel ---- */
    var log = $("#vpLog"), chipsEl = $("#vpChips"), open = false, greeted = false, lastCtx = null, chain = Promise.resolve();
    var QA = [
      ["What do you do?", "We design and build websites for local businesses and creators. Made for phones first, WhatsApp built in, and set up to show on Google.", ""],
      ["How much does it cost?", "It depends on the pages and features you need. Send us a quick message and you'll get a clear price before any work starts.", '<a class="vm__link" href="' + waLink("Hi Vipra Digital! Can you share the price for a website?") + '" target="_blank" rel="noopener">Ask the price on WhatsApp</a>'],
      ["How long does it take?", "It depends on the size of the site. You get the timeline together with the price, so you know your launch date before we start.", ""],
      ["I'm not technical. Is that OK?", "Totally fine. Talk to us in Hindi or English, by text or voice note. We handle everything technical and explain it simply.", ""],
      ["Show me your work", "We're a young studio, so we made six concept websites for real kinds of local businesses. Take a look.", '<a class="vm__link" href="work.html">See the six concepts</a>']
    ];
    QA.forEach(function (q, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "vp__chip"; b.textContent = q[0];
      b.addEventListener("click", function () { ask(i); }); chipsEl.appendChild(b);
    });
    function scrollLog() { if (open) clampPanel(); log.scrollTop = log.scrollHeight; }
    function bubble(cls, text) { var d = document.createElement("div"); d.className = "vm " + cls; if (text) d.textContent = text; log.appendChild(d); scrollLog(); return d; }
    function reply(text, extra) {
      chain = chain.then(function () {
        return new Promise(function (res) {
          var t = bubble("vm--typing", ""); t.innerHTML = "<i></i><i></i><i></i>";
          svg.classList.add("is-talk");
          setTimeout(function () {
            t.remove();
            var m = bubble("vm--vip", ""), txt = document.createElement("span"); m.appendChild(txt);
            var done = function () { txt.textContent = text; if (extra) { var w = document.createElement("div"); w.innerHTML = extra; m.appendChild(w.firstChild); } svg.classList.remove("is-talk"); scrollLog(); res(); };
            if (calm()) return done();
            var i = 0, iv = setInterval(function () {
              i += 3; txt.textContent = text.slice(0, i); if (i % 9 === 0) Sound.chirp(); scrollLog();
              if (i >= text.length) { clearInterval(iv); done(); }
            }, 18);
          }, calm() ? 120 : 520 + Math.random() * 300);
        });
      });
    }
    function ask(i) { var q = QA[i]; Sound.tick(); chain = chain.then(function () { bubble("vm--me", q[0]); mood(i === 4 ? "wink" : "happy", 2000); }); reply(q[1], q[2]); }
    function ctxSection() {
      var best = null, mid = innerHeight * .5;
      $$("[data-vip]").forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid && el.getAttribute("data-vip")) best = el; });
      return best;
    }
    function clampPanel() {
      panel.style.setProperty("--pdx", "0px"); panel.style.setProperty("--pdy", "0px"); panel.style.maxHeight = "";
      var top = 80, r = panel.getBoundingClientRect(), avail = r.bottom - top;
      if (avail < r.height) { panel.style.maxHeight = Math.max(280, avail).toFixed(0) + "px"; r = panel.getBoundingClientRect(); }
      var dx = 0, dy = 0;
      if (r.right > innerWidth - 12) dx = innerWidth - 12 - r.right;
      if (r.left + dx < 12) dx = 12 - r.left;
      if (r.top < top) dy = top - r.top;
      if (r.bottom + dy > innerHeight - 8) dy = innerHeight - 8 - r.bottom;
      panel.style.setProperty("--pdx", dx.toFixed(0) + "px"); panel.style.setProperty("--pdy", dy.toFixed(0) + "px");
    }
    function setOpen(v) {
      open = v; panel.classList.toggle("is-open", v); root.classList.toggle("is-open", v);
      fig.setAttribute("aria-expanded", v ? "true" : "false");
      if (v) panel.removeAttribute("inert"); else panel.setAttribute("inert", "");
      if (v) {
        clampPanel();
        if (!met) { met = true; try { sessionStorage.setItem("vd-vip-met", "1"); } catch (e) {} var dot = $(".vip__dot", fig); if (dot) dot.remove(); }
        var ctx = ctxSection(), line = ctx && ctx.getAttribute("data-vip");
        if (!greeted) { greeted = true; reply("Hi! I'm VIP, your guide here. Tap a question below, or ask a real human on WhatsApp."); if (line) reply(line); lastCtx = ctx; }
        else if (ctx && ctx !== lastCtx && line) { lastCtx = ctx; reply(line); }
      }
    }
    function touch() { react(svg, open ? "wink" : "happy"); sparkle(fig, 7); Sound.pop(); if (!open) wave(); setOpen(!open); }
    $("#vpX").addEventListener("click", function () { setOpen(false); Sound.tick(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) { setOpen(false); fig.focus(); } });
    document.addEventListener("pointerdown", function (e) { if (open && !panel.contains(e.target) && !fig.contains(e.target)) setOpen(false); });

    /* ---- drag + tap ---- */
    fig.addEventListener("pointerdown", function (e) {
      st.drag = true; st.moved = false; st.gx = e.clientX; st.gy = e.clientY; st.fx = e.clientX - st.x; st.fy = e.clientY - st.y;
      try { fig.setPointerCapture(e.pointerId); } catch (err) {}
    });
    fig.addEventListener("pointermove", function (e) {
      if (!st.drag) return;
      if (!st.moved && Math.hypot(e.clientX - st.gx, e.clientY - st.gy) > 6) { st.moved = true; root.classList.add("is-drag"); mood("wow", 99999); }
      if (st.moved) { st.x = e.clientX - st.fx; st.y = e.clientY - st.fy; st.s = lerp(st.s, 1.08, .2); apply(); }
    });
    function up() {
      if (!st.drag) return; st.drag = false;
      if (st.moved) { root.classList.remove("is-drag"); mood("happy"); st.free = true; requestAnimationFrame(place); Sound.pop(); }
      else touch();
    }
    fig.addEventListener("pointerup", up); fig.addEventListener("pointercancel", up);
    fig.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); touch(); if (open) setTimeout(function () { var c = $(".vp__chip", panel); if (c) c.focus(); }, 60); } });

    /* ---- alive: eyes and head follow the pointer, blink, glance around ---- */
    var look = function (x, y) {
      var r = fig.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .35;
      var nx = clamp((x - cx) / 160, -1, 1), ny = clamp((y - cy) / 160, -1, 1);
      eyes.style.transform = "translate(" + (nx * 4).toFixed(2) + "px," + (ny * 2.6).toFixed(2) + "px)";
      head.style.transform = "rotate(" + (nx * 5).toFixed(2) + "deg)";
    };
    var lastMove = performance.now();
    window.addEventListener("pointermove", function (e) { lastMove = performance.now(); look(e.clientX, e.clientY); }, { passive: true });
    setInterval(function () { if (performance.now() - lastMove > 4000 && !calm()) { var r = fig.getBoundingClientRect(); look(r.left + (Math.random() - .5) * 600, r.top + (Math.random() - .5) * 300); } }, 2600);
    (function blink() { setTimeout(function () { svg.classList.add("is-blink"); setTimeout(function () { svg.classList.remove("is-blink"); blink(); }, 120); }, 2200 + Math.random() * 3800); })();

    window.addEventListener("scroll", function () { if (!st.free) requestAnimationFrame(place); }, { passive: true });
    window.addEventListener("resize", function () { requestAnimationFrame(place); });
    place();
    return { mood: mood, wave: wave, hide: function () {}, open: function () { if (!open) touch(); } };
  })();

  /* ================= SHUTTER: loader + page transitions ================= */
  var mode = html.getAttribute("data-load") || "quick";
  var opened = false;
  function afterOpen() {
    try { sessionStorage.setItem("vd-seen", "1"); } catch (e) {}
    var neon = $("#heroNeon");
    if (neon && !calm()) { neon.classList.add("is-flicker"); Sound.buzz(); }
    html.classList.add("intro-done");
    var hg = $(".hang"); if (hg && !calm()) setTimeout(function () { hg.classList.add("is-flicker"); Sound.buzz(); }, 700);
  }
  function openShutter(fast) {
    if (opened) return; opened = true;
    html.classList.toggle("fast", !!fast);
    html.classList.remove("shutter-closing");
    html.classList.add("shutter-open");
    Sound.shutter(true, fast ? .6 : 1);
    setTimeout(function () { html.classList.add("shutter-gone"); afterOpen(); }, calm() ? 50 : (fast ? 640 : 1020));
  }
  if (mode === "first" && !calm()) {
    var cEl = $("#shCount"), t0 = performance.now(), D = 1900;
    (function count(now) {
      if (opened) return;
      var p = clamp((now - t0) / D, 0, 1), v = Math.round(ease(p) * 100);
      if (cEl) cEl.textContent = ("00" + v).slice(-3);
      if (p < 1) requestAnimationFrame(count); else setTimeout(function () { openShutter(false); }, 220);
    })(t0);
    var bS = $("#shSound"), bQ = $("#shQuiet");
    if (bS) bS.addEventListener("click", function () { Sound.set(true); openShutter(false); });
    if (bQ) bQ.addEventListener("click", function () { openShutter(false); });
  } else {
    setTimeout(function () { openShutter(true); }, mode === "nav" ? 140 : 60);
  }
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { html.classList.remove("shutter-closing"); html.classList.add("shutter-open", "shutter-gone"); }
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
    var href = a.getAttribute("href");
    if (!/^[\w-]+\.html(#[\w-]*)?$/.test(href)) return;
    e.preventDefault();
    try { sessionStorage.setItem("vd-nav", "1"); } catch (err) {}
    if (calm()) { location.href = href; return; }
    html.classList.remove("shutter-gone"); void html.offsetHeight;
    html.classList.add("shutter-closing"); html.classList.remove("shutter-open");
    Sound.shutter(false, .45);
    setTimeout(function () { location.href = href; }, 480);
  });

  /* ================= toggles ================= */
  var tSound = $("#tSound"), tTheme = $("#tTheme"), tEasy = $("#tEasy");
  if (tSound) {
    tSound.setAttribute("aria-pressed", Sound.want ? "true" : "false");
    tSound.addEventListener("click", function () { Sound.set(!Sound.want); if (Sound.want) Vip.mood("happy", 1600); });
  }
  function isDark() { var t = html.getAttribute("data-theme"); return t ? t === "dark" : !(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches); }
  if (tTheme) tTheme.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    html.setAttribute("data-theme", next); store.set("vd-theme", next); Sound.sw();
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute("content", next === "dark" ? "#0A0910" : "#F4F3F7");
    Vip.mood("love", 1400);
    document.dispatchEvent(new Event("vd-theme"));
  });
  if (tEasy) {
    tEasy.setAttribute("aria-pressed", html.classList.contains("easy") ? "true" : "false");
    tEasy.addEventListener("click", function () {
      var on = !html.classList.contains("easy");
      html.classList.toggle("easy", on); store.set("vd-easy", on ? "1" : "0"); tEasy.setAttribute("aria-pressed", on ? "true" : "false"); Sound.sw();
      Vip.mood("happy", 1400);
      document.dispatchEvent(new Event("vd-easy"));
      revealAll();
    });
  }

  /* ================= nav + menu ================= */
  var nav = $("#nav");
  var onScrollNav = function () { if (nav) nav.classList.toggle("is-scrolled", scrollY > 8); };
  window.addEventListener("scroll", onScrollNav, { passive: true }); onScrollNav();
  var menu = $("#menu"), tMenu = $("#tMenu");
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle("is-open", open); tMenu.setAttribute("aria-expanded", open ? "true" : "false");
    tMenu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) menu.removeAttribute("inert"); else menu.setAttribute("inert", "");
    document.body.style.overflow = open ? "hidden" : "";
    if (window.__lenis) window.__lenis[open ? "stop" : "start"]();
    Sound.shutter(!open, .4);
  }
  if (tMenu) tMenu.addEventListener("click", function () { setMenu(!menu.classList.contains("is-open")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu && menu.classList.contains("is-open")) setMenu(false); });

  /* ================= reveal + split text ================= */
  $$(".split").forEach(function (el) {
    var i = 0, nodes = Array.prototype.slice.call(el.childNodes); el.textContent = "";
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(" ")); return; }
          var o = document.createElement("span"), s = document.createElement("span");
          o.className = "w"; s.textContent = w; s.style.setProperty("--i", i++); o.appendChild(s); el.appendChild(o);
        });
      } else if (n.nodeName === "BR") el.appendChild(n);
      else {
        var o2 = document.createElement("span"), s2 = document.createElement("span");
        o2.className = "w" + (n.classList && n.classList.contains("neon") ? " w--open" : ""); s2.style.setProperty("--i", i++);
        s2.appendChild(n); o2.appendChild(s2); el.appendChild(o2);
      }
    });
  });
  var revealEls = $$(".pre, .split, .reveal-word");
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove("is-hidden"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" }) : null;
  function revealAll() { revealEls.forEach(function (el) { el.classList.remove("is-hidden"); }); }
  if (io && !calm()) {
    revealEls.forEach(function (el) {
      if (el.getBoundingClientRect().top > innerHeight * .95) { el.classList.add("is-hidden"); io.observe(el); }
    });
  }

  /* ================= micro-interactions ================= */
  if (finePointer) {
    $$(".magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        if (calm()) return;
        var r = el.getBoundingClientRect(), mx = (e.clientX - r.left - r.width / 2) * .18, my = (e.clientY - r.top - r.height / 2) * .25;
        el.style.setProperty("--mx", clamp(mx, -10, 10).toFixed(1) + "px"); el.style.setProperty("--my", clamp(my, -8, 8).toFixed(1) + "px");
      });
      el.addEventListener("pointerleave", function () { el.style.setProperty("--mx", "0px"); el.style.setProperty("--my", "0px"); });
    });
    var lastTick = 0;
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest && e.target.closest(".btn, .tool, .nav__links a, .chips span, .bigwa, .fab, summary");
      if (t && !t.contains(e.relatedTarget) && performance.now() - lastTick > 70) { lastTick = performance.now(); Sound.tick(); }
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".bigwa, .fab, [href*='wa.me']");
    if (b) { Sound.bell(); Vip.mood("love", 2500); }
    else if (e.target.closest && e.target.closest(".btn, .chips label, summary")) Sound.pop();
  });
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-copy"), done = function () { b.textContent = "Copied"; b.classList.add("is-done"); setTimeout(function () { b.textContent = "Copy"; b.classList.remove("is-done"); }, 1800); };
      var fallback = function () { var r = document.createRange(); r.selectNodeContents(b.parentNode.firstChild); var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Selected"; setTimeout(function () { b.textContent = "Copy"; }, 1800); };
      try { navigator.clipboard.writeText(v).then(done, fallback); } catch (err) { fallback(); }
    });
  });
  // floating WhatsApp hides while a big WhatsApp button is on screen
  var fab = $("#fab");
  if (fab && "IntersectionObserver" in window) {
    var vis = new Set();
    var fio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) vis.add(e.target); else vis.delete(e.target); }); fab.classList.toggle("is-hidden", vis.size > 0); });
    $$(".bigwa, .hero__ctas").forEach(function (el) { fio.observe(el); });
  }
  // concept cards scroll themselves on touch screens
  if (!finePointer && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle("is-play", e.isIntersecting && !calm()); }); }, { threshold: .7 });
    $$(".concept").forEach(function (c) { cio.observe(c); });
  }

  /* ================= IST clock + 24h dial ================= */
  var fmt = function (opt) { try { return new Intl.DateTimeFormat("en-IN", Object.assign({ timeZone: "Asia/Kolkata" }, opt)).format(new Date()); } catch (e) { return ""; } };
  function istParts() {
    try { var p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()); var h = 0, m = 0; p.forEach(function (x) { if (x.type === "hour") h = +x.value % 24; if (x.type === "minute") m = +x.value; }); return { h: h, m: m }; }
    catch (e) { var d = new Date(); return { h: d.getHours(), m: d.getMinutes() }; }
  }
  var dial = $("#dial");
  if (dial) {
    var NS = "http://www.w3.org/2000/svg", mk = function (tag, at) { var el = document.createElementNS(NS, tag); for (var k in at) el.setAttribute(k, at[k]); return el; };
    dial.appendChild(mk("circle", { cx: 200, cy: 200, r: 186, class: "ring" }));
    for (var h = 0; h < 24; h++) {
      var a = h / 24 * Math.PI * 2 - Math.PI / 2, major = h % 6 === 0, r1 = major ? 172 : 178;
      dial.appendChild(mk("line", { x1: 200 + Math.cos(a) * r1, y1: 200 + Math.sin(a) * r1, x2: 200 + Math.cos(a) * 186, y2: 200 + Math.sin(a) * 186, class: "tick" + (major ? " major" : ""), "stroke-width": major ? 2 : 1 }));
      if (major) { var tx = mk("text", { x: 200 + Math.cos(a) * 156, y: 200 + Math.sin(a) * 156 + 4.5, "text-anchor": "middle" }); tx.textContent = ("0" + h).slice(-2); dial.appendChild(tx); }
    }
    var defs = mk("defs", {}), path = mk("path", { id: "orbitPath", d: "M200,200 m-134,0 a134,134 0 1,1 268,0 a134,134 0 1,1 -268,0" });
    defs.appendChild(path); dial.appendChild(defs);
    var og = mk("g", { class: "orbit" }), ot = mk("text", {}), tp = mk("textPath", { href: "#orbitPath" });
    tp.textContent = "OPEN 24 HOURS · 7 DAYS A WEEK · 365 DAYS A YEAR · OPEN 24 HOURS · 7 DAYS A WEEK · ";
    ot.appendChild(tp); og.appendChild(ot); dial.appendChild(og);
    var arc = mk("path", { class: "arc" }), dot = mk("circle", { r: 7, class: "now" });
    dial.appendChild(arc); dial.appendChild(dot);
  }
  function tickClock() {
    var t = fmt({ hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?([ap])\.?m\.?/i, function (m, x) { return " " + x.toUpperCase() + "M"; });
    $$("[data-ist]").forEach(function (el) { el.textContent = t; });
    if (dial) {
      var p = istParts(), f = (p.h + p.m / 60) / 24, a = f * Math.PI * 2 - Math.PI / 2;
      var x = 200 + Math.cos(a) * 186, y = 200 + Math.sin(a) * 186;
      $(".now", dial).setAttribute("cx", x.toFixed(1)); $(".now", dial).setAttribute("cy", y.toFixed(1));
      $(".arc", dial).setAttribute("d", "M200 14 A186 186 0 " + (f > .5 ? 1 : 0) + " 1 " + x.toFixed(1) + " " + y.toFixed(1));
    }
  }
  tickClock(); setInterval(tickClock, 20000);

  /* ================= 3D logo (hero) ================= */
  (function mark3D() {
    var canvas = $("#mark3d"), src = $(".mark-fallback path");
    if (!canvas || !src || !window.THREE) return;
    var T = window.THREE, renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); } catch (e) { return; }
    html.classList.add("has-3d");
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 10, 6000); cam.position.set(0, 0, 1320);
    // parse the traced logo path (M/L/C/Z, absolute) into shapes
    var shapes = [], sh = null, d = src.getAttribute("d"), re = /([MLCZ])([^MLCZ]*)/g, m;
    while ((m = re.exec(d))) {
      var n = (m[2].match(/-?\d*\.?\d+/g) || []).map(Number);
      if (m[1] === "M") { sh = new T.Shape(); shapes.push(sh); sh.moveTo(n[0], -n[1]); }
      else if (m[1] === "L") sh.lineTo(n[0], -n[1]);
      else if (m[1] === "C") for (var i = 0; i + 5 < n.length + 1; i += 6) sh.bezierCurveTo(n[i], -n[i + 1], n[i + 2], -n[i + 3], n[i + 4], -n[i + 5]);
    }
    var geo = new T.ExtrudeGeometry(shapes, { depth: 64, bevelEnabled: true, bevelThickness: 9, bevelSize: 6, bevelSegments: 6, curveSegments: 24 });
    geo.center();
    try {
      var pm = new T.PMREMGenerator(renderer), env = new T.Scene();
      env.add(new T.Mesh(new T.BoxGeometry(10, 10, 10), new T.MeshBasicMaterial({ color: 0x07060b, side: T.BackSide })));
      [[0xffffff, 0, 4.6, 1.5, 7, 1.1], [0xb49bff, -4.6, .5, 1, 1.1, 5], [0x7a4dff, 4.6, 1, -1, 1.2, 4.5], [0xffffff, 2.2, -1.2, 4.8, 2.4, .8]].forEach(function (L) {
        var m = new T.Mesh(new T.PlaneGeometry(L[4], L[5]), new T.MeshBasicMaterial({ color: L[0], side: T.DoubleSide }));
        m.position.set(L[1], L[2], L[3]); m.lookAt(0, 0, 0); env.add(m);
      });
      scene.environment = pm.fromScene(env, .02).texture;
    } catch (e) {}
    var cap = new T.MeshPhysicalMaterial({ color: 0x07060c, metalness: .7, roughness: .2, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.1 });
    var side = new T.MeshStandardMaterial({ color: 0x8a5cff, emissive: 0x5b2ee0, emissiveIntensity: .75, metalness: .45, roughness: .26, envMapIntensity: 1 });
    var mesh = new T.Mesh(geo, [cap, side]);
    var group = new T.Group(); group.add(mesh); scene.add(group);
    scene.add(new T.AmbientLight(0xffffff, .35));
    var key = new T.DirectionalLight(0xffffff, .9); key.position.set(300, 500, 900); scene.add(key);
    var p1 = new T.PointLight(0xb49bff, 2.4, 0); scene.add(p1);
    var p2 = new T.PointLight(0xffffff, .9, 0); p2.position.set(-700, -300, 300); scene.add(p2);
    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    size(); window.addEventListener("resize", size);
    var px = 0, py = 0, spin = 0, spinV = 0, running = false, visible = true;
    window.addEventListener("pointermove", function (e) { px = e.clientX / innerWidth * 2 - 1; py = e.clientY / innerHeight * 2 - 1; }, { passive: true });
    var stage = $(".hero__stage");
    if (stage) stage.addEventListener("click", function () { spinV += .28; Sound.pop(); Vip.mood("wow", 1400); });
    function frame(t) {
      if (!visible || html.classList.contains("easy")) { running = false; return; }
      var s = t / 1000;
      spin += spinV; spinV *= .94;
      var reduce = html.classList.contains("reduce");
      group.rotation.y = lerp(group.rotation.y, (reduce ? 0 : Math.sin(s * .5) * .38) + px * .45 + spin + scrollY * .0012, .08);
      group.rotation.x = lerp(group.rotation.x, py * .22 + (reduce ? 0 : Math.sin(s * .7) * .06), .08);
      group.position.y = reduce ? 0 : Math.sin(s * 1.1) * 10;
      p1.position.set(Math.cos(s * .8) * 700, Math.sin(s * .6) * 360, 520);
      renderer.render(scene, cam);
      requestAnimationFrame(frame);
    }
    function start() { if (!running && visible && !html.classList.contains("easy")) { running = true; requestAnimationFrame(frame); } }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; start(); }).observe(canvas);
    document.addEventListener("vd-easy", start);
    start();
  })();

  /* ================= night story (scroll-scrubbed) ================= */
  (function story() {
    var track = $("#storyTrack"); if (!track) return;
    var caps = $$(".cap"), scrs = $$(".scr"), dots = $$(".story__dots b");
    var roll = $("#roll"), sky = $("#sky"), dawn = $("#dawnSky"), stars = $("#stars"), moon = $("#moon"), sun = $("#sun");
    var cone = $("#lampCone"), bulb = $("#bulb"), signN = $("#signNeon"), signT = $("#signText"), winLit = $("#winLit"), wins = $$(".scene .win");
    var cT = $("#clockT"), cA = $("#clockAp"), cD = $("#clockDay"), lockT = $("#lockT"), srT = $("#srT"), q = $("#query");
    var b1 = $("#bub1"), b2 = $("#bub2"), site = $(".scr--site");
    var Q = "cake shop near me", skies = ["#1A1238", "#120D2A", "#0D0A21", "#0A0819", "#0A0819"];
    var last = { i: -1, sign: true, closed: false, pinned: false };
    var spans = [[0, 30], [47, 49], [75, 75], [76, 77], [77, 720]];
    function clock(min) {
      var tot = (21 * 60 + Math.round(min)) % 1440, h = Math.floor(tot / 60), mm = tot % 60, ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12;
      return { t: h12 + ":" + ("0" + mm).slice(-2), ap: ap, day: min > 180 ? "TUE" : "MON" };
    }
    function hex(a) { return [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)]; }
    function mix(a, b, t) { var A = hex(a), B = hex(b); return "rgb(" + A.map(function (v, i) { return Math.round(lerp(v, B[i], t)); }).join(",") + ")"; }
    function render() {
      var r = track.getBoundingClientRect(), total = track.offsetHeight - innerHeight;
      var pinned = r.top <= 0 && r.bottom >= innerHeight;
      if (pinned && !last.pinned) Vip.hide();
      last.pinned = pinned;
      var p = clamp(-r.top / Math.max(1, total), 0, 1), seg = p * 5, i = Math.min(4, Math.floor(seg)), lp = i === 4 && p >= 1 ? 1 : seg - i;
      // clock: in the last step the night fast-forwards, then holds at 9:00 AM
      var sp = spans[i], k = i === 4 ? Math.pow(clamp(lp / .5, 0, 1), 1.6) : lp, c = clock(lerp(sp[0], sp[1], k));
      cT.textContent = c.t; cA.textContent = c.ap; cD.textContent = c.day;
      if (lockT && i === 0) lockT.textContent = c.t; if (srT && i === 1) srT.textContent = c.t;
      // shutter
      var y = i === 0 ? lerp(-164, 0, ease(clamp(lp / .6, 0, 1))) : i === 4 ? lerp(0, -164, ease(clamp((lp - .55) / .35, 0, 1))) : 0;
      roll.setAttribute("transform", "translate(0," + y.toFixed(1) + ")");
      var closed = y > -2;
      if (closed !== last.closed) { if (last.i !== -1) Sound.clack(); last.closed = closed; }
      // sky, light, sign
      var dw = i === 4 ? clamp((lp - .25) / .4, 0, 1) : 0;
      sky.style.fill = i < 4 ? mix(skies[i], skies[Math.min(4, i + 1)], lp) : skies[4];
      dawn.setAttribute("opacity", dw.toFixed(3)); stars.style.opacity = 1 - dw; moon.setAttribute("opacity", 1 - dw);
      sun.setAttribute("opacity", dw); sun.setAttribute("cy", lerp(170, 96, dw).toFixed(1));
      cone.style.opacity = 1 - dw; bulb.setAttribute("opacity", 1 - dw);
      winLit.setAttribute("opacity", i < 2 ? .85 : i === 4 ? (.85 * dw).toFixed(2) : 0);
      wins.forEach(function (w, j) { w.setAttribute("opacity", i >= 2 && i < 4 ? (j ? 0 : .3) : .5); });
      var sign = i === 0 ? lp < .72 : i === 4 ? lp > .6 : false;
      signN.style.opacity = sign ? 1 : .08; signT.setAttribute("fill", sign ? "#F1EAFF" : "#3A3450"); signT.setAttribute("filter", sign ? "url(#glow)" : "");
      if (sign !== last.sign) { if (sign) Sound.buzz(); last.sign = sign; }
      // phone + captions
      if (i !== last.i) {
        caps.forEach(function (el, j) { el.classList.toggle("is-on", j === i); });
        scrs.forEach(function (el, j) { el.classList.toggle("is-on", j === i); });
        if (last.i !== -1) Sound.tick();
        last.i = i;
      }
      dots.forEach(function (d, j) { d.style.setProperty("--f", j < i ? 1 : j === i ? lp.toFixed(3) : 0); });
      if (q) q.textContent = i > 1 ? Q : i === 1 ? Q.slice(0, Math.round(clamp(lp / .55, 0, 1) * Q.length)) : "";
      if (site) site.classList.toggle("tap", i === 2 && lp > .7);
      if (b1) b1.classList.toggle("is-in", i > 3 || (i === 3 && lp > .08));
      if (b2) b2.classList.toggle("is-in", i > 3 || (i === 3 && lp > .45));
    }
    var queued = false;
    window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; render(); }); } }, { passive: true });
    window.addEventListener("resize", render);
    render();
  })();

  /* ================= about: big VIP ================= */
  (function meet() {
    var art = $("#meetArt"); if (!art) return;
    art.innerHTML = vipSVG();
    var s = $("svg", art), n = 0, moods = ["happy", "love", "wow", "wink"];
    art.style.cursor = "pointer"; art.setAttribute("role", "button"); art.setAttribute("tabindex", "0"); art.setAttribute("aria-label", "VIP. Press to say hi.");
    var poke = function () { react(s, moods[n++ % 4]); sparkle(art, 12); s.classList.remove("is-wave"); void s.getBoundingClientRect(); s.classList.add("is-wave"); Sound.pop(); Vip.open(); };
    art.addEventListener("click", poke);
    art.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); poke(); } });
    setInterval(function () { s.classList.add("is-blink"); setTimeout(function () { s.classList.remove("is-blink"); }, 120); }, 3800);
  })();

  /* ================= premium layer ================= */
  (function smooth() {
    if (!window.Lenis || !finePointer) return;
    var lenis = null;
    function on() {
      if (lenis || calm()) return;
      try { lenis = new window.Lenis({ lerp: .11, wheelMultiplier: .95 }); } catch (e) { lenis = null; return; }
      (function raf(t) { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }
    function off() { if (lenis) { lenis.destroy(); lenis = null; } }
    on();
    document.addEventListener("vd-easy", function () { if (calm()) off(); else on(); });
    window.__lenis = { stop: function () { if (lenis) lenis.stop(); }, start: function () { if (lenis) lenis.start(); } };
  })();

  (function cursor() {
    if (!finePointer) return;
    var c = document.createElement("div"); c.className = "cursor"; c.setAttribute("aria-hidden", "true");
    c.innerHTML = '<span class="cursor__label"></span>'; document.body.appendChild(c);
    var lab = c.firstChild, x = -100, y = -100, tx = -100, ty = -100, on = false;
    window.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY; if (!on) { x = tx; y = ty; on = true; c.classList.add("is-on"); }
      var t = e.target.closest && e.target.closest("a, button, label, summary, .vip__fig, #meetArt, .concept, .hero__stage, input, textarea");
      var txt = !!t && t.matches("input, textarea");
      var l = !t ? "" : t.closest(".concept") ? "Peek" : t.closest(".hero__stage") ? "Spin" : "";
      c.classList.toggle("is-hover", !!t && !txt); c.classList.toggle("is-text", txt); c.classList.toggle("has-label", !!l); if (l) lab.textContent = l;
    }, { passive: true });
    document.addEventListener("mouseleave", function () { c.classList.remove("is-on"); on = false; });
    (function loop() { x = lerp(x, tx, .22); y = lerp(y, ty, .22); c.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)"; requestAnimationFrame(loop); })();
  })();

  if (finePointer) $$(".tile, .pkg, .step, .val, .card, .meet, .form, .quote, .slot--cta .slot__frame").forEach(function (el) {
    el.classList.add("spot");
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); el.style.setProperty("--gx", (e.clientX - r.left).toFixed(0) + "px"); el.style.setProperty("--gy", (e.clientY - r.top).toFixed(0) + "px"); });
  });

  (function heroLight() {
    var h = $(".hero"); if (!h || !finePointer) return;
    h.addEventListener("pointermove", function (e) { var r = h.getBoundingClientRect(); h.style.setProperty("--hx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%"); h.style.setProperty("--hy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%"); });
  })();

  (function hangSwing() {
    var sw = $(".hang__swing"); if (!sw) return;
    var a = 0, va = 0, lastY = scrollY;
    (function loop(t) {
      var dy = scrollY - lastY; lastY = scrollY;
      if (!calm()) { va += -dy * .012 - a * .035; va *= .93; a = clamp(a + va, -10, 10); }
      else { a = 0; va = 0; }
      var idle = calm() ? 0 : Math.sin(t / 1300) * 1.1;
      sw.style.setProperty("--swing", (a + idle).toFixed(2) + "deg");
      requestAnimationFrame(loop);
    })(performance.now());
  })();

  /* ================= contact form ================= */
  (function form() {
    var f = $("#leadForm"); if (!f) return;
    var MIN = 15000, MAX = 1000000, range = $("#budget"), inp = $("#budgetIn"), band = $("#budgetBand");
    var inr = function (v) { return Math.round(v).toLocaleString("en-IN"); };
    var toVal = function (pos) { return MIN * Math.pow(MAX / MIN, pos / 1000); };
    var toPos = function (v) { return Math.log(clamp(v, MIN, MAX) / MIN) / Math.log(MAX / MIN) * 1000; };
    var nice = function (v) { var st = v < 100000 ? 1000 : v < 500000 ? 5000 : 10000; return clamp(Math.round(v / st) * st, MIN, MAX); };
    function words(v) { if (v >= 100000) { var l = v / 100000; return (l % 1 ? l.toFixed(l < 10 ? 2 : 1).replace(/0$/, "") : l) + " lakh rupees"; } return (v / 1000) + " thousand rupees"; }
    var lastBand = "", value = 40000;
    function bandOf(v) { return v >= MAX ? "max" : v >= 300000 ? "high" : v >= 75000 ? "mid" : "low"; }
    function setVal(v, from) {
      value = nice(v);
      if (from !== "input") inp.value = inr(value);
      if (from !== "range") range.value = Math.round(toPos(value));
      range.style.setProperty("--p", (range.value / 10) + "%");
      band.textContent = words(value) + (value >= MAX ? " or more" : "");
      var b = bandOf(value);
      if (b !== lastBand) { if (lastBand) Vip.mood(b === "max" ? "love" : b === "low" ? null : "wow", 1500); lastBand = b; }
    }
    range.addEventListener("input", function () { setVal(toVal(+range.value), "range"); if (+range.value % 40 === 0) Sound.tick(); });
    inp.addEventListener("input", function () { var n = parseInt(inp.value.replace(/[^\d]/g, ""), 10); if (n) setVal(n, "input"); });
    inp.addEventListener("blur", function () { inp.value = inr(value); });
    setVal(40000);

    function val(name) { var el = f.elements[name]; if (!el) return ""; if (el.length && !el.tagName) { var c = $$('input[name="' + name + '"]:checked', f)[0]; return c ? c.value : ""; } return (el.value || "").trim(); }
    function bad(id, on) { var el = $("#" + id); if (el) el.classList.toggle("is-bad", on); return on; }
    ["name", "phone", "msg"].forEach(function (id) { var el = $("#" + id); el.addEventListener("input", function () { bad("f-" + id, false); }); });
    var done = $("#done");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = val("name"), cc = val("cc").replace(/[^\d+]/g, "") || "+91", phone = val("phone").replace(/\D/g, ""), msg = val("message");
      var errs = [];
      if (bad("f-name", name.length < 2)) errs.push("name");
      if (bad("f-phone", cc === "+91" ? phone.length !== 10 : phone.length < 6 || phone.length > 14)) errs.push("phone number");
      if (bad("f-msg", msg.length < 8)) errs.push("business details");
      if (errs.length) { var first = $(".field.is-bad input, .field.is-bad textarea", f); if (first) first.focus(); return; }
      var qs = new URLSearchParams(location.search);
      var data = {
        name: name, phone: cc + phone, business: val("business"), city: val("city"), business_type: val("type"), need: val("need"),
        budget_inr: value, budget_label: "₹" + inr(value) + (value >= MAX ? "+" : ""), timeline: val("when"), message: msg,
        page: location.pathname, referrer: document.referrer || "", utm_source: qs.get("utm_source") || "", utm_campaign: qs.get("utm_campaign") || "",
        submitted_at: new Date().toISOString(), source: "vipradigital.com contact form"
      };
      var text = "Hi Vipra Digital! I'd like a website.\n\nName: " + data.name + "\nWhatsApp: " + data.phone +
        (data.business ? "\nBusiness: " + data.business : "") + (data.city ? "\nCity: " + data.city : "") +
        (data.business_type ? "\nType: " + data.business_type : "") + "\nNeed: " + data.need + "\nBudget: " + data.budget_label +
        "\nLaunch: " + data.timeline + "\n\nAbout my business: " + data.message;
      var first = name.split(" ")[0];
      function show(received) {
        $("#doneTitle").textContent = received ? "Got it, " + first + "!" : "Almost done, " + first + "!";
        $("#doneText").textContent = received ? "Your enquiry is in. We'll message you on WhatsApp. Want a faster reply? Send it on WhatsApp too." : "Tap the button below to send these details to us on WhatsApp. That's how your enquiry reaches us.";
        $(".tag", done).textContent = received ? "Received" : "One more tap";
        $("#donePre").textContent = text; $("#doneWa").href = waLink(text);
        f.hidden = true; done.hidden = false; done.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "center" });
        Vip.mood("love", 2500); Vip.wave();
        Sound.bell();
      }
      if (VIPRA_CONFIG.webhookUrl) {
        var btn = $('button[type="submit"]', f); btn.disabled = true; btn.firstChild.textContent = "Sending… ";
        var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
        fetch(VIPRA_CONFIG.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: ctl ? ctl.signal : undefined })
          .then(function (r) { clearTimeout(to); show(r.ok); }).catch(function () { clearTimeout(to); show(false); })
          .then(function () { btn.disabled = false; btn.firstChild.textContent = "Send enquiry "; });
      } else show(false);
    });
    $("#doneBack").addEventListener("click", function () { done.hidden = true; f.hidden = false; f.scrollIntoView({ behavior: "auto", block: "start" }); });
  })();
})();
