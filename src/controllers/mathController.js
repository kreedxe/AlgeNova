const { generateStepByStepSolution, getMathHelpData } = require('../services/mathService');

const solveMathProblem = async (req, res) => {
  const { formula } = req.body || {};
  if (!formula || typeof formula !== 'string') {
    return res.status(400).json({
      error:
        'No formula provided. Please provide a mathematical expression to solve.',
      example: { formula: '2x + 5 = 13' },
    });
  }

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

const getMathHelp = (req, res) => {
  const helpInfo = getMathHelpData();
  res.json(helpInfo);
};

module.exports = {
  solveMathProblem,
  getMathHelp,
};

