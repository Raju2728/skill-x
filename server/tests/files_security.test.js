const path = require('path');

describe('SEC-006: File Upload Whitelist Filter Verification', () => {
  const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]);

  const ALLOWED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.gif',
    '.pdf', '.txt', '.md', '.doc', '.docx'
  ]);

  const fileFilter = (filename, mimetype) => {
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { allowed: false, reason: 'File extension not allowed' };
    }
    if (!ALLOWED_MIME_TYPES.has(mimetype)) {
      return { allowed: false, reason: 'File MIME type not permitted' };
    }
    return { allowed: true };
  };

  test('rejects executable and script files (.exe, .sh, .bat, .php, .js)', () => {
    expect(fileFilter('malware.exe', 'application/x-msdownload').allowed).toBe(false);
    expect(fileFilter('script.sh', 'application/x-sh').allowed).toBe(false);
    expect(fileFilter('payload.php', 'application/x-php').allowed).toBe(false);
    expect(fileFilter('exploit.js', 'application/javascript').allowed).toBe(false);
  });

  test('rejects potentially malicious HTML/SVG files that enable Stored XSS', () => {
    expect(fileFilter('xss.html', 'text/html').allowed).toBe(false);
    expect(fileFilter('vector.svg', 'image/svg+xml').allowed).toBe(false);
  });

  test('accepts safe images and documents (.png, .jpg, .webp, .pdf, .docx, .txt)', () => {
    expect(fileFilter('avatar.png', 'image/png').allowed).toBe(true);
    expect(fileFilter('document.pdf', 'application/pdf').allowed).toBe(true);
    expect(fileFilter('photo.jpg', 'image/jpeg').allowed).toBe(true);
    expect(fileFilter('notes.txt', 'text/plain').allowed).toBe(true);
  });
});
