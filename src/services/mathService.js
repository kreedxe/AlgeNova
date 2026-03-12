const { parseInput, determineFormulaType, handleSpecialFormulas } = require('./mathHelpers');
const { solveEquation } = require('./equationService');
const { evaluateExpression } = require('./expressionService');
const { solveDerivative, solveIntegral } = require('./calculusService');

const generateStepByStepSolution = async (formula) => {
  const originalFormula = formula;

  let parsed = parseInput(formula)
    .replace(/√\(/g, 'sqrt(')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\\sqrt\s*\(/g, 'sqrt(')
    .replace(/\{([^}]+)\}/g, '($1)');

  const special = handleSpecialFormulas(formula);
  if (special) {
    return {
      originalFormula,
      parsedFormula: parsed,
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
    parsedFormula: parsed,
    steps: [],
    finalAnswer: null,
    finalAnswerLatex: null,
    verification: null,
    explanation: '',
    type: determineFormulaType(parsed),
  };

  if (solution.type === 'equation') {
    solution = await solveEquation(parsed, solution);
  } else if (solution.type === 'expression') {
    solution = await evaluateExpression(parsed, solution);
  } else if (solution.type === 'derivative') {
    solution = await solveDerivative(parsed, solution);
  } else if (solution.type === 'integral') {
    solution = await solveIntegral(parsed, solution);
  } else {
    throw new Error('Unsupported formula type.');
  }

  return solution;
};

const classifyFormula = (formula) => {
  const parsedFormula = parseInput(formula);
  const type = determineFormulaType(parsedFormula);
  const specialLatex = handleSpecialFormulas(formula);

  return {
    originalFormula: formula,
    parsedFormula,
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
    parsedFormula: parsedFormula,
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

  return solution;
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

