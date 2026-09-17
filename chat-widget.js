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

  var STORE_KEY = "cramers-chat-v1";
  var MAX_LEN = 1500;

  // ---------------------------------------------------------------- styles --
  var css = [
    '.clw-fab{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:56px;height:56px;',
    'border-radius:50%;border:0;background:#059669;color:#fff;cursor:pointer;',
    'box-shadow:0 6px 20px rgba(6,78,59,.28);display:grid;place-items:center;',
    'transition:transform .18s ease,background .18s ease}',
    '.clw-fab:hover{background:#047857;transform:translateY(-2px)}',
    '.clw-fab:focus-visible{outline:3px solid #34d399;outline-offset:3px}',
    '.clw-fab svg{width:26px;height:26px;display:block}',
    '.clw-fab[hidden]{display:none}',

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
    '@media (prefers-reduced-motion:reduce){.clw-panel,.clw-fab{transition:none}}',

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

  var ICON_CHAT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4.2-.9L3 20.5l1.6-4.4A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"/></svg>';
  var ICON_X =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICON_SEND =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>';

  var fab = el("button", "clw-fab", ICON_CHAT);
  fab.type = "button";
  fab.setAttribute("aria-label", "Open the landscaping chat");

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
      'Automated assistant — it can be wrong. For a quote call <a href="' + PHONE_HREF + '">' +
      PHONE + "</a>.")
  );

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(foot);
  document.body.appendChild(fab);
  document.body.appendChild(panel);

  // ----------------------------------------------------------------- state --
  var history = [];      // [{role:'user'|'model', text}]
  var busy = false;
  var leadShown = false;
  var lastFocus = null;

  function save() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ history: history, leadShown: leadShown }));
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
      body: JSON.stringify({ messages: history.slice(-20) }),
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

  // ----------------------------------------------------------------- wire --
  function open() {
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
