const { math, parseInput, addStep, toLatex } = require('./mathHelpers');

const evaluateExpression = async (formula, solution) => {
  solution.explanation =
    'This is a mathematical expression. I will evaluate it step by step.';

  try {
    addStep(
      solution.steps,
      'Original expression',
      formula,
      'Starting with the given mathematical expression.',
    );

    const normalized = parseInput(formula);
    let currentExpr = normalized;

    const node = math.parse(currentExpr);

    const stepEval = (nodeToEval) => {
      if (nodeToEval.type === 'OperatorNode') {
        const left = stepEval(nodeToEval.args[0]);
        const right = stepEval(nodeToEval.args[1]);

        if (!Number.isNaN(left) && !Number.isNaN(right)) {
          const before = `${left} ${nodeToEval.op} ${right}`;
          const after = math.evaluate(before);

          addStep(
            solution.steps,
            `Evaluate ${nodeToEval.op}`,
            `${before} = ${after}`,
            `Perform ${nodeToEval.op} operation.`,
          );
          return after;
        }
      }
      try {
        return math.evaluate(nodeToEval.toString());
      } catch {
        return nodeToEval.toString();
      }
    };

    const finalVal = stepEval(node);

    solution.finalAnswer = String(finalVal);
    solution.finalAnswerLatex = toLatex(solution.finalAnswer);

    addStep(
      solution.steps,
      'Final answer',
      `= ${solution.finalAnswer}`,
      'Final computed result.',
    );
  } catch (error) {
    throw new Error(error.message);
  }

  return solution;
};

module.exports = {
  evaluateExpression,
};

