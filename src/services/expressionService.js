const { math, parseInput, addStep, toLatex } = require('./mathHelpers');

const normalizeTrigPowers = (expr) => {
  if (typeof expr !== 'string') return expr;
  let s = expr;

  // Normalize sin^2(...) / sin²(...) and cos^2(...) / cos²(...)
  // Note: this regex handles non-nested parentheses, which is the common user input for trig identities.
  s = s.replace(/sin(?:\^2|²)\s*\(([^()]*)\)/g, 'sin($1)^2');
  s = s.replace(/cos(?:\^2|²)\s*\(([^()]*)\)/g, 'cos($1)^2');

  // Normalize sin^2x / sin²x and cos^2x / cos²x (missing parentheses)
  s = s.replace(/sin(?:\^2|²)\s*([a-zA-Z][a-zA-Z0-9_]*)/g, 'sin($1)^2');
  s = s.replace(/cos(?:\^2|²)\s*([a-zA-Z][a-zA-Z0-9_]*)/g, 'cos($1)^2');

  return s;
};

const isFunctionPow2 = (node, fnName) => {
  if (!node || node.type !== 'OperatorNode') return false;
  if (node.op !== '^') return false;
  const [base, exponent] = node.args || [];
  if (!base || base.type !== 'FunctionNode') return false;
  if (base.fn?.name !== fnName) return false;
  if (!exponent) return false;
  const expStr = exponent.toString();
  return expStr === '2';
};

const simplifySinCosPythagorean = (node) => {
  if (!node) return node;

  // Recurse first
  if (node.args && Array.isArray(node.args)) {
    node.args = node.args.map((arg) => simplifySinCosPythagorean(arg));
  }

  // Match sin(arg)^2 + cos(arg)^2 (either order)
  if (node.type === 'OperatorNode' && node.op === '+' && node.args?.length === 2) {
    const [a, b] = node.args;
    const aIsSin2 = isFunctionPow2(a, 'sin');
    const aIsCos2 = isFunctionPow2(a, 'cos');
    const bIsSin2 = isFunctionPow2(b, 'sin');
    const bIsCos2 = isFunctionPow2(b, 'cos');

    if ((aIsSin2 && bIsCos2) || (aIsCos2 && bIsSin2)) {
      const aArg = a.args[0].args[0]; // base(FunctionNode).args[0]
      const bArg = b.args[0].args[0];
      if (aArg && bArg && aArg.toString() === bArg.toString()) {
        return math.parse('1');
      }
    }
  }

  return node;
};

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

    const normalized = normalizeTrigPowers(parseInput(formula));
    let currentExpr = normalized;

    let node = math.parse(currentExpr);

    const trigSimplified = simplifySinCosPythagorean(node);
    if (trigSimplified.toString() !== node.toString()) {
      addStep(
        solution.steps,
        'Apply trigonometric identity',
        `${node.toString()} = ${trigSimplified.toString()}`,
        'Used the Pythagorean identity: sin(x)^2 + cos(x)^2 = 1.',
      );
      node = trigSimplified;
    }

    const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

    const stepEval = (nodeToEval) => {
      if (nodeToEval.type === 'OperatorNode') {
        const left = stepEval(nodeToEval.args[0]);
        const right = stepEval(nodeToEval.args[1]);

        if (isNumber(left) && isNumber(right)) {
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

