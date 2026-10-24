/* Immersive effects for erickvaldez.com.
   Network hero, scroll reveals, click bursts, cursor, card tilt,
   magnetic buttons, text scramble and page transitions.
   All motion respects prefers-reduced-motion. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var root = document.documentElement;
  root.classList.add("fx-ready");

  // ---------- page transition: arrive ----------
  var wipe = document.createElement("div");
  wipe.className = "fx-wipe";
  wipe.innerHTML = '<div><div class="msg">&gt; routing to <b></b></div><div class="bar"><span></span></div></div>';
  document.body.appendChild(wipe);
  var cameFromLink = false;
  try { cameFromLink = sessionStorage.getItem("fx-nav") === "1"; sessionStorage.removeItem("fx-nav"); } catch (e) {}
  if (cameFromLink && !reduce) {
    wipe.classList.add("enter");
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      wipe.classList.remove("enter"); wipe.classList.add("leave");
      setTimeout(function () { wipe.classList.remove("leave"); }, 700);
    }); });
  }
  window.addEventListener("pageshow", function (e) { if (e.persisted) wipe.className = "fx-wipe"; });

  // ---------- page transition: leave ----------
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || reduce || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return; // in-page anchor: let smooth scroll handle it
    e.preventDefault();
    var label = url.pathname === "/" ? "/home" : url.pathname;
    wipe.querySelector("b").textContent = label + (url.hash || "");
    wipe.classList.add("cover");
    try { sessionStorage.setItem("fx-nav", "1"); } catch (err) {}
    setTimeout(function () { location.href = url.href; }, 480);
  });

  // ---------- scroll progress ----------
  var prog = document.createElement("div");
  prog.className = "fx-progress";
  document.body.appendChild(prog);
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = "scaleX(" + (h > 0 ? Math.min(1, scrollY / h) : 0) + ")";
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // ---------- reveal on scroll ----------
  var revealSel = "section h2, section .wrap > p, section .card, section .placeholder, section .tags, section .tag, section .feature > *, section .quiz, section h3, .badges, .cta, .tagline";
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(revealSel));
  revealEls.forEach(function (el) {
    el.classList.add("reveal");
    var sibs = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    el.style.setProperty("--d", Math.min(sibs, 6) * 0.07 + "s");
  });
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else revealEls.forEach(function (el) { el.classList.add("in"); });

  // headings get their text for the glitch hover
  document.querySelectorAll("h2").forEach(function (h) { h.setAttribute("data-text", h.textContent); });

  // ---------- active nav link ----------
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('nav a.link[href^="#"]'));
  if (navLinks.length && "IntersectionObserver" in window) {
    var secIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (l) { l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (l) { var s = document.querySelector(l.getAttribute("href")); if (s) secIo.observe(s); });
  }

  // ---------- text scramble (name) + typing (eyebrow) ----------
  var GLYPHS = "!<>-_\\/[]{}=+*^?#01ABCDEF";
  function scramble(el) {
    var final = el.textContent, len = final.length, frame = 0, total = 28;
    function tick() {
      var out = "";
      for (var i = 0; i < len; i++) {
        var settleAt = (i / len) * total * 0.7 + 6;
        out += final[i] === " " ? " " : frame >= settleAt ? final[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (frame++ < total + 6) requestAnimationFrame(tick); else el.textContent = final;
    }
    tick();
  }
  function typeOut(el) {
    var text = el.textContent; el.textContent = "";
    var caret = document.createElement("span"); caret.className = "caret";
    var i = 0;
    (function step() {
      el.textContent = text.slice(0, i); el.appendChild(caret);
      if (i++ < text.length) setTimeout(step, 45 + Math.random() * 40);
    })();
  }
  if (!reduce) {
    document.querySelectorAll("header h1").forEach(scramble);
    document.querySelectorAll("header .eyebrow").forEach(typeOut);
  }

  // ---------- hero network canvas ----------
  var hero = document.querySelector("header#top, header.page-head");
  if (hero && !reduce) {
    var cv = document.createElement("canvas"); cv.id = "net";
    hero.insertBefore(cv, hero.firstChild);
    var ctx = cv.getContext("2d"), W = 0, H = 0, DPR = 1, nodes = [], packets = [], mouse = { x: -999, y: -999 }, visible = true;
    function size() {
      var r = hero.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var n = Math.max(24, Math.min(90, Math.round(W * H / 16000)));
      nodes = [];
      for (var i = 0; i < n; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: 1.2 + Math.random() * 1.8, hub: Math.random() < 0.12 });
    }
    size(); addEventListener("resize", size);
    hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener("pointerleave", function () { mouse.x = mouse.y = -999; });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(hero);
    var LINK = 130;
    function draw() {
      if (!visible || document.hidden) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        var mdx = mouse.x - n.x, mdy = mouse.y - n.y, md = Math.hypot(mdx, mdy);
        if (md < 160) { n.x -= mdx / md * 0.6; n.y -= mdy / md * 0.6; }
      }
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = "rgba(79,209,255," + (0.16 * (1 - d / LINK)).toFixed(3) + ")"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
            if (packets.length < 26 && Math.random() < 0.0009) packets.push({ a: nodes[a], b: nodes[b], t: 0, v: 0.008 + Math.random() * 0.012, c: Math.random() < 0.8 ? "79,209,255" : "167,139,250" });
          }
        }
        var mx = mouse.x - nodes[a].x, my = mouse.y - nodes[a].y, mdist = Math.hypot(mx, my);
        if (mdist < 180) {
          ctx.strokeStyle = "rgba(167,139,250," + (0.35 * (1 - mdist / 180)).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      nodes.forEach(function (n) {
        ctx.fillStyle = n.hub ? "rgba(167,139,250,0.9)" : "rgba(79,209,255,0.65)";
        ctx.beginPath(); ctx.arc(n.x, n.y, n.hub ? n.r + 1.2 : n.r, 0, Math.PI * 2); ctx.fill();
      });
      for (var p = packets.length - 1; p >= 0; p--) {
        var pk = packets[p]; pk.t += pk.v;
        if (pk.t >= 1) { packets.splice(p, 1); continue; }
        var px = pk.a.x + (pk.b.x - pk.a.x) * pk.t, py = pk.a.y + (pk.b.y - pk.a.y) * pk.t;
        ctx.fillStyle = "rgba(" + pk.c + ",1)"; ctx.shadowColor = "rgba(" + pk.c + ",1)"; ctx.shadowBlur = 10;
        ctx.fillRect(px - 2, py - 2, 4, 4); ctx.shadowBlur = 0;
      }
      requestAnimationFrame(draw);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden && visible) requestAnimationFrame(draw); });
    requestAnimationFrame(draw);
  }

  // ---------- click bursts ----------
  if (!reduce) {
    var cc = document.createElement("canvas"); cc.id = "fx-clicks"; document.body.appendChild(cc);
    var c2 = cc.getContext("2d"), parts = [], rings = [], running = false, CW = 0, CH = 0, CD = 1;
    function csize() { CD = Math.min(devicePixelRatio || 1, 2); CW = innerWidth; CH = innerHeight; cc.width = CW * CD; cc.height = CH * CD; c2.setTransform(CD, 0, 0, CD, 0, 0); }
    csize(); addEventListener("resize", csize);
    function loop() {
      c2.clearRect(0, 0, CW, CH);
      for (var i = rings.length - 1; i >= 0; i--) {
        var r = rings[i]; r.t += 0.035;
        if (r.t >= 1) { rings.splice(i, 1); continue; }
        c2.strokeStyle = "rgba(79,209,255," + (1 - r.t).toFixed(3) + ")"; c2.lineWidth = 2 * (1 - r.t) + 0.5;
        c2.beginPath(); c2.arc(r.x, r.y, 6 + r.t * 46, 0, Math.PI * 2); c2.stroke();
      }
      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j]; p.life -= 0.025; p.x += p.vx; p.y += p.vy; p.vx *= 0.93; p.vy *= 0.93;
        if (p.life <= 0) { parts.splice(j, 1); continue; }
        c2.globalAlpha = p.life; c2.fillStyle = p.c; c2.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      c2.globalAlpha = 1;
      if (parts.length || rings.length) requestAnimationFrame(loop); else running = false;
    }
    document.addEventListener("pointerdown", function (e) {
      rings.push({ x: e.clientX, y: e.clientY, t: 0 });
      for (var k = 0; k < 14; k++) {
        var ang = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4;
        parts.push({ x: e.clientX, y: e.clientY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, s: 2 + Math.random() * 2.5, c: Math.random() < 0.7 ? "#4fd1ff" : "#a78bfa" });
      }
      if (!running) { running = true; requestAnimationFrame(loop); }
    });
  }

  // ---------- custom cursor (mouse only) ----------
  if (finePointer && !reduce) {
    var dot = document.createElement("div"), ring = document.createElement("div");
    dot.className = "fx-cursor"; ring.className = "fx-cursor-ring";
    document.body.appendChild(ring); document.body.appendChild(dot);
    var tx = -100, ty = -100, rx = -100, ry = -100;
    addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; dot.style.transform = "translate(" + tx + "px," + ty + "px)"; });
    (function follow() {
      rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(follow);
    })();
    document.addEventListener("pointerover", function (e) { ring.classList.toggle("hot", !!e.target.closest("a, button, .card, .tag")); });
  }

  // ---------- card spotlight + tilt, magnetic buttons ----------
  if (finePointer && !reduce) {
    document.querySelectorAll(".card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty("--mx", x + "px"); card.style.setProperty("--my", y + "px");
        var rx = ((y / r.height) - 0.5) * -6, ry = ((x / r.width) - 0.5) * 6;
        card.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-3px)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
    document.querySelectorAll(".btn").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }
})();
