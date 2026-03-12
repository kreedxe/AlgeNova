const express = require('express');

const mathController = require('../controllers/mathController');

const router = express.Router();

router.post('/solve', mathController.solveMathProblem);
router.get('/help', mathController.getMathHelp);

module.exports = router;

