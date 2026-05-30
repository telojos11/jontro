// CDP Bridge Background: Relays page CDP commands to chrome.debugger
// Bypasses exposeDevToolsProtocol fix by proxying through extension

let attachedTabs = new Map(); // tabId → { cdpSession }

// Auto-attach debugger when extension icon clicked
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (attachedTabs.has(tab.id)) {
      await chrome.debugger.detach({ tabId: tab.id });
      attachedTabs.delete(tab.id);
    } else {
      await chrome.debugger.attach({ tabId: tab.id }, '1.3');
      attachedTabs.set(tab.id, { tabId: tab.id });
      console.log('CDP bridge attached to tab', tab.id);
    }
  } catch (e) {
    console.error('CDP attach error:', e.message);
  }
});

// Handle CDP relay requests from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd !== 'cdpSend') return false;

  const tabId = sender.tab.id;
  let parsed;

  try { parsed = JSON.parse(msg.data); } catch (e) {
    sendResponse({ data: JSON.stringify({ id: msg.id, error: { message: 'Invalid JSON' } }) });
    return true;
  }

  // Auto-attach if not already attached
  const doCommand = async () => {
    if (!attachedTabs.has(tabId)) {
      await chrome.debugger.attach({ tabId }, '1.3');
      attachedTabs.set(tabId, { tabId });
    }

    try {
      const result = await chrome.debugger.sendCommand(
        { tabId },
        parsed.method,
        parsed.params || {}
      );
      return { id: parsed.id, result };
    } catch (e) {
      return { id: parsed.id, error: { message: e.message } };
    }
  };

  doCommand().then((response) => {
    sendResponse({ data: JSON.stringify(response) });
  }).catch((err) => {
    sendResponse({ data: JSON.stringify({ id: parsed.id, error: { message: err.message } }) });
  });

  return true; // async response
});

// Clean up on detach
chrome.debugger.onDetach.addListener((source, reason) => {
  attachedTabs.delete(source.tabId);
  console.log('CDP detached from tab', source.tabId, reason);
});

// Handle CDP events from debugger
chrome.debugger.onEvent.addListener((source, method, params) => {
  // Forward CDP events to the page (e.g., Target.receivedMessageFromTarget)
  const tabId = source.tabId;
  chrome.tabs.sendMessage(tabId, {
    cmd: 'cdpEvent',
    data: JSON.stringify({ method, params })
  }).catch(() => {}); // ignore if no listener
});
