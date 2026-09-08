/**
 * Security sanitization helpers
 */

/**
 * Escapes special regular expression characters in a user-supplied string
 * to prevent Regular Expression Denial of Service (ReDoS) or unintended matching.
 * @param {string} string
 * @returns {string}
 */
function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strips HTML tags and suspicious script content from strings.
 * @param {string} str
 * @returns {string}
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
}

module.exports = {
  escapeRegex,
  sanitizeText,
};
