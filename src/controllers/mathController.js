const {
  generateStepByStepSolution,
  getMathHelpData,
  classifyFormula,
  validateFormula,
  solveByType,
  solveBatch,
} = require('../services/mathService');

const ensureFormula = (req, res) => {
  const { formula } = req.body || {};
  if (!formula || typeof formula !== 'string' || !formula.trim()) {
    res.status(400).json({
      error:
        'No formula provided. Please provide a non-empty mathematical expression to solve.',
      example: { formula: '2x + 5 = 13' },
    });
    return null;
  }
  return formula;
};

const solveMathProblem = async (req, res) => {
  const formula = ensureFormula(req, res);
  if (!formula) return;

  try {
    const solution = await generateStepByStepSolution(formula);
    res.json(solution);
  } catch (err) {
    res.status(400).json({
      error: 'Invalid or unsupported formula.',
      details: err.message,
      formula,
    });
  }
};

const solveEquationOnly = async (req, res) => {
  const formula = ensureFormula(req, res);
  if (!formula) return;

  try {
    const solution = await solveByType(formula, 'equation');
    res.json(solution);
  } catch (err) {
    res.status(400).json({
      error: 'Invalid or unsupported equation.',
      details: err.message,
      formula,
    });
  }
};

const solveExpressionOnly = async (req, res) => {
  const formula = ensureFormula(req, res);
  if (!formula) return;

  try {
    const solution = await solveByType(formula, 'expression');
    res.json(solution);
  } catch (err) {
    res.status(400).json({
      error: 'Invalid or unsupported expression.',
      details: err.message,
      formula,
    });
  }
};

const solveDerivativeOnly = async (req, res) => {
  const formula = ensureFormula(req, res);
  if (!formula) return;

  try {
    const solution = await solveByType(formula, 'derivative');
    res.json(solution);
  } catch (err) {
    res.status(400).json({
      error: 'Invalid or unsupported derivative.',
      details: err.message,
      formula,
    });
  }
};

const solveIntegralOnly = async (req, res) => {
  const formula = ensureFormula(req, res);
  if (!formula) return;

  try {
    const solution = await solveByType(formula, 'integral');
    res.json(solution);
  } catch (err) {
    res.status(400).json({
      error: 'Invalid or unsupported integral.',
      details: err.message,
      formula,
    });
  }
};

const validateFormulaHandler = async (req, res) => {
  const { formula } = req.body || {};
  // For validation we allow empty to be reported as invalid with message.
  try {
    const result = await validateFormula(formula);
    res.json(result);
  } catch (err) {
    res.status(400).json({
      error: 'Failed to validate formula.',
      details: err.message,
      formula,
    });
  }
};

const solveBatchHandler = async (req, res) => {
  const { formulas } = req.body || {};

  if (!Array.isArray(formulas)) {
    return res.status(400).json({
      error: 'Batch payload must include an array field "formulas".',
      example: { formulas: ['2x + 5 = 13', 'd/dx(x^2 + 3x)'] },
    });
  }

  try {
    const batchResult = await solveBatch(formulas);
    res.json(batchResult);
  } catch (err) {
    res.status(400).json({
      error: 'Failed to solve batch of formulas.',
      details: err.message,
    });
  }
};

const getMathHelp = (req, res) => {
  const helpInfo = getMathHelpData();
  res.json(helpInfo);
};

module.exports = {
  solveMathProblem,
  solveEquationOnly,
  solveExpressionOnly,
  solveDerivativeOnly,
  solveIntegralOnly,
  validateFormula: validateFormulaHandler,
  solveBatch: solveBatchHandler,
  getMathHelp,
};

