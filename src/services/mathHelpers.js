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

module.exports = {
  math,
  parse,
  simplify,
  nerdamer,
  parseInput,
  toLatex,
  cleanOutput,
  stripBrackets,
  determineFormulaType,
  addStep,
  verifyEquationSolution,
  handleSpecialFormulas,
};

