// Bridge: ISOLATED world → relays page postMessage ↔ background CDP
// Injects window.cdp into MAIN world, handles CDP message relay

(function() {
  console.log('[CDP Bridge] Loaded on', location.origin);

  // === INJECT window.cdp into page's MAIN world ===
  function injectCDP() {
    const s = document.createElement('script');
    s.textContent = `
      (function() {
        if (window.cdp) return;

        window.cdp = {
          onmessage: null,

          send(raw) {
            // Send CDP command to content script bridge via postMessage
            window.postMessage({__cdp: true, __dir: 'send', __data: raw}, '*');
          }
        };

        // Listen for CDP responses from bridge
        window.addEventListener('message', function(e) {
          if (!e.data || !e.data.__cdp || e.data.__dir !== 'response') return;
          if (window.cdp && window.cdp.onmessage) {
            window.cdp.onmessage(e.data.__data);
          }
        });

        console.log('[CDP Bridge] window.cdp injected into page');
      })();
    `;
    (document.head || document.documentElement || document.body).appendChild(s);
    s.remove();
  }

  // Inject as soon as possible
  if (document.head || document.body) {
    injectCDP();
  } else {
    document.addEventListener('DOMContentLoaded', injectCDP);
  }
  // Extra fallback
  setTimeout(injectCDP, 100);

  // === Relay: page postMessage → background CDP ===
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.__cdp || e.data.__dir !== 'send') return;

    chrome.runtime.sendMessage(
      { cmd: 'cdpSend', data: e.data.__data },
      function(resp) {
        if (chrome.runtime.lastError) {
          console.error('[CDP Bridge]', chrome.runtime.lastError.message);
          window.postMessage({
            __cdp: true, __dir: 'response',
            __data: JSON.stringify({ error: { message: chrome.runtime.lastError.message } })
          }, '*');
          return;
        }
        window.postMessage({
          __cdp: true, __dir: 'response',
          __data: resp ? resp.data : JSON.stringify({ error: { message: 'empty response' } })
        }, '*');
      }
    );
  });

  // === Forward CDP events from background to page ===
  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg && msg.cmd === 'cdpEvent') {
      window.postMessage({
        __cdp: true, __dir: 'response',
        __data: msg.data
      }, '*');
    }
  });
})();
