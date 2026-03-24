const { nerdamer, cleanOutput, stripBrackets, toLatex } = require('./mathHelpers');

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
    const cleanedDeriv = cleanOutput(stripBrackets(deriv));

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
        expressionLatex: `u = ${toLatex(poly)},\\; dv = ${toLatex(`${trig}(x)`)}\\,dx`,
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
        )}${toLatex(v)} - \\int ${toLatex(v)}\\cdot ${toLatex(du)}\\,dx`,
        explanation: 'Applying integration by parts formula.',
      });
    }

    const integral = nerdamer(`integrate(${func}, x)`).toString();
    const cleanedIntegral = cleanOutput(stripBrackets(integral));

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

module.exports = {
  solveDerivative,
  solveIntegral,
};

