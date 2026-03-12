const express = require('express');

const mathController = require('../controllers/mathController');

const router = express.Router();

// General solver
router.post('/solve', mathController.solveMathProblem);

// Typed solvers
router.post('/solve/equation', mathController.solveEquationOnly);
router.post('/solve/expression', mathController.solveExpressionOnly);
router.post('/solve/derivative', mathController.solveDerivativeOnly);
router.post('/solve/integral', mathController.solveIntegralOnly);

// Validation & batch
router.post('/validate', mathController.validateFormula);
router.post('/solve/batch', mathController.solveBatch);

// Help/metadata
router.get('/help', mathController.getMathHelp);

module.exports = router;

