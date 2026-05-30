// Bridge: ISOLATED world — relays page CDP ↔ background
try {

// Inject window.cdp into page MAIN world
const s = document.createElement('script');
s.textContent = 'window.cdp={onmessage:null,send:function(r){window.postMessage({c:1,d:r},"*")}};window.addEventListener("message",function(e){if(e.data&&e.data.c===2&&window.cdp&&window.cdp.onmessage)window.cdp.onmessage(e.data.d)});';
(document.head||document.documentElement||document.body).appendChild(s);
s.remove();

// Relay: page → background
window.addEventListener('message', function(e) {
  if (!e.data || e.data.c !== 1) return;
  try {
    chrome.runtime.sendMessage({cmd:'s',data:e.data.d}, function(r) {
      window.postMessage({c:2,d:r?r.data:'{"error":{"message":"no response"}}'}, '*');
    });
  } catch(_) {}
});

// CDP events: background → page
chrome.runtime.onMessage.addListener(function(m) {
  if (m && m.cmd === 'e') {
    window.postMessage({c:2,d:m.data}, '*');
  }
});

} catch(_) {}
