# Chrome PiP RTL Origin Spoof - Proof of Concept

## Vulnerability Summary

**Type:** Security UI Spoofing (CWE-451)
**Browser:** Google Chrome (tested on v143.0.7499.193, affects all Chromium-based browsers)
**Impact:** Origin impersonation in Picture-in-Picture window via RTL Unicode characters

## The Attack

When a domain contains Right-to-Left (RTL) Unicode characters (e.g., Arabic letters), the browser's Picture-in-Picture (PiP) window renders the origin label using the Unicode bidirectional algorithm. This causes the displayed origin to be **visually reordered**, showing trusted brand names (apple.com, google.com) instead of the actual root domain.

### How It Works

1. **Attacker registers** a domain with RTL characters in subdomains
2. **Punycode encoding** allows these characters in DNS
3. **Victim visits** the malicious URL
4. **PiP is opened** (auto-play video or Document PiP)
5. **PiP title bar shows spoofed origin** due to bidi text rendering

### Domain Construction

```
Punycode (DNS):
xn--mgb.accounts.login.apple.com.xn--mgb.https.google.com.summa.sbs

Decoded Unicode:
ا.accounts.login.apple.com.ا.https.google.com.summa.sbs

Where: ا = U+0627 ARABIC LETTER ALEF (strong RTL character)
```

The Arabic Alef (AL class) triggers RTL text runs in the Unicode bidi algorithm, causing visual reordering that makes `summa.sbs` (attacker's real domain) appear as `apple.com` (spoofed trusted domain) in the PiP UI.

## POC Files

| File | Description |
|------|-------------|
| `pip-poc/index.html` | Complete attack demo with Video PiP + Document PiP phishing |
| `index.html` | Landing page (Retool security demo) |

## How to Reproduce

### Option 1: Direct access via RTL domain

If the RTL subdomains are configured, access:
```
http://xn--mgb.accounts.login.apple.com.xn--mgb.https.google.com.summa.sbs/pip-poc/
```

### Option 2: Local testing with /etc/hosts

```bash
# Add to /etc/hosts:
127.0.0.1 xn--mgb.test.local xn--mgb.apple.com.test.local

# Start local server:
python3 -m http.server 8080

# Open in Chrome:
open -a "Google Chrome" http://xn--mgb.apple.com.test.local:8080/pip-poc/
```

### Option 3: Chrome flag testing

```bash
open -a "Google Chrome" --args \
  --host-rules="MAP xn--mgb.apple.com.test.local 127.0.0.1:8080" \
  --user-data-dir="$TMPDIR/chrome-rtl-test"
```

## Expected Behavior vs Actual

| | Expected | Actual |
|---|----------|--------|
| PiP Origin Display | `summa.sbs` (real eTLD+1) | `apple.com` (spoofed) |
| User sees | Attacker's domain | Trusted brand |

## Impact

- **Phishing:** PiP window shows trusted brand while attacker controls content
- **Malware delivery:** Users trust PiP content, download malicious files
- **Credential theft:** Document PiP can show convincing login forms with spoofed origin
- **Persistent attack surface:** PiP windows stay on screen across tabs

## References

- https://issues.chromium.org/issues/40065117
- https://issues.chromium.org/issues/40066780
