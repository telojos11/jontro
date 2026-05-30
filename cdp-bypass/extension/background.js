// CDP Bypass Background
// Extension icon → attach debugger + relay CDP commands from page
// Bypasses exposeDevToolsProtocol fix (never calls that patched API)

const sessions = new Map();

// Click extension icon → attach debugger
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.debugger.attach({ tabId: tab.id }, '1.3');
    sessions.set(tab.id, { attached: true, tabId: tab.id });
    console.log('[CDP Bypass] Attached to tab', tab.id);

    // Inject window.cdp into page via executeScript (MAIN world)
    // The content script already created the bridge — we just need
    // to ensure it's running. ExecuteScript refreshes it.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.cdp) return;
        // Force injection via the content script's method
        const s = document.createElement('script');
        s.textContent = `
          if (!window.cdp) {
            window.cdp = {
              onmessage: null,
              send(raw) { window.postMessage({__cdp:true,__dir:'send',__id:Date.now(),__data:raw}, '*'); }
            };
            window.addEventListener('message', function(e) {
              if (e.data && e.data.__cdp && e.data.__dir==='response' && window.cdp && window.cdp.onmessage) {
                window.cdp.onmessage(e.data.__data);
              }
            });
          }
        `;
        (document.head || document.documentElement).appendChild(s);
        s.remove();
      },
      world: 'MAIN'
    });

    console.log('[CDP Bypass] window.cdp injected');
  } catch (e) {
    console.error('[CDP Bypass] Error:', e.message);
    try { await chrome.debugger.detach({ tabId: tab.id }); } catch (_) {}
    sessions.delete(tab.id);
  }
});

// Relay CDP commands: content script → background → chrome.debugger
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd !== 'cdpSend') return false;

  const tabId = sender.tab ? sender.tab.id : null;
  if (!tabId || !sessions.has(tabId)) {
    sendResponse({
      data: JSON.stringify({ id: msg.id, error: { message: 'Not attached. Click extension icon first.' } })
    });
    return true;
  }

  let parsed;
  try { parsed = JSON.parse(msg.data); } catch (e) {
    sendResponse({ data: JSON.stringify({ id: msg.id, error: { message: 'Invalid JSON' } }) });
    return true;
  }

  (async () => {
    try {
      const result = await chrome.debugger.sendCommand(
        { tabId },
        parsed.method,
        parsed.params || {}
      );
      sendResponse({ data: JSON.stringify({ id: parsed.id, result }) });
    } catch (e) {
      sendResponse({ data: JSON.stringify({ id: parsed.id, error: { message: e.message } }) });
    }
  })();

  return true;
});

// Forward CDP events to page
chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;
  chrome.tabs.sendMessage(tabId, {
    cmd: 'cdpEvent',
    data: JSON.stringify({ method, params })
  }).catch(() => {});
});

chrome.debugger.onDetach.addListener((source) => {
  sessions.delete(source.tabId);
});
