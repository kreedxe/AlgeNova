const {
  math,
  parse,
  simplify,
  nerdamer,
  cleanOutput,
  stripBrackets,
  addStep,
  verifyEquationSolution,
  toLatex,
} = require('./mathHelpers');

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

module.exports = {
  solveEquation,
};

