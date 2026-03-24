const { normalizeNaturalLanguage } = require('./naturalLanguage');

function parseInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let value = normalizeNaturalLanguage(input).trim();

  // Strip common LaTeX delimiters and spacing commands
  value = value.replace(/^\$+|\$+$/g, '');
  value = value.replace(/\\left|\\right/g, '');
  value = value.replace(/\\,/g, '');

  // Normalize common unicode superscripts (helps inputs like x², sin²x).
  value = value.replace(/([a-zA-Z0-9\)])²/g, '$1^2');
  value = value.replace(/([a-zA-Z0-9\)])³/g, '$1^3');

  // Normalize whitespace
  value = value.replace(/\s+/g, ' ');

  return value;
}

module.exports = {
  parseInput,
};

