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
  detectPrimaryVariable,
} = require('./mathHelpers');

const trySolveQuadratic = ({ simplified, leftSide, rightSide, solution, variable }) => {
  try {
    const degree = nerdamer(`deg(${simplified}, ${variable})`).toString();
    if (degree !== '2') return null;

    const coeffsRaw = nerdamer(`coeffs(${simplified}, ${variable})`).toString(); // [c,b,a]
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
      `The simplified equation is a quadratic polynomial in ${variable} (degree 2).`,
    );
    addStep(
      solution.steps,
      'Identify coefficients',
      `a = ${a}, b = ${b}, c = ${c}`,
      'Match the polynomial to a·v^2 + b·v + c = 0 (where v is the variable).',
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
      `${variable} = (-b ± √Δ) / (2a)`,
      'Quadratic formula gives up to two solutions.',
    );

    addStep(
      solution.steps,
      `Solve for ${variable} (plus)`,
      `${variable}₁ = (-b + √Δ) / (2a) = ${rootPlus}`,
      'Substitute the +√Δ branch into the quadratic formula.',
    );

    addStep(
      solution.steps,
      `Solve for ${variable} (minus)`,
      `${variable}₂ = (-b - √Δ) / (2a) = ${rootMinus}`,
      'Substitute the -√Δ branch into the quadratic formula.',
    );

    const roots = [rootPlus, rootMinus].filter((v, i, arr) => arr.indexOf(v) === i);
    const answers = roots.map((r) => `${variable} = ${r}`);

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
      finalAnswerLatex: roots.map((r) => `${variable} = ${toLatex(r)}`),
      verification: verifyEquationSolution(leftSide, rightSide, roots, variable),
    };
  } catch {
    return null;
  }
};

const trySolvePolynomial = ({ simplified, leftSide, rightSide, solution, variable }) => {
  try {
    const degreeStr = nerdamer(`deg(${simplified}, ${variable})`).toString();
    if (!/^\d+$/.test(degreeStr)) return null;
    const degree = Number(degreeStr);
    if (!Number.isFinite(degree) || degree < 3) return null;

    addStep(
      solution.steps,
      'Recognize polynomial form',
      `${simplified} = 0`,
      `The simplified equation is a polynomial in ${variable} of degree ${degree}.`,
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

    const nerdRoots = nerdamer(`roots(${simplified}, ${variable})`).toString();
    const roots = nerdRoots
      .replace(/^[[]|[]]$/g, '')
      .split(',')
      .map((s) => cleanOutput(stripBrackets(s)))
      .filter((s) => s.length > 0);

    if (roots.length === 0) return null;

    roots.forEach((r, idx) => {
      addStep(
        solution.steps,
        `Solve for ${variable} (root ${idx + 1})`,
        `${variable}${roots.length > 1 ? `_${idx + 1}` : ''} = ${r}`,
        'Root obtained from solving the polynomial equation.',
      );
    });

    const answers = roots.map((r) => `${variable} = ${r}`);
    addStep(
      solution.steps,
      'Solutions',
      answers.join('  OR  '),
      'List the solution set for the polynomial equation.',
    );

    return {
      finalAnswer: answers,
      finalAnswerLatex: roots.map((r) => `${variable} = ${toLatex(r)}`),
      verification: verifyEquationSolution(leftSide, rightSide, roots, variable),
    };
  } catch {
    return null;
  }
};

const solveEquation = async (formula, solution) => {
  solution.explanation =
    'This is an algebraic or transcendental equation. I will solve for the unknown variable by isolating it on one side.';
  try {
    const variable = detectPrimaryVariable(formula);
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
        solution.finalAnswer.map((a) =>
          a.replace(new RegExp(`^\\s*${variable}\\s*=\\s*`), '').trim(),
        ),
        variable,
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
        `Applied inverse trigonometric identities to isolate ${variable}.`,
      );

      solution.finalAnswer = answers.map((a) => `${variable} = ${a}`);
      solution.finalAnswerLatex = solution.finalAnswer.map((a) => toLatex(a));

      solution.verification = verifyEquationSolution(
        leftSide,
        rightSide,
        solution.finalAnswer.map((a) => a.replace(new RegExp(`^\\s*${variable}\\s*=\\s*`), '')),
        variable,
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
        variable,
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
        variable,
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
        const nerdSolution = nerdamer(`solve(${simplified}, ${variable})`).toString();
        answers = nerdSolution
          .replace(/^[[]|[]]$/g, '')
          .split(',')
          .map((s) => cleanOutput(stripBrackets(s)))
          .filter((s) => s.length > 0);
      } catch (innerErr) {
        const nerdSolution2 = nerdamer(`solve((${leftSide})-(${rightSide}), ${variable})`).toString();
        answers = nerdSolution2
          .replace(/^[[]|[]]$/g, '')
          .split(',')
          .map((s) => cleanOutput(stripBrackets(s)))
          .filter((s) => s.length > 0);
      }

      if (answers.length === 0) {
        const numeric = (() => {
          try {
            const sol = nerdamer(`solve((${leftSide})-(${rightSide}), ${variable})`).toString();
            return sol;
          } catch (e) {
            return null;
          }
        })();
        if (numeric) {
          answers = numeric
            .replace(/^[[]|[]]$/g, '')
            .split(',')
            .map((s) => cleanOutput(stripBrackets(s)))
            .filter((s) => s.length > 0);
        }
      }

      solution.finalAnswer = answers.map((a) => `${variable} = ${a}`);
      solution.finalAnswerLatex = answers.map((a) => `${variable} = ${toLatex(a)}`);

      addStep(
        solution.steps,
        `Solve for ${variable}`,
        solution.finalAnswer.join('  OR  '),
        'Compute roots/solutions from factorization or algebraic solve.',
      );

      solution.verification = verifyEquationSolution(leftSide, rightSide, answers, variable);
    } catch (error) {
      addStep(
        solution.steps,
        'Algebraic solve fallback',
        'Using nerdamer solve as fallback',
        `Fallback due to: ${error.message}`,
      );
      const nerdSolution = nerdamer(`solve((${leftSide})-(${rightSide}), ${variable})`).toString();
      const answers = nerdSolution
        .replace(/^[[]|[]]$/g, '')
        .split(',')
        .map((s) => cleanOutput(stripBrackets(s)))
        .filter((s) => s.length > 0);

      solution.finalAnswer = answers.map((a) => `${variable} = ${a}`);
      solution.finalAnswerLatex = answers.map((a) => `${variable} = ${toLatex(a)}`);
      addStep(
        solution.steps,
        'Final (fallback) solution',
        solution.finalAnswer.join('  OR  '),
        'Final answers from fallback solver.',
      );
      solution.verification = verifyEquationSolution(leftSide, rightSide, answers, variable);
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
