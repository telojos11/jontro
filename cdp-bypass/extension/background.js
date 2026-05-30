// CDP Bypass Background — minimal version
try {

const sessions = new Map();

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (sessions.has(tab.id)) {
      await chrome.debugger.detach({ tabId: tab.id });
      sessions.delete(tab.id);
      return;
    }
    await chrome.debugger.attach({ tabId: tab.id }, '1.3');
    sessions.set(tab.id, true);
    console.log('[CDP] attached tab', tab.id);
  } catch (e) {
    console.error('[CDP]', e.message);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd !== 's') return false;
  const tabId = sender.tab ? sender.tab.id : null;
  if (!tabId) { sendResponse({data:'{}'}); return true; }

  (async () => {
    try {
      if (!sessions.has(tabId)) {
        await chrome.debugger.attach({ tabId }, '1.3');
        sessions.set(tabId, true);
      }
      const p = JSON.parse(msg.data);
      const r = await chrome.debugger.sendCommand({ tabId }, p.method, p.params || {});
      sendResponse({ data: JSON.stringify({ id: p.id, result: r }) });
    } catch (e) {
      sendResponse({ data: JSON.stringify({ id: 0, error: { message: e.message } }) });
    }
  })();
  return true;
});

chrome.debugger.onEvent.addListener((source, method, params) => {
  chrome.tabs.sendMessage(source.tabId, {
    cmd: 'e',
    data: JSON.stringify({ method, params })
  }).catch(() => {});
});

chrome.debugger.onDetach.addListener((source) => { sessions.delete(source.tabId); });

} catch (_) {}
