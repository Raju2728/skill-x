const { escapeRegex, sanitizeText } = require('../utils/sanitize');
const { generateToken, verifyToken } = require('../config/jwt');

describe('Security Remediations Verification Suite', () => {
  describe('SEC-007: ReDoS Prevention via Regex Escaping', () => {
    test('escapes all special regex characters correctly', () => {
      const dangerousInput = '.*+?^${}()|[]\\';
      const safe = escapeRegex(dangerousInput);
      expect(safe).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');

      // Ensure that creating a RegExp with the escaped string matches literally
      const regex = new RegExp(safe);
      expect(regex.test(dangerousInput)).toBe(true);
      expect(regex.test('abc')).toBe(false);
    });

    test('handles malicious catastrophic backtracking pattern safely', () => {
      const redosPattern = '((a+)+)+$';
      const safe = escapeRegex(redosPattern);
      const regex = new RegExp(`^${safe}$`);

      const nonMatching = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaab';
      const start = Date.now();
      expect(regex.test(nonMatching)).toBe(false);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50); // Executed instantly without backtracking
    });

    test('handles non-string inputs gracefully', () => {
      expect(escapeRegex(null)).toBe('');
      expect(escapeRegex(undefined)).toBe('');
      expect(escapeRegex(123)).toBe('');
    });
  });

  describe('SEC-003: JWT Security and Verification', () => {
    test('generates and verifies valid token', () => {
      const userId = '64f1234567890abcdef12345';
      const token = generateToken(userId);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(userId);
    });

    test('rejects tampered or forged tokens', () => {
      const validToken = generateToken('user123');
      const tampered = validToken.substring(0, validToken.length - 5) + 'abcde';
      expect(() => verifyToken(tampered)).toThrow();
    });
  });

  describe('Input Sanitization', () => {
    test('strips HTML tags to prevent XSS payloads', () => {
      const xssInput = '<script>alert("XSS")</script>Hello <b>World</b>';
      const clean = sanitizeText(xssInput);
      expect(clean).not.toContain('<script>');
      expect(clean).toBe('alert("XSS")Hello World');
    });
  });
});
