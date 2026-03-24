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

const trySolveQuadratic = ({ simplified, leftSide, rightSide, solution }) => {
  try {
    const degree = nerdamer(`deg(${simplified}, x)`).toString();
    if (degree !== '2') return null;

    const coeffsRaw = nerdamer(`coeffs(${simplified}, x)`).toString(); // [c,b,a]
    const coeffs = coeffsRaw
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(',')
      .map((s) => cleanOutput(stripBrackets(s)))
      .filter(Boolean);
    if (coeffs.length !== 3) return null;

    const [c, b, a] = coeffs;
    const aSimplified = nerdamer(`simplify(${a})`).toString();
    if (aSimplified === '0') return null;

    addStep(
      solution.steps,
      'Recognize quadratic form',
      `${simplified} = 0`,
      'The simplified equation is a quadratic polynomial in x (degree 2).',
    );
    addStep(
      solution.steps,
      'Identify coefficients',
      `a = ${a}, b = ${b}, c = ${c}`,
      'Match the polynomial to ax^2 + bx + c = 0.',
    );

    const discriminant = cleanOutput(nerdamer(`simplify((${b})^2 - 4*(${a})*(${c}))`).toString());
    addStep(
      solution.steps,
      'Compute discriminant',
      `Δ = b^2 - 4ac = ${discriminant}`,
      'Use the discriminant to determine the roots.',
    );

    const rootPlus = cleanOutput(
      nerdamer(`simplify((-((${b})) + sqrt(${discriminant}))/(2*(${a})))`).toString(),
    );
    const rootMinus = cleanOutput(
      nerdamer(`simplify((-((${b})) - sqrt(${discriminant}))/(2*(${a})))`).toString(),
    );

    addStep(
      solution.steps,
      'Apply quadratic formula',
      `x = (-b ± √Δ) / (2a)`,
      'Quadratic formula gives up to two solutions.',
    );

    addStep(
      solution.steps,
      'Solve for x (plus)',
      `x₁ = (-b + √Δ) / (2a) = ${rootPlus}`,
      'Substitute the +√Δ branch into the quadratic formula.',
    );

    addStep(
      solution.steps,
      'Solve for x (minus)',
      `x₂ = (-b - √Δ) / (2a) = ${rootMinus}`,
      'Substitute the -√Δ branch into the quadratic formula.',
    );

    const roots = [rootPlus, rootMinus].filter((v, i, arr) => arr.indexOf(v) === i);
    const answers = roots.map((r) => `x = ${r}`);

    addStep(
      solution.steps,
      'Solutions',
      answers.join('  OR  '),
      'List the solution set for the quadratic equation.',
    );

    const factored = nerdamer(`factor(${simplified})`).toString();
    if (factored && factored !== simplified) {
      addStep(
        solution.steps,
        'Optional check (factoring)',
        factored,
        'Factoring can confirm the same roots when the polynomial is factorable.',
      );
    }

    return {
      finalAnswer: answers,
      finalAnswerLatex: roots.map((r) => `x = ${toLatex(r)}`),
      verification: verifyEquationSolution(leftSide, rightSide, roots),
    };
  } catch {
    return null;
  }
};

const trySolvePolynomial = ({ simplified, leftSide, rightSide, solution }) => {
  try {
    const degreeStr = nerdamer(`deg(${simplified}, x)`).toString();
    if (!/^\d+$/.test(degreeStr)) return null;
    const degree = Number(degreeStr);
    if (!Number.isFinite(degree) || degree < 3) return null;

    addStep(
      solution.steps,
      'Recognize polynomial form',
      `${simplified} = 0`,
      `The simplified equation is a polynomial in x of degree ${degree}.`,
    );

    const factored = nerdamer(`factor(${simplified})`).toString();
    // Only show factoring when it meaningfully factors (typically introduces parentheses / products).
    if (factored && factored !== simplified && /[()]/.test(factored)) {
      addStep(
        solution.steps,
        'Factor polynomial',
        factored,
        'Factor the polynomial to make its roots easier to find.',
      );
    }

    const nerdRoots = nerdamer(`roots(${simplified}, x)`).toString();
    const roots = nerdRoots
      .replace(/^[[]|[]]$/g, '')
      .split(',')
      .map((s) => cleanOutput(stripBrackets(s)))
      .filter((s) => s.length > 0);

    if (roots.length === 0) return null;

    roots.forEach((r, idx) => {
      addStep(
        solution.steps,
        `Solve for x (root ${idx + 1})`,
        `x${roots.length > 1 ? `_${idx + 1}` : ''} = ${r}`,
        'Root obtained from solving the polynomial equation.',
      );
    });

    const answers = roots.map((r) => `x = ${r}`);
    addStep(
      solution.steps,
      'Solutions',
      answers.join('  OR  '),
      'List the solution set for the polynomial equation.',
    );

    return {
      finalAnswer: answers,
      finalAnswerLatex: roots.map((r) => `x = ${toLatex(r)}`),
      verification: verifyEquationSolution(leftSide, rightSide, roots),
    };
  } catch {
    return null;
  }
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

      const quadraticResult = trySolveQuadratic({
        simplified,
        leftSide,
        rightSide,
        solution,
      });
      if (quadraticResult) {
        solution.finalAnswer = quadraticResult.finalAnswer;
        solution.finalAnswerLatex = quadraticResult.finalAnswerLatex;
        solution.verification = quadraticResult.verification;
        return solution;
      }

      const polyResult = trySolvePolynomial({
        simplified,
        leftSide,
        rightSide,
        solution,
      });
      if (polyResult) {
        solution.finalAnswer = polyResult.finalAnswer;
        solution.finalAnswerLatex = polyResult.finalAnswerLatex;
        solution.verification = polyResult.verification;
        return solution;
      }

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

