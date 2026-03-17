const { parseInput, determineFormulaType, handleSpecialFormulas, toLatex } = require('./mathHelpers');
const { solveEquation } = require('./equationService');
const { evaluateExpression } = require('./expressionService');
const { solveDerivative, solveIntegral } = require('./calculusService');

const solutionCache = new Map();
const SOLUTION_CACHE_MAX = 200;
const SOLUTION_CACHE_TTL_MS = 60_000;
const getCachedSolution = (key) => {
  const hit = solutionCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    solutionCache.delete(key);
    return null;
  }
  // refresh LRU-ish
  solutionCache.delete(key);
  solutionCache.set(key, hit);
  return hit.value;
};
const setCachedSolution = (key, value) => {
  solutionCache.set(key, { value, expiresAt: Date.now() + SOLUTION_CACHE_TTL_MS });
  if (solutionCache.size > SOLUTION_CACHE_MAX) {
    const firstKey = solutionCache.keys().next().value;
    if (firstKey !== undefined) solutionCache.delete(firstKey);
  }
};

const generateStepByStepSolution = async (formula) => {
  const cached = getCachedSolution(formula);
  if (cached) {
    return JSON.parse(JSON.stringify(cached));
  }

  const originalFormula = formula;

  let parsed = parseInput(formula)
    .replace(/√\(/g, 'sqrt(')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\\sqrt\s*\(/g, 'sqrt(')
    .replace(/\{([^}]+)\}/g, '($1)');

  const parsedFormulaText = parsed;
  const parsedFormulaLatex = toLatex(parsedFormulaText);

  const special = handleSpecialFormulas(formula);
  if (special) {
    return {
      originalFormula,
      parsedFormula: parsedFormulaLatex,
      parsedFormulaText,
      steps: [],
      finalAnswer: 'Special Formula',
      finalAnswerLatex: special,
      verification: null,
      explanation: 'This is a well-known mathematical identity/theorem.',
      type: 'special',
    };
  }

  let solution = {
    originalFormula,
    parsedFormula: parsedFormulaLatex,
    parsedFormulaText,
    steps: [],
    finalAnswer: null,
    finalAnswerLatex: null,
    verification: null,
    explanation: '',
    type: determineFormulaType(parsedFormulaText),
  };

  const looksLikeBarePolynomialInX = (text) => {
    if (!text || typeof text !== 'string') return false;
    if (text.includes('=')) return false;
    if (!/[xX]/.test(text)) return false;
    // Avoid calculus / trig / logs / roots / other function-style inputs
    if (/(d\/dx|∫|integral|sin|cos|tan|asin|acos|atan|log|ln|sqrt)/i.test(text)) return false;
    // Basic sanity: only allow typical polynomial characters
    if (!/^[0-9xX+\-*/^().\s]+$/.test(text)) return false;
    return true;
  };

  if (solution.type === 'equation') {
    solution = await solveEquation(parsedFormulaText, solution);
  } else if (solution.type === 'expression') {
    if (looksLikeBarePolynomialInX(parsedFormulaText)) {
      solution.type = 'equation';
      solution.explanation =
        'This looks like a polynomial in x. I will solve for the roots by setting it equal to 0.';
      solution.steps.push({
        step: solution.steps.length + 1,
        description: 'Interpret as equation',
        expression: `${parsedFormulaText} = 0`,
        expressionLatex: `${toLatex(parsedFormulaText)} = 0`,
        explanation: 'Polynomials are solved by finding x such that the expression equals 0.',
      });
      solution = await solveEquation(`${parsedFormulaText} = 0`, solution);
    } else {
      solution = await evaluateExpression(parsedFormulaText, solution);
    }
  } else if (solution.type === 'derivative') {
    solution = await solveDerivative(parsedFormulaText, solution);
  } else if (solution.type === 'integral') {
    solution = await solveIntegral(parsedFormulaText, solution);
  } else {
    throw new Error('Unsupported formula type.');
  }

  setCachedSolution(formula, solution);
  return solution;
};

const classifyFormula = (formula) => {
  const parsedFormula = parseInput(formula);
  const type = determineFormulaType(parsedFormula);
  const specialLatex = handleSpecialFormulas(formula);

  return {
    originalFormula: formula,
    parsedFormula: toLatex(parsedFormula),
    parsedFormulaText: parsedFormula,
    type,
    isSpecial: Boolean(specialLatex),
  };
};

const validateFormula = async (formula) => {
  const classification = classifyFormula(formula);

  if (!formula || typeof formula !== 'string' || !formula.trim()) {
    return {
      ...classification,
      valid: false,
      error: 'Formula must be a non-empty string.',
    };
  }

  try {
    // Try a dry run; we discard the heavy result but use it to confirm validity.
    await generateStepByStepSolution(formula);
    return {
      ...classification,
      valid: true,
      error: null,
    };
  } catch (err) {
    return {
      ...classification,
      valid: false,
      error: err.message,
    };
  }
};

const solveByType = async (formula, expectedType) => {
  const cacheKey = `type:${expectedType}:${formula}`;
  const cached = getCachedSolution(cacheKey);
  if (cached) return JSON.parse(JSON.stringify(cached));

  const parsedFormula = parseInput(formula)
    .replace(/√\(/g, 'sqrt(')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\\sqrt\s*\(/g, 'sqrt(')
    .replace(/\{([^}]+)\}/g, '($1)');

  const detectedType = determineFormulaType(parsedFormula);

  if (detectedType !== expectedType) {
    throw new Error(`Expected a ${expectedType} but detected ${detectedType}.`);
  }

  let solution = {
    originalFormula: formula,
    parsedFormula: toLatex(parsedFormula),
    parsedFormulaText: parsedFormula,
    steps: [],
    finalAnswer: null,
    finalAnswerLatex: null,
    verification: null,
    explanation: '',
    type: detectedType,
  };

  if (detectedType === 'equation') {
    solution = await solveEquation(parsedFormula, solution);
  } else if (detectedType === 'expression') {
    solution = await evaluateExpression(parsedFormula, solution);
  } else if (detectedType === 'derivative') {
    solution = await solveDerivative(parsedFormula, solution);
  } else if (detectedType === 'integral') {
    solution = await solveIntegral(parsedFormula, solution);
  } else {
    throw new Error('Unsupported formula type.');
  }

  setCachedSolution(cacheKey, solution);
  return JSON.parse(JSON.stringify(solution));
};

const solveBatch = async (formulas) => {
  if (!Array.isArray(formulas)) {
    throw new Error('Batch payload must be an array of formulas.');
  }

  const results = await Promise.all(
    formulas.map(async (formula, index) => {
      try {
        const solution = await generateStepByStepSolution(formula);
        return {
          index,
          formula,
          ok: true,
          solution,
        };
      } catch (err) {
        return {
          index,
          formula,
          ok: false,
          error: err.message,
        };
      }
    }),
  );

  return {
    count: results.length,
    results,
  };
};

const getMathHelpData = () => ({
  supportedOperations: [
    'Linear, quadratic, polynomial equations',
    'Equations with sqrt, log, sin, cos, tan',
    'Expression evaluation (simplify + calculate)',
    'Derivatives (d/dx)',
    'Integrals (basic antiderivative)',
  ],
  examples: [
    { type: 'Linear Equation', input: '2x + 5 = 13' },
    { type: 'Quadratic Equation', input: 'x^2 - 4 = 0' },
    { type: 'Square Root Equation', input: 'sqrt(x+4) = 6' },
    { type: 'Logarithmic Equation', input: 'log(x) = 2' },
    { type: 'Trigonometric Equation', input: 'sin(x) = 0.5' },
    { type: 'Derivative', input: 'd/dx(x^2 + 3x)' },
    { type: 'Integral', input: '∫x^2' },
  ],
});

module.exports = {
  generateStepByStepSolution,
  classifyFormula,
  validateFormula,
  solveByType,
  solveBatch,
  getMathHelpData,
};

