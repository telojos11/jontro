// Bridge: relays page postMessage ↔ background CDP
// Does NOT inject scripts (that's done by background via scripting API)
// This avoids CSP inline-script blocking

(function() {
  // Listen for CDP commands from page's MAIN world
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.c !== 1) return;
    chrome.runtime.sendMessage({ cmd: 's', data: e.data.d }, function(r) {
      window.postMessage({ c: 2, d: r ? r.data : '{}' }, '*');
    });
  });

  // Forward CDP events from background to page
  chrome.runtime.onMessage.addListener(function(m) {
    if (m && m.cmd === 'e') {
      window.postMessage({ c: 2, d: m.data }, '*');
    }
  });
})();
