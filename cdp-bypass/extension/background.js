// CDP Bypass via Runtime.addBinding
// No content script, no postMessage, no externally_connectable needed.
// Uses CDP's own binding mechanism to create window.cdp bridge.

const sessions = new Map();

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const tabId = tab.id;

    // 1. Attach debugger
    await chrome.debugger.attach({ tabId }, '1.3');
    sessions.set(tabId, { attached: true });

    // 2. Add CDP binding — creates window.__cdpBridge(data) in page
    await chrome.debugger.sendCommand({ tabId }, 'Runtime.addBinding', {
      name: '__cdpBridge'
    });

    // 3. Inject window.cdp via Runtime.evaluate
    await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
      expression: `
        (function() {
          if (window.cdp) return;

          window.cdp = {
            onmessage: null,

            send(raw) {
              // Calls the CDP binding — goes straight to extension
              window.__cdpBridge(raw);
            }
          };

          // Extension will deliver results via this function
          window.__cdpDeliver = function(response) {
            if (window.cdp && window.cdp.onmessage) {
              window.cdp.onmessage(response);
            }
          };

          console.log('[CDP Bypass] window.cdp ready');
        })();
      `
    });

    console.log('[CDP Bypass] Injected window.cdp into tab', tabId);
  } catch (e) {
    console.error('[CDP Bypass] Error:', e.message);
    try { await chrome.debugger.detach({ tabId: tab.id }); } catch (_) {}
    sessions.delete(tab.id);
  }
});

// Handle binding calls: page → __cdpBridge(data) → this handler
chrome.debugger.onEvent.addListener(async (source, method, params) => {
  if (method !== 'Runtime.bindingCalled' || params.name !== '__cdpBridge') return;

  const tabId = source.tabId;
  if (!sessions.has(tabId)) return;

  try {
    const msg = JSON.parse(params.payload);

    // Execute CDP command on behalf of the page
    const result = await chrome.debugger.sendCommand(
      { tabId },
      msg.method,
      msg.params || {}
    );

    // Deliver result back to page via Runtime.evaluate
    const response = JSON.stringify({ id: msg.id, result });
    await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
      expression: `window.__cdpDeliver(${JSON.stringify(response)})`
    });
  } catch (e) {
    // Deliver error back to page
    try {
      const msg = JSON.parse(params.payload);
      const errResp = JSON.stringify({ id: msg.id, error: { message: e.message } });
      await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression: `window.__cdpDeliver(${JSON.stringify(errResp)})`
      });
    } catch (_) {}
  }
});

// Forward protocol events (Target.receivedMessageFromTarget, etc.)
chrome.debugger.onEvent.addListener(async (source, method, params) => {
  if (method === 'Runtime.bindingCalled') return; // handled above
  if (!sessions.has(source.tabId)) return;

  // Forward events to page
  const event = JSON.stringify({ method, params });
  try {
    await chrome.debugger.sendCommand({ tabId: source.tabId }, 'Runtime.evaluate', {
      expression: `window.__cdpDeliver(${JSON.stringify(event)})`
    });
  } catch (_) {}
});

chrome.debugger.onDetach.addListener((source) => {
  sessions.delete(source.tabId);
});
