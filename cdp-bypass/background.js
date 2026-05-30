// CDP Bypass: Injects window.cdp into page via Runtime.evaluate
// Bypasses exposeDevToolsProtocol fix — never calls that patched API

const sessions = new Map();

// Extension icon click → attach debugger + inject window.cdp into page
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Attach debugger
    await chrome.debugger.attach({ tabId: tab.id }, '1.3');
    sessions.set(tab.id, { attached: true });
    console.log('CDP attached to tab', tab.id);

    // Inject window.cdp directly into the page context
    // This bypasses exposeDevToolsProtocol entirely
    // Uses Runtime.evaluate to create the CDP binding
    await chrome.debugger.sendCommand({ tabId: tab.id }, 'Runtime.evaluate', {
      expression: `
        (function() {
          if (window.cdp) return 'already-injected';

          let nextId = 0;
          const pending = new Map();
          const EXT_ID = '${chrome.runtime.id}';

          window.cdp = {
            onmessage: null,

            send(raw) {
              const id = ++nextId;
              try {
                chrome.runtime.sendMessage(
                  EXT_ID,
                  { cmd: 'cdpSend', data: raw, id },
                  (resp) => {
                    const response = resp && resp.data ? resp.data : JSON.stringify({ id, error: { message: 'no response' } });
                    const parsed = JSON.parse(response);

                    // Resolve promise if waiting
                    if (pending.has(id)) {
                      pending.get(id)(parsed);
                      pending.delete(id);
                    }

                    // Fire onmessage for async events (Target.receivedMessageFromTarget etc)
                    if (window.cdp.onmessage) {
                      window.cdp.onmessage(response);
                    }
                  }
                );
              } catch(e) {
                if (window.cdp.onmessage) {
                  window.cdp.onmessage(JSON.stringify({ id, error: { message: e.message } }));
                }
              }
            }
          };

          console.log('[CDP Bypass] window.cdp injected. EXT_ID=' + EXT_ID);
          return 'injected';
        })();
      `,
      awaitPromise: false
    });

    console.log('window.cdp injected into tab', tab.id);
  } catch (e) {
    console.error('CDP inject error:', e.message);
    try { await chrome.debugger.detach({ tabId: tab.id }); } catch (_) {}
    sessions.delete(tab.id);
  }
});

// Relay CDP commands from page → real CDP
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg.cmd !== 'cdpSend') return false;

  const tabId = sender.tab ? sender.tab.id : null;
  if (!tabId || !sessions.has(tabId)) {
    sendResponse({ data: JSON.stringify({ id: msg.id, error: { message: 'Not attached. Click extension icon first.' } }) });
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

// Clean up
chrome.debugger.onDetach.addListener((source, reason) => {
  sessions.delete(source.tabId);
});
