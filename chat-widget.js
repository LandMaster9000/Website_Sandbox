/**
 * Cramers Landscaping — site chat widget
 *
 * Drop-in, no dependencies. Add one line before </body>:
 *   <script src="/chat-widget.js" data-endpoint="https://YOUR-WORKER.workers.dev" defer></script>
 *
 * Class names use the clw- prefix: the site's own page styles use cl-, and an
 * unscoped .cl-note rule here collided with the site's .cl-note.
 *
 * Everything below runs in an IIFE; nothing is added to window except the
 * element it injects.
 */
(function () {
  "use strict";

  var script = document.currentScript ||
    document.querySelector('script[src*="chat-widget"]');
  var ENDPOINT = (script && script.getAttribute("data-endpoint") || "").replace(/\/+$/, "");
  if (!ENDPOINT) {
    console.warn("[cramers-chat] data-endpoint is missing; widget not started.");
    return;
  }

  var PHONE = (script && script.getAttribute("data-phone")) || "(843) 614-9773";
  var PHONE_HREF = "tel:" + PHONE.replace(/[^\d+]/g, "");
  var GREETING =
    (script && script.getAttribute("data-greeting")) ||
    "Hi — ask me anything about landscaping, drainage, patios or plants in the Lowcountry. " +
    "If you're after a quote I can pass your details to Doug.";

  // The little nudge that pops up beside the button a couple of seconds after
  // the page loads, then fades away on its own. Set data-teaser="" on the
  // script tag to switch it off.
  var TEASER = script && script.hasAttribute("data-teaser")
    ? script.getAttribute("data-teaser")
    : "Questions about your yard? Ask me anything.";
  var TEASER_DELAY = 2500;   // wait this long after load before showing it
  var TEASER_LINGER = 9000;  // then hide it again after this long
  var TIP_KEY = "cramers-chat-tip-v1";

  var STORE_KEY = "cramers-chat-v1";
  var MAX_LEN = 1500;

  // ---------------------------------------------------------------- styles --
  var css = [
    // White disc so the logo's dark-green petals stay readable; on the brand
    // green they turn to mush.
    '.clw-fab{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:72px;height:72px;',
    'border-radius:50%;border:0;background:#fff;cursor:pointer;padding:0;',
    'box-shadow:0 8px 24px rgba(16,42,32,.28);display:grid;place-items:center;',
    'transition:transform .18s ease,box-shadow .18s ease}',
    '.clw-fab:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(16,42,32,.34)}',
    '.clw-fab:focus-visible{outline:3px solid #114327;outline-offset:3px}',
    '.clw-fab img{width:48px;height:48px;display:block;pointer-events:none}',
    '.clw-fab[hidden]{display:none}',
    '@media (max-width:520px){.clw-fab{width:64px;height:64px;right:14px;bottom:14px}',
    '.clw-fab img{width:42px;height:42px}}',

    // The opening nudge. Sits to the left of the button with a little tail
    // pointing at it.
    '.clw-tip{position:fixed;right:100px;bottom:32px;z-index:2147483000;max-width:250px;',
    'background:#fff;color:#14281f;border:1px solid #dfe6e2;border-radius:14px;',
    'padding:11px 14px;text-align:left;cursor:pointer;',
    'font:500 14px/1.45 "DM Sans",system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;',
    'box-shadow:0 10px 28px rgba(16,42,32,.20);',
    'opacity:0;transform:translateY(6px);transition:opacity .28s ease,transform .28s ease}',
    '.clw-tip.clw-tip-in{opacity:1;transform:none}',
    '.clw-tip[hidden]{display:none}',
    '.clw-tip:focus-visible{outline:3px solid #114327;outline-offset:3px}',
    '.clw-tip:after{content:"";position:absolute;right:-7px;bottom:16px;width:12px;height:12px;',
    'background:#fff;border-right:1px solid #dfe6e2;border-top:1px solid #dfe6e2;',
    'transform:rotate(45deg)}',
    '@media (max-width:520px){.clw-tip{right:88px;bottom:26px;',
    'max-width:min(210px,calc(100vw - 110px))}}',

    '.clw-panel{position:fixed;right:18px;bottom:18px;z-index:2147483001;width:380px;',
    'max-width:calc(100vw - 32px);height:560px;max-height:calc(100dvh - 36px);',
    'background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;',
    'box-shadow:0 18px 48px rgba(10,32,22,.26);',
    'font-family:"DM Sans",system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;',
    'opacity:0;transform:translateY(12px) scale(.98);transition:opacity .2s ease,transform .2s ease}',
    '.clw-panel.clw-open{opacity:1;transform:none}',
    // `hidden` alone loses to display:flex — state it explicitly or the closed
    // panel keeps swallowing clicks meant for the launcher button.
    '.clw-panel[hidden]{display:none}',
    '@media (max-width:520px){.clw-panel{right:0;bottom:0;width:100vw;max-width:100vw;',
    'height:100dvh;max-height:100dvh;border-radius:0}}',
    '@media (prefers-reduced-motion:reduce){.clw-panel,.clw-fab,.clw-tip{transition:none}}',

    '.clw-head{background:#059669;color:#fff;padding:14px 16px;display:flex;align-items:center;',
    'justify-content:space-between;gap:10px;flex:0 0 auto}',
    '.clw-head h2{margin:0;font-size:15px;font-weight:700;letter-spacing:.01em}',
    '.clw-head p{margin:2px 0 0;font-size:12px;opacity:.9}',
    '.clw-x{background:transparent;border:0;color:#fff;cursor:pointer;padding:6px;border-radius:8px;',
    'line-height:0}',
    '.clw-x:hover{background:rgba(255,255,255,.16)}',
    '.clw-x:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    '.clw-x svg{width:18px;height:18px;display:block}',

    '.clw-log{flex:1 1 auto;overflow-y:auto;padding:16px;background:#f3f6f4;',
    'display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}',
    '.clw-msg{max-width:86%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.5;',
    'white-space:pre-wrap;word-wrap:break-word}',
    '.clw-bot{align-self:flex-start;background:#fff;color:#111827;border:1px solid #e2e8f0;',
    'border-bottom-left-radius:5px}',
    '.clw-user{align-self:flex-end;background:#059669;color:#fff;border-bottom-right-radius:5px}',
    '.clw-err{align-self:flex-start;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;',
    'font-size:13.5px}',
    '.clw-msg a{color:inherit;text-decoration:underline}',

    '.clw-dots{display:inline-flex;gap:4px;align-items:center;padding:3px 0}',
    '.clw-dots i{width:6px;height:6px;border-radius:50%;background:#9ca3af;display:block;',
    'animation:clw-b 1.1s infinite ease-in-out}',
    '.clw-dots i:nth-child(2){animation-delay:.16s}.clw-dots i:nth-child(3){animation-delay:.32s}',
    '@keyframes clw-b{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.clw-dots i{animation:none}}',

    '.clw-foot{flex:0 0 auto;border-top:1px solid #e5e7eb;background:#fff;padding:10px 12px}',
    '.clw-row{display:flex;gap:8px;align-items:flex-end}',
    '.clw-in{flex:1 1 auto;resize:none;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;',
    'font:inherit;font-size:14.5px;line-height:1.4;max-height:104px;color:#111827;background:#fff}',
    '.clw-in:focus{outline:none;border-color:#059669;box-shadow:0 0 0 3px rgba(5,150,105,.16)}',
    '.clw-send{flex:0 0 auto;width:40px;height:40px;border-radius:10px;border:0;background:#059669;',
    'color:#fff;cursor:pointer;display:grid;place-items:center}',
    '.clw-send:disabled{background:#9ca3af;cursor:not-allowed}',
    '.clw-send:focus-visible{outline:3px solid #34d399;outline-offset:2px}',
    '.clw-send svg{width:18px;height:18px;display:block}',
    '.clw-note{margin:7px 2px 0;font-size:11px;color:#6b7280;text-align:center}',
    '.clw-note a{color:#047857}',

    '.clw-lead{background:#dceee5;border:1px solid #a7d7c1;border-radius:12px;padding:12px;',
    'align-self:stretch;display:grid;gap:8px}',
    '.clw-lead h3{margin:0;font-size:13.5px;color:#065f46;font-weight:700}',
    '.clw-lead input,.clw-lead textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;',
    'border-radius:8px;padding:8px 10px;font:inherit;font-size:14px;background:#fff;color:#111827}',
    '.clw-lead textarea{resize:vertical;min-height:56px}',
    '.clw-lead input:focus,.clw-lead textarea:focus{outline:none;border-color:#059669;',
    'box-shadow:0 0 0 3px rgba(5,150,105,.16)}',
    '.clw-lead button{border:0;border-radius:8px;background:#059669;color:#fff;padding:9px 12px;',
    'font:inherit;font-size:14px;font-weight:600;cursor:pointer}',
    '.clw-lead button:disabled{background:#9ca3af;cursor:not-allowed}',
    '.clw-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
  ].join("");

  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ------------------------------------------------------------------ dom --
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  // The flower from the company logo, cropped out of images\logo_no_background.png
  // and inlined so the button needs no extra request and cannot flash. Do not
  // edit this line by hand - regenerate it with `python make_flower_icon.py`.
  var FLOWER_ICON = "data:image/png;base64,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";

  var ICON_X =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICON_SEND =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>';

  var fab = el("button", "clw-fab",
    '<img src="' + FLOWER_ICON + '" alt="" width="48" height="48" aria-hidden="true">');
  fab.type = "button";
  fab.setAttribute("aria-label", "Open the landscaping chat");

  var tip = el("button", "clw-tip", esc(TEASER));
  tip.type = "button";
  tip.hidden = true;
  tip.setAttribute("aria-label", TEASER + " Open the landscaping chat.");

  var panel = el("div", "clw-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-label", "Chat with Cramers Landscaping");
  panel.hidden = true;

  var head = el("div", "clw-head");
  head.appendChild(el("div", null, "<h2>Cramers Landscaping</h2><p>Ask about your yard</p>"));
  var closeBtn = el("button", "clw-x", ICON_X);
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close chat");
  head.appendChild(closeBtn);

  var log = el("div", "clw-log");
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");
  log.setAttribute("aria-relevant", "additions text");

  var foot = el("div", "clw-foot");
  var row = el("div", "clw-row");
  var input = el("textarea", "clw-in");
  input.rows = 1;
  input.placeholder = "Type your question…";
  input.setAttribute("aria-label", "Your message");
  input.maxLength = MAX_LEN;
  var sendBtn = el("button", "clw-send", ICON_SEND);
  sendBtn.type = "button";
  sendBtn.setAttribute("aria-label", "Send message");
  row.appendChild(input);
  row.appendChild(sendBtn);
  foot.appendChild(row);
  foot.appendChild(
    el("p", "clw-note",
      'Automated assistant — it can be wrong. Chats may be reviewed to improve our answers. ' +
      'For a quote call <a href="' + PHONE_HREF + '">' + PHONE + "</a>.")
  );

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(foot);
  document.body.appendChild(fab);
  if (TEASER) document.body.appendChild(tip);
  document.body.appendChild(panel);

  // ----------------------------------------------------------------- state --
  var history = [];      // [{role:'user'|'model', text}]
  var busy = false;
  var leadShown = false;
  var lastFocus = null;

  // Random id for this browser tab's conversation, so the worker's log groups
  // the turns together. It identifies nothing about the visitor.
  var sid = "";
  function newSid() {
    var s = "";
    for (var i = 0; i < 16; i++) s += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)];
    return s;
  }

  function save() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ history: history, leadShown: leadShown, sid: sid }));
    } catch (e) { /* private mode, blocked storage — fine */ }
  }
  function load() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      return v && Array.isArray(v.history) ? v : null;
    } catch (e) { return null; }
  }
  (function () {
    var v = load();
    sid = (v && typeof v.sid === "string" && v.sid) || newSid();
  })();

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Render plain text, turning bare URLs, tel: and emails into links.
  function linkify(text) {
    var out = esc(text);
    out = out.replace(/\b(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    out = out.replace(/\b([\w.+-]+@[\w-]+\.[\w.]{2,})\b/g, '<a href="mailto:$1">$1</a>');
    out = out.replace(/(\(\d{3}\)\s?\d{3}-\d{4})/g, function (m) {
      return '<a href="tel:' + m.replace(/[^\d]/g, "") + '">' + m + "</a>";
    });
    return out;
  }

  function addMsg(role, text) {
    var cls = role === "user" ? "clw-msg clw-user" : role === "error" ? "clw-msg clw-err" : "clw-msg clw-bot";
    var node = el("div", cls);
    node.innerHTML = role === "user" ? esc(text) : linkify(text);
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function typing() {
    var n = el("div", "clw-msg clw-bot",
      '<span class="clw-dots"><i></i><i></i><i></i></span><span class="clw-sr">Typing…</span>');
    log.appendChild(n);
    log.scrollTop = log.scrollHeight;
    return n;
  }

  // ------------------------------------------------------------ lead form --
  function showLeadForm() {
    if (leadShown) return;
    leadShown = true;
    save();

    var box = el("div", "clw-lead");
    box.innerHTML =
      "<h3>Send this to Doug</h3>" +
      '<input class="clw-l-name" type="text" autocomplete="name" placeholder="Your name" aria-label="Your name">' +
      '<input class="clw-l-phone" type="tel" autocomplete="tel" placeholder="Phone number" aria-label="Phone number">' +
      '<input class="clw-l-email" type="email" autocomplete="email" placeholder="Email (optional)" aria-label="Email, optional">' +
      '<textarea class="clw-l-details" placeholder="What do you need done?" aria-label="What do you need done"></textarea>' +
      "<button type=\"button\">Send my details</button>" +
      '<p class="clw-note" style="margin:0">Goes straight to Doug. Nothing is shared elsewhere.</p>';
    log.appendChild(box);
    log.scrollTop = log.scrollHeight;

    var btn = box.querySelector("button");
    // Pre-fill the details box with the gist of what they already told us.
    var firstUser = history.filter(function (m) { return m.role === "user"; })[0];
    if (firstUser) box.querySelector(".clw-l-details").value = firstUser.text.slice(0, 400);

    btn.addEventListener("click", function () {
      var name = box.querySelector(".clw-l-name").value.trim();
      var phone = box.querySelector(".clw-l-phone").value.trim();
      if (!name || !phone) {
        box.querySelector(name ? ".clw-l-phone" : ".clw-l-name").focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = "Sending…";
      fetch(ENDPOINT + "/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          phone: phone,
          email: box.querySelector(".clw-l-email").value.trim(),
          details: box.querySelector(".clw-l-details").value.trim(),
          transcript: history.map(function (m) { return m.role + ": " + m.text; }).join("\n"),
        }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("bad status");
          box.innerHTML =
            '<h3>Got it, thanks ' + esc(name.split(" ")[0]) + "</h3>" +
            "<p style=\"margin:0;font-size:14px;color:#065f46\">Doug will be in touch. If it's urgent, " +
            'call <a href="' + PHONE_HREF + '">' + PHONE + "</a>.</p>";
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = "Try again";
          var w = box.querySelector(".clw-l-warn");
          if (!w) {
            w = el("p", "clw-note clw-l-warn");
            w.style.margin = "0";
            w.style.color = "#991b1b";
            w.innerHTML = 'That did not go through. Please call <a href="' + PHONE_HREF + '">' + PHONE + "</a>.";
            box.appendChild(w);
          }
        });
    });
  }

  // ---------------------------------------------------------------- stream --
  function send(text) {
    if (busy || !text.trim()) return;
    busy = true;
    sendBtn.disabled = true;

    addMsg("user", text);
    history.push({ role: "user", text: text });
    save();
    input.value = "";
    input.style.height = "auto";

    var dots = typing();
    var bubble = null;
    var acc = "";

    fetch(ENDPOINT + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-20), sid: sid, page: location.pathname }),
    })
      .then(function (res) {
        if (!res.ok || !res.body) {
          return res.json().catch(function () { return {}; }).then(function (j) {
            throw new Error(j.error || "Sorry — I could not reach the server just then.");
          });
        }
        var reader = res.body.getReader();
        var dec = new TextDecoder();
        var buf = "";
        var sawLead = false;

        function pump() {
          return reader.read().then(function (r) {
            if (r.done) {
              if (dots.parentNode) dots.remove();
              if (acc) {
                history.push({ role: "model", text: acc });
                save();
              }
              if (sawLead) showLeadForm();
              return;
            }
            buf += dec.decode(r.value, { stream: true });
            var lines = buf.split("\n");
            buf = lines.pop() || "";
            lines.forEach(function (line) {
              if (line.indexOf("data:") !== 0) return;
              var p = line.slice(5).trim();
              if (!p || p === "[DONE]") return;
              var obj;
              try { obj = JSON.parse(p); } catch (e) { return; }
              if (obj.error) throw new Error(obj.error);
              if (obj.lead) sawLead = true;
              // The worker's prompt-leak guard: throw away what has streamed so
              // far and show this instead.
              if (typeof obj.replace === "string") {
                if (!bubble) {
                  if (dots.parentNode) dots.remove();
                  bubble = addMsg("bot", "");
                }
                acc = obj.replace;
                sawLead = false;
                bubble.innerHTML = linkify(acc);
                log.scrollTop = log.scrollHeight;
              }
              if (obj.t) {
                if (!bubble) {
                  if (dots.parentNode) dots.remove();
                  bubble = addMsg("bot", "");
                }
                acc += obj.t;
                bubble.innerHTML = linkify(acc);
                log.scrollTop = log.scrollHeight;
              }
            });
            return pump();
          });
        }
        return pump();
      })
      .catch(function (err) {
        if (dots.parentNode) dots.remove();
        if (bubble && !acc) bubble.remove();
        addMsg("error",
          (err && err.message ? err.message : "Something went wrong.") +
          " You can always call " + PHONE + ".");
      })
      .then(function () {
        busy = false;
        sendBtn.disabled = false;
        if (!panel.hidden) input.focus();
      });
  }

  // ------------------------------------------------------------- the nudge --
  var tipTimers = [];
  function hideTip() {
    tipTimers.forEach(clearTimeout);
    tipTimers = [];
    if (tip.hidden) return;
    tip.classList.remove("clw-tip-in");
    setTimeout(function () { tip.hidden = true; }, 300);
  }
  function showTipOnce() {
    if (!TEASER) return;
    // Once per browsing session, not once per page: nobody wants it again on
    // every click through the site.
    try {
      if (sessionStorage.getItem(TIP_KEY)) return;
    } catch (e) { /* storage blocked - it will just show each page */ }
    // Somebody already mid-conversation does not need an introduction.
    var saved = load();
    if (saved && saved.history.length) return;

    tipTimers.push(setTimeout(function () {
      if (!panel.hidden) return;          // they opened the chat in the meantime
      try { sessionStorage.setItem(TIP_KEY, "1"); } catch (e) {}
      tip.hidden = false;
      var reveal = function () { tip.classList.add("clw-tip-in"); };
      requestAnimationFrame(reveal);
      setTimeout(reveal, 60);             // rAF is paused in background tabs
      tipTimers.push(setTimeout(hideTip, TEASER_LINGER));
    }, TEASER_DELAY));
  }
  showTipOnce();

  // ----------------------------------------------------------------- wire --
  function open() {
    hideTip();
    lastFocus = document.activeElement;
    panel.hidden = false;
    fab.hidden = true;
    // rAF is paused in background/occluded tabs, which left the panel open but
    // at opacity 0. The timer guarantees the class lands either way.
    var reveal = function () { panel.classList.add("clw-open"); };
    requestAnimationFrame(reveal);
    setTimeout(reveal, 60);

    if (!log.childNodes.length) {
      var saved = load();
      if (saved && saved.history.length) {
        history = saved.history;
        leadShown = !!saved.leadShown;
        history.forEach(function (m) { addMsg(m.role === "user" ? "user" : "bot", m.text); });
      } else {
        addMsg("bot", GREETING);
      }
    }
    setTimeout(function () { input.focus(); }, 60);
  }

  function close() {
    panel.classList.remove("clw-open");
    var done = function () {
      panel.hidden = true;
      fab.hidden = false;
      if (lastFocus && lastFocus.focus) lastFocus.focus(); else fab.focus();
    };
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) done();
    else setTimeout(done, 190);
  }

  fab.addEventListener("click", open);
  tip.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  sendBtn.addEventListener("click", function () { send(input.value); });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input.value);
    }
  });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 104) + "px";
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) close();
  });
})();
