const { normalizeNaturalLanguage } = require('./naturalLanguage');

function parseInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let value = normalizeNaturalLanguage(input).trim();

  // Normalize common multiplication symbols (users often type "×" or "·").
  value = value.replace(/[×·]/g, '*');

  // Treat "x" as multiplication only when it's clearly used between numbers (e.g. "2x2", "2 x 2").
  // Keep other "x" usages intact so algebra like "2x(x+1)" is not broken.
  value = value.replace(/(\d)\s*[xX]\s*(\d)/g, '$1*$2');

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
