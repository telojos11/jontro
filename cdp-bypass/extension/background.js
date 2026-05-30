// CDP Bypass Background
// Icon click → attach debugger → bridge relays page CDP commands
// Bypasses exposeDevToolsProtocol fix (never calls that API)

const sessions = new Map();

// Extension icon click → attach debugger to current tab
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (sessions.has(tab.id)) {
      // Already attached — detach
      await chrome.debugger.detach({ tabId: tab.id });
      sessions.delete(tab.id);
      console.log('[CDP BG] Detached from tab', tab.id);
      return;
    }

    await chrome.debugger.attach({ tabId: tab.id }, '1.3');
    sessions.set(tab.id, { attached: true });
    console.log('[CDP BG] Attached to tab', tab.id);
  } catch (e) {
    console.error('[CDP BG] Attach error:', e.message);
  }
});

// Relay CDP commands from bridge content script → real CDP
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd !== 'cdpSend') return false;

  const tabId = sender.tab ? sender.tab.id : null;
  if (!tabId) {
    sendResponse({ data: JSON.stringify({ error: { message: 'No tab' } }) });
    return true;
  }

  // Auto-attach if needed
  (async () => {
    try {
      if (!sessions.has(tabId)) {
        await chrome.debugger.attach({ tabId }, '1.3');
        sessions.set(tabId, { attached: true });
      }

      const parsed = JSON.parse(msg.data);
      const result = await chrome.debugger.sendCommand(
        { tabId },
        parsed.method,
        parsed.params || {}
      );
      sendResponse({ data: JSON.stringify({ id: parsed.id, result }) });
    } catch (e) {
      sendResponse({ data: JSON.stringify({ id: msg.id || 0, error: { message: e.message } }) });
    }
  })();

  return true; // async
});

// Forward CDP events to bridge → page
chrome.debugger.onEvent.addListener((source, method, params) => {
  chrome.tabs.sendMessage(source.tabId, {
    cmd: 'cdpEvent',
    data: JSON.stringify({ method, params })
  }).catch(() => {});
});

chrome.debugger.onDetach.addListener((source) => {
  sessions.delete(source.tabId);
});
