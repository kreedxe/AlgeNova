function parseInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let value = input.trim();

  // Strip common LaTeX delimiters and spacing commands
  value = value.replace(/^\$+|\$+$/g, '');
  value = value.replace(/\\left|\\right/g, '');
  value = value.replace(/\\,/g, '');

  // Normalize whitespace
  value = value.replace(/\s+/g, ' ');

  return value;
}

module.exports = {
  parseInput,
};

