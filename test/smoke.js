const assert = require('assert');

const { generateStepByStepSolution } = require('../src/services/mathService');

async function run() {
  {
    const res = await generateStepByStepSolution('2+2');
    assert.strictEqual(res.type, 'expression');
    assert.strictEqual(res.finalAnswer, '4');
  }

  {
    const res = await generateStepByStepSolution('x^2 - 4x + 3 = 0');
    assert.strictEqual(res.type, 'equation');
    assert.ok(Array.isArray(res.steps) && res.steps.length > 0);
    assert.ok(Array.isArray(res.finalAnswer));
    assert.deepStrictEqual(new Set(res.finalAnswer), new Set(['x = 3', 'x = 1']));
    assert.ok(typeof res.parsedFormula === 'string' && res.parsedFormula.includes('\\'));
    assert.ok(typeof res.parsedFormulaText === 'string' && res.parsedFormulaText.includes('='));
  }

  {
    const res = await generateStepByStepSolution('sin^2(x) + cos^2(x)');
    assert.strictEqual(res.type, 'expression');
    assert.strictEqual(res.finalAnswer, '1');
  }

  {
    const res = await generateStepByStepSolution('d/dx(x^2 + 3x)');
    assert.strictEqual(res.type, 'derivative');
    assert.ok(typeof res.finalAnswer === 'string' && res.finalAnswer.length > 0);
  }

  {
    const res = await generateStepByStepSolution('∫x^2');
    assert.strictEqual(res.type, 'integral');
    assert.ok(typeof res.finalAnswer === 'string' && res.finalAnswer.includes('+ C'));
  }

  {
    const res = await generateStepByStepSolution('two x plus five equals thirteen');
    assert.strictEqual(res.type, 'equation');
    assert.ok(Array.isArray(res.finalAnswer));
    assert.ok(res.finalAnswer.includes('x = 4'));
  }

  {
    const res = await generateStepByStepSolution('2y + 5 = 13');
    assert.strictEqual(res.type, 'equation');
    assert.ok(Array.isArray(res.finalAnswer));
    assert.ok(res.finalAnswer.includes('y = 4'));
  }

  console.log('smoke tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
