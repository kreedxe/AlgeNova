const WORD_NUMBERS = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
};

function normalizeNaturalLanguage(input) {
  if (!input || typeof input !== 'string') return input;

  // Only attempt normalization when it looks like natural language.
  // Avoid touching LaTeX or already-symbolic math.
  if (!/[a-zA-Z]/.test(input)) return input;
  if (/\\[a-zA-Z]+/.test(input)) return input;

  let s = input.toLowerCase().trim();

  // Common phrases first (order matters)
  s = s.replace(/\bmultiplied by\b/g, '*');
  s = s.replace(/\btimes\b/g, '*');
  s = s.replace(/\bdivided by\b/g, '/');
  s = s.replace(/\bover\b/g, '/');

  s = s.replace(/\bplus\b/g, '+');
  s = s.replace(/\bminus\b/g, '-');

  // Equality
  s = s.replace(/\bequals\b/g, '=');
  s = s.replace(/\bequal to\b/g, '=');

  // "is" is tricky; only treat it as equality when it sits between two sides
  s = s.replace(/\bis equal to\b/g, '=');

  // Variables: "ex" -> x is too risky; keep only explicit x
  s = s.replace(/\b(x)\b/g, 'x');

  // Convert number words
  s = s.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/g, (m) => WORD_NUMBERS[m] || m);

  // Powers: "x squared", "x cubed"
  s = s.replace(/\b([0-9]+|x|\))\s*squared\b/g, '$1^2');
  s = s.replace(/\b([0-9]+|x|\))\s*cubed\b/g, '$1^3');

  // "to the power of N"
  s = s.replace(/\b([0-9]+|x|\))\s*(?:to the power of|power of)\s*([0-9]+)\b/g, '$1^$2');

  // Implicit multiplication: "2 x" -> "2x", "x 2" -> "x*2" (rare)
  s = s.replace(/\b([0-9]+)\s+(x)\b/g, '$1$2');

  // Cleanup: keep only common math characters + letters for functions (sin/cos/etc)
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

module.exports = {
  normalizeNaturalLanguage,
};

