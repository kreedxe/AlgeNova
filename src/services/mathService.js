const { create, all, parse, simplify } = require('mathjs');
const nerdamer = require('nerdamer');
require('nerdamer/Solve');
require('nerdamer/Algebra');
require('nerdamer/Calculus');
require('nerdamer/Extra');

const { parseInput } = require('../utils/parser');

const math = create(all);

const toLatex = (expr) => {
  try {
    return math.parse(expr).toTex({ parenthesis: 'keep', implicit: 'show' });
  } catch {
    return expr;
  }
};

const cleanOutput = (str) => str.replace(/\*/g, '').replace(/\s+/g, ' ').trim();

const stripBrackets = (str) => (typeof str === 'string' ? str.replace(/\[|\]/g, '') : str);

const determineFormulaType = (formula) => {
  if (formula.includes('=') && !formula.includes('∫') && !formula.includes('d/dx')) {
    return 'equation';
  }
  if (formula.includes('d/dx') || formula.includes("'")) {
    return 'derivative';
  }
  if (formula.includes('∫') || formula.toLowerCase().includes('integral')) {
    return 'integral';
  }
  return 'expression';
};

const addStep = (steps, description, expression, explanation = '') => {
  const exprString = typeof expression === 'string' ? expression : String(expression);

  let expressionLatex;
  try {
    expressionLatex = toLatex(exprString);
  } catch {
    expressionLatex = exprString;
  }

  steps.push({
    step: steps.length + 1,
    description,
    expression: exprString,
    expressionLatex,
    explanation,
  });
};

const verifyEquationSolution = (leftSide, rightSide, solutions) => {
  const verifications = [];
  const list = Array.isArray(solutions) ? solutions : [solutions];

  list.forEach((sol) => {
    try {
      let cleanSol = sol.replace(/^x\s*=\s*/, '').trim();
      cleanSol = cleanSol.replace(/π/g, 'pi');

      if (/k/.test(cleanSol)) {
        [0, 1].forEach((kVal) => {
          const testExpr = cleanSol.replace(/k/g, `(${kVal})`);
          try {
            const leftResult = math.evaluate(leftSide.replace(/x/g, `(${testExpr})`));
            const rightResult = math.evaluate(rightSide.replace(/x/g, `(${testExpr})`));
            verifications.push({
              solution: `x = ${cleanSol}, k=${kVal}`,
              solutionLatex: `x = ${toLatex(cleanSol)}, k=${kVal}`,
              leftSide: `${leftSide} → ${leftResult}`,
              rightSide: `${rightSide} → ${rightResult}`,
              isCorrect: Math.abs(leftResult - rightResult) < 1e-10,
            });
          } catch (err) {
            verifications.push({
              solution: `x = ${cleanSol}, k=${kVal}`,
              solutionLatex: `x = ${toLatex(cleanSol)}, k=${kVal}`,
              error: `Verification error: ${err.message}`,
            });
          }
        });
      } else {
        const leftResult = math.evaluate(leftSide.replace(/x/g, `(${cleanSol})`));
        const rightResult = math.evaluate(rightSide.replace(/x/g, `(${cleanSol})`));
        verifications.push({
          solution: `x = ${cleanSol}`,
          solutionLatex: `x = ${toLatex(cleanSol)}`,
          leftSide: `${leftSide} → ${leftResult}`,
          rightSide: `${rightSide} → ${rightResult}`,
          isCorrect: Math.abs(leftResult - rightResult) < 1e-10,
        });
      }
    } catch (error) {
      verifications.push({
        solution: `x = ${sol}`,
        solutionLatex: `x = ${toLatex(sol)}`,
        error: `Verification error: ${error.message}`,
      });
    }
  });

  return verifications;
};

const handleSpecialFormulas = (formula) => {
  const specialFormulas = {
    quadratic: 'x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}',
    binomial: '(a+b)^n = \\\\sum_{k=0}^{n} \\\\binom{n}{k} a^{n-k} b^k',
    euler: 'e^{i\\\\pi} + 1 = 0',
    pythagoras: '\\\\sin^2(\\\\theta) + \\\\cos^2(\\\\theta) = 1',
    derivative_def: "f'(x) = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h) - f(x)}{h}",
    integral_general: '\\\\int_a^b f(x) dx = F(b) - F(a)',
    maclaurin: 'e^x = \\\\sum_{n=0}^{\\\\infty} \\\\frac{x^n}{n!}',
    matrix:
      'A = \\\\begin{bmatrix} 1 & 2 & 3 \\\\\\\\ 4 & 5 & 6 \\\\\\\\ 7 & 8 & 9 \\\\end{bmatrix}',
    vector_length: '\\\\|\\\\vec{v}\\\\| = \\\\sqrt{v_1^2 + v_2^2 + \\\\cdots + v_n^2}',
    gauss_integral: '\\\\int_{-\\\\infty}^{\\\\infty} e^{-x^2} dx = \\\\sqrt{\\\\pi}',
  };

  if (/quadratic/i.test(formula)) return specialFormulas.quadratic;
  if (/binomial/i.test(formula)) return specialFormulas.binomial;
  if (/euler/i.test(formula)) return specialFormulas.euler;
  if (/pythagoras|trig/i.test(formula)) return specialFormulas.pythagoras;
  if (/derivative.+definition/i.test(formula)) return specialFormulas.derivative_def;
  if (/integral.+general/i.test(formula)) return specialFormulas.integral_general;
  if (/maclaurin/i.test(formula)) return specialFormulas.maclaurin;
  if (/matrix/i.test(formula)) return specialFormulas.matrix;
  if (/vector.+length/i.test(formula)) return specialFormulas.vector_length;
  if (/gauss.+integral/i.test(formula)) return specialFormulas.gauss_integral;

  return null;
};

const solveEquation = async (formula, solution) => {
  solution.explanation =
    'This is an algebraic or transcendental equation. I will solve for the unknown variable by isolating it on one side.';
  try {
    if (formula.includes('±')) {
      const plusVersion = formula.replace('±', '+');
      const minusVersion = formula.replace('±', '-');

      addStep(
        solution.steps,
        'Handling ±',
        `${plusVersion}  OR  ${minusVersion}`,
        'Splitting ± into + and - to get two separate solutions.',
      );

      const plusSolution = await solveEquation(plusVersion, {
        ...solution,
        steps: [],
      });
      const minusSolution = await solveEquation(minusVersion, {
        ...solution,
        steps: [],
      });

      addStep(
        solution.steps,
        'Plus branch steps',
        plusSolution.steps
          .map((s) => `${s.step}. ${s.description}: ${s.expression}`)
          .join(' || '),
      );
      addStep(
        solution.steps,
        'Minus branch steps',
        minusSolution.steps
          .map((s) => `${s.step}. ${s.description}: ${s.expression}`)
          .join(' || '),
      );

      solution.finalAnswer = [...plusSolution.finalAnswer, ...minusSolution.finalAnswer];
      solution.finalAnswerLatex = [
        ...plusSolution.finalAnswerLatex,
        ...minusSolution.finalAnswerLatex,
      ];

      addStep(
        solution.steps,
        'Final combined solutions',
        solution.finalAnswer.join('  OR  '),
        'Combined solutions from both ± branches.',
      );

      solution.verification = verifyEquationSolution(
        formula.split('=')[0].trim(),
        formula.split('=')[1] ? formula.split('=')[1].trim() : '0',
        solution.finalAnswer.map((a) => a.replace(/^x\s*=\s*/, '').trim()),
      );

      return solution;
    }

    const [leftSideRaw, rightSideRaw] = formula.split('=').map((s) => (s || '').trim());
    const leftSide = leftSideRaw || '';
    const rightSide = rightSideRaw || '';

    addStep(
      solution.steps,
      'Original equation',
      `${leftSide} = ${rightSide}`,
      'Starting with the given equation.',
    );

    if (
      leftSide.startsWith('sin(') ||
      leftSide.startsWith('cos(') ||
      leftSide.startsWith('tan(')
    ) {
      addStep(
        solution.steps,
        'Identify trig equation',
        `${leftSide} = ${rightSide}`,
        'Recognize trigonometric form and apply inverse trig rules.',
      );
      const val = (() => {
        try {
          return math.evaluate(rightSide);
        } catch {
          return rightSide;
        }
      })();

      let answers = [];
      if (leftSide.startsWith('sin(')) {
        answers.push(`asin(${val}) + 2k*pi`);
        answers.push(`pi - asin(${val}) + 2k*pi`);
      } else if (leftSide.startsWith('cos(')) {
        answers.push(`acos(${val}) + 2k*pi`);
        answers.push(`-acos(${val}) + 2k*pi`);
      } else if (leftSide.startsWith('tan(')) {
        answers.push(`atan(${val}) + k*pi`);
      }

      addStep(
        solution.steps,
        'Apply inverse trig',
        answers.join('  OR  '),
        'Applied inverse trigonometric identities to isolate x.',
      );

      solution.finalAnswer = answers.map((a) => `x = ${a}`);
      solution.finalAnswerLatex = solution.finalAnswer.map((a) => toLatex(a));

      solution.verification = verifyEquationSolution(
        leftSide,
        rightSide,
        solution.finalAnswer.map((a) => a.replace(/^x\s*=\s*/, '')),
      );

      return solution;
    }

    try {
      const rearranged = `(${leftSide}) - (${rightSide})`;
      addStep(
        solution.steps,
        'Rearrange to zero',
        `${rearranged} = 0`,
        'Bring all terms to the left-hand side.',
      );

      const simplified = cleanOutput(simplify(parse(rearranged)).toString());
      addStep(
        solution.steps,
        'Simplify LHS',
        simplified,
        'Simplify the left-hand side after moving terms.',
      );

      let answers = [];
      try {
        const fact = nerdamer(`factor(${simplified})`).toString();
        if (fact && fact !== simplified) {
          addStep(
            solution.steps,
            'Factor polynomial',
            fact,
            'Factor the polynomial to find roots.',
          );
        }
        const nerdSolution = nerdamer(`solve(${simplified}, x)`).toString();
        answers = nerdSolution
          .replace(/^[[]|[]]$/g, '')
          .split(',')
          .map((s) => cleanOutput(stripBrackets(s)))
          .filter((s) => s.length > 0);
      } catch (innerErr) {
        const nerdSolution2 = nerdamer(`solve((${leftSide})-(${rightSide}), x)`).toString();
        answers = nerdSolution2
          .replace(/^[[]|[]]$/g, '')
          .split(',')
          .map((s) => cleanOutput(stripBrackets(s)))
          .filter((s) => s.length > 0);
      }

      if (answers.length === 0) {
        const numeric = (() => {
          try {
            const sol = nerdamer(`solve((${leftSide})-(${rightSide}), x)`).toString();
            return sol;
          } catch (e) {
            return null;
          }
        })();
        if (numeric) {
          answers = numeric
            .replace(/^[[]|[]]$/g, '')
            .split(',')
            .map((s) => cleanOutput(stripBrackets(s)));
        }
      }

      solution.finalAnswer = answers.map((a) => `x = ${a}`);
      solution.finalAnswerLatex = answers.map((a) => `x = ${toLatex(a)}`);

      addStep(
        solution.steps,
        'Solve for x',
        solution.finalAnswer.join('  OR  '),
        'Compute roots/solutions from factorization or algebraic solve.',
      );

      solution.verification = verifyEquationSolution(leftSide, rightSide, answers);
    } catch (error) {
      addStep(
        solution.steps,
        'Algebraic solve fallback',
        'Using nerdamer solve as fallback',
        `Fallback due to: ${error.message}`,
      );
      const nerdSolution = nerdamer(`solve((${leftSide})-(${rightSide}), x)`).toString();
      const answers = nerdSolution
        .replace(/^[[]|[]]$/g, '')
        .split(',')
        .map((s) => cleanOutput(stripBrackets(s)))
        .filter((s) => s.length > 0);

      solution.finalAnswer = answers.map((a) => `x = ${a}`);
      solution.finalAnswerLatex = answers.map((a) => `x = ${toLatex(a)}`);
      addStep(
        solution.steps,
        'Final (fallback) solution',
        solution.finalAnswer.join('  OR  '),
        'Final answers from fallback solver.',
      );
      solution.verification = verifyEquationSolution(leftSide, rightSide, answers);
    }
  } catch (error) {
    solution.steps.push({
      step: solution.steps.length + 1,
      description: 'Error',
      expression: formula,
      expressionLatex: formula,
      explanation: `Unable to process equation: ${error.message}`,
    });
    solution.finalAnswer = ['Error in processing'];
    solution.finalAnswerLatex = ['Error in processing'];
  }
  return solution;
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

const solveDerivative = async (formula, solution) => {
  solution.explanation =
    'This is a derivative problem. I will find the derivative using differentiation rules.';
  try {
    let func = formula.replace(/d\/dx\s*/, '').trim().replace(/'/g, '');
    solution.steps.push({
      step: 1,
      description: 'Original function',
      expression: `f(x) = ${func}`,
      expressionLatex: `f(x) = ${toLatex(func)}`,
      explanation: 'Identifying the function to differentiate.',
    });

    const deriv = nerdamer(`diff(${func}, x)`).toString();
    const cleanedDeriv = cleanOutput(deriv);

    solution.steps.push({
      step: 2,
      description: 'Apply differentiation rules',
      expression: `f'(x) = ${cleanedDeriv}`,
      expressionLatex: `f'(x) = ${toLatex(cleanedDeriv)}`,
      explanation: 'Using calculus differentiation rules.',
    });

    solution.finalAnswer = cleanedDeriv;
    solution.finalAnswerLatex = toLatex(cleanedDeriv);
  } catch (error) {
    throw new Error(error.message);
  }
  return solution;
};

const solveIntegral = async (formula, solution) => {
  solution.explanation =
    'This is an integration problem. I will find the antiderivative.';
  try {
    let func = formula
      .replace(/∫/, '')
      .replace(/integral/i, '')
      .replace(/dx$/i, '')
      .trim();

    solution.steps.push({
      step: 1,
      description: 'Setup',
      expression: `∫ ${func} dx`,
      expressionLatex: `\\int ${toLatex(func)} \\, dx`,
      explanation: 'Starting with the given integral.',
    });

    const match = func.match(/^(.+?)\s*\*\s*(sin|cos)\(x\)$/i);
    if (match) {
      const poly = match[1];
      const trig = match[2].toLowerCase();

      solution.steps.push({
        step: 2,
        description: 'Integration by parts',
        expression: `u = ${poly}, dv = ${trig}(x) dx`,
        expressionLatex: `u=${toLatex(poly)}, dv=${trig}(x) dx`,
        explanation: 'Choose u as the polynomial and dv as trig function.',
      });

      const du = nerdamer(`diff(${poly}, x)`).toString();
      const v = trig === 'cos' ? 'sin(x)' : '-cos(x)';

      solution.steps.push({
        step: 3,
        description: 'Differentiate and integrate',
        expression: `du = ${du}, v = ${v}`,
        expressionLatex: `du=${toLatex(du)}, v=${toLatex(v)}`,
        explanation: 'Differentiate u and integrate dv.',
      });

      solution.steps.push({
        step: 4,
        description: 'Apply formula',
        expression: `∫ ${poly}*${trig}(x) dx = ${poly}*${v} - ∫ ${v}*(${du}) dx`,
        expressionLatex: `\\int ${toLatex(poly)} ${trig}(x) dx = ${toLatex(
          poly,
        )}${toLatex(v)} - \\int ${toLatex(v)}${toLatex(du)} dx`,
        explanation: 'Applying integration by parts formula.',
      });
    }

    const integral = nerdamer(`integrate(${func}, x)`).toString();
    const cleanedIntegral = cleanOutput(integral);

    solution.steps.push({
      step: solution.steps.length + 1,
      description: 'Final result',
      expression: `${cleanedIntegral} + C`,
      expressionLatex: `${toLatex(cleanedIntegral)} + C`,
      explanation: 'Simplified final antiderivative.',
    });

    solution.finalAnswer = `${cleanedIntegral} + C`;
    solution.finalAnswerLatex = `${toLatex(cleanedIntegral)} + C`;
  } catch (error) {
    solution.finalAnswer = 'Integration failed';
    solution.finalAnswerLatex = 'Integration failed';
  }
  return solution;
};

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
  getMathHelpData,
};

