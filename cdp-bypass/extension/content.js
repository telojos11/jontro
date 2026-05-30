// Content script: bridges page JS (MAIN world) ↔ extension background
// Runs in ISOLATED world — has chrome.runtime.sendMessage access
// Listens for postMessage from page's window.cdp, forwards to background

(function() {
  'use strict';

  // Inject window.cdp creator into page's MAIN world
  function injectCDPBridge() {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        if (window.__cdpBridgeInjected) return;
        window.__cdpBridgeInjected = true;

        let _id = 0;
        const _pending = new Map();

        window.cdp = {
          onmessage: null,

          send(raw) {
            const id = ++_id;
            // Send CDP command to content script via postMessage
            window.postMessage({ __cdp: true, __dir: 'send', __id: id, __data: raw }, '*');
          }
        };

        // Listen for CDP responses from content script
        window.addEventListener('message', function(e) {
          if (!e.data || !e.data.__cdp || e.data.__dir !== 'response') return;
          const data = e.data.__data;
          // Fire onmessage handler
          if (window.cdp && window.cdp.onmessage) {
            window.cdp.onmessage(data);
          }
          // Trigger any waiting promise
          try {
            const msg = JSON.parse(data);
            if (msg.id && _pending.has(msg.id)) {
              _pending.get(msg.id)(msg);
              _pending.delete(msg.id);
            }
          } catch(_) {}
        });
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  // Inject bridge as early as possible
  injectCDPBridge();
  document.addEventListener('DOMContentLoaded', injectCDPBridge);

  // Listen for CDP commands from page (MAIN world → ISOLATED world)
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.__cdp || e.data.__dir !== 'send') return;

    // Forward CDP command to background script
    chrome.runtime.sendMessage(
      { cmd: 'cdpSend', data: e.data.__data, id: e.data.__id },
      function(resp) {
        // Send response back to page's MAIN world
        window.postMessage({
          __cdp: true,
          __dir: 'response',
          __id: e.data.__id,
          __data: resp ? resp.data : JSON.stringify({ error: { message: 'no response' } })
        }, '*');
      }
    );
  });

  // Listen for CDP events forwarded from background
  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg.cmd === 'cdpEvent') {
      window.postMessage({
        __cdp: true,
        __dir: 'response',
        __data: msg.data
      }, '*');
    }
  });
})();
