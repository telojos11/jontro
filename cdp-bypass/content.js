// Content script: bridges page JS ↔ extension CDP
// Injects window.cdp into page, relays CDP commands to background

(function() {
  'use strict';

  let bridgeReady = false;

  // Inject window.cdp into page context
  function injectCDP() {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        if (window.cdp) return; // already injected

        let _id = 0;
        const _pending = new Map();

        window.cdp = {
          onmessage: null,

          send(raw) {
            const id = ++_id;
            // Relay CDP command to content script via postMessage
            window.postMessage({ __cdp: true, __dir: 'send', __id: id, __data: raw }, '*');
            return new Promise((resolve) => {
              _pending.set(id, resolve);
            });
          }
        };

        // Listen for CDP responses from content script
        window.addEventListener('message', function(e) {
          if (!e.data || !e.data.__cdp) return;
          if (e.data.__dir === 'response') {
            const resolve = _pending.get(e.data.__id);
            if (resolve) {
              _pending.delete(e.data.__id);
              resolve(e.data.__data);
            }
            // Also trigger onmessage for async events
            if (window.cdp.onmessage && e.data.__data) {
              window.cdp.onmessage(e.data.__data);
            }
          }
        });
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  // Listen for CDP commands from page
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.__cdp || e.data.__dir !== 'send') return;

    // Forward to background script
    chrome.runtime.sendMessage({
      cmd: 'cdpSend',
      data: e.data.__data,
      id: e.data.__id
    }, function(resp) {
      // Send response back to page
      window.postMessage({
        __cdp: true,
        __dir: 'response',
        __id: e.data.__id,
        __data: resp ? resp.data : null
      }, '*');
    });
  });

  // Inject on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCDP);
  } else {
    injectCDP();
  }
})();
