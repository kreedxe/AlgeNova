# AlgeNova Backend

Backend server for the AlgeNova test-taking platform.

## Tech stack

- **Runtime**: Node.js (CommonJS, JavaScript-only)
- **Web framework**: Express
- **Logging**: `morgan` (HTTP logs) + custom `src/logger.js`
- **Config**: `.env` via `dotenv`
- **Math engine**: `mathjs` + `nerdamer`

## Requirements

- **Node.js**: \(>= 18\)

## Getting started

Install dependencies:

```bash
npm install
```

Create/update environment variables:

- Create `.env` in project root (do **not** commit it; use `.env.example` as a template):

```bash
NODE_ENV=development
PORT=3000
```

Run in development (auto-restart):

```bash
npm run dev
```

Run in production:

```bash
npm start
```

## NPM scripts

- **`npm start`**: starts server via `node src/server.js`
- **`npm run dev`**: starts server via `nodemon src/server.js` (auto-restart)
- **`npm test`**: runs a small smoke test suite (`test/smoke.js`)

## Project structure

```text
.
├─ src/
│  ├─ server.js                   # express app wiring + listen()
│  ├─ config.js                   # dotenv + env/port exports
│  ├─ logger.js                   # small structured logger
│  ├─ controllers/
│  │  ├─ healthController.js
│  │  └─ mathController.js        # HTTP glue only (uses services)
│  ├─ services/
│  │  ├─ mathService.js           # orchestration + public API
│  │  ├─ mathHelpers.js           # shared math/latex helpers
│  │  ├─ equationService.js       # equation solving logic
│  │  ├─ expressionService.js     # expression evaluation logic
│  │  └─ calculusService.js       # derivatives & integrals
│  ├─ routes/
│  │  └─ mathRoutes.js            # /api/math router
│  ├─ middlewares/
│  │  ├─ requestContext.js        # request id + timing headers
│  │  ├─ notFound.js              # 404 -> error
│  │  └─ errorHandler.js          # error -> JSON + logging
│  └─ utils/
│     └─ parser.js                # parseInput helper
```

## API base URL

By default the server listens on:

- `http://localhost:3000` (or whatever `PORT` is set to)

## Response conventions

### Errors

For errors, responses are JSON:

```json
{ "error": "Not Found", "requestId": "..." }
```

Status codes and headers:

- `404` for unknown routes
- `400` for invalid input on endpoints like math solver
- `500` for unexpected server errors
- Every response includes `X-Request-Id` and `X-Response-Time-ms` headers for tracing.

## Endpoints

### Health

#### `GET /health`

Liveness probe.

**Response (200)**:

```json
{
  "status": "ok",
  "env": "development",
  "uptime": 12.345,
  "timestamp": "2026-03-12T00:00:00.000Z"
}
```

#### `GET /health/ready`

Readiness probe.

**Response (200)**:

```json
{
  "status": "ready",
  "env": "development",
  "uptime": 12.345,
  "timestamp": "2026-03-12T00:00:00.000Z"
}
```

### Math API

All math routes are under:

- **Base path**: `/api/math`

#### `GET /api/math/help`

Returns supported operations and example inputs.

**Response (200)**:

```json
{
  "supportedOperations": [
    "Linear, quadratic, polynomial equations",
    "Equations with sqrt, log, sin, cos, tan",
    "Expression evaluation (simplify + calculate)",
    "Derivatives (d/dx)",
    "Integrals (basic antiderivative)"
  ],
  "examples": [
    { "type": "Linear Equation", "input": "2x + 5 = 13" },
    { "type": "Quadratic Equation", "input": "x^2 - 4 = 0" },
    { "type": "Square Root Equation", "input": "sqrt(x+4) = 6" },
    { "type": "Logarithmic Equation", "input": "log(x) = 2" },
    { "type": "Trigonometric Equation", "input": "sin(x) = 0.5" },
    { "type": "Derivative", "input": "d/dx(x^2 + 3x)" },
    { "type": "Integral", "input": "∫x^2" }
  ]
}
```

#### `POST /api/math/solve`

General solver. Detects the formula type (equation, expression, derivative, integral) and returns a step-by-step JSON solution.

**Request body**:

```json
{ "formula": "2x + 5 = 13" }
```

**Response (200)** (shape overview):

```json
{
  "originalFormula": "2x + 5 = 13",
  "parsedFormula": "\\left(2\\cdot x+5\\right) = 13",
  "parsedFormulaText": "2x + 5 = 13",
  "type": "equation",
  "explanation": "…",
  "steps": [
    {
      "step": 1,
      "description": "Original equation",
      "expression": "2x + 5 = 13",
      "expressionLatex": "…",
      "explanation": "…"
    }
  ],
  "finalAnswer": ["x = 4"],
  "finalAnswerLatex": ["x = 4"],
  "verification": [
    {
      "solution": "x = 4",
      "solutionLatex": "x = 4",
      "leftSide": "2x + 5 → 13",
      "rightSide": "13 → 13",
      "isCorrect": true
    }
  ]
}
```

**Response (400)** (missing or invalid input):

```json
{
  "error": "No formula provided. Please provide a mathematical expression to solve.",
  "example": { "formula": "2x + 5 = 13" }
}
```

or:

```json
{
  "error": "Invalid or unsupported formula.",
  "details": "…",
  "formula": "..."
}
```

#### `POST /api/math/solve/equation`

Solve **only equations**; returns 400 if the formula is not classified as an equation.

#### `POST /api/math/solve/expression`

Evaluate **only expressions**.

#### `POST /api/math/solve/derivative`

Solve **only derivatives**.

#### `POST /api/math/solve/integral`

Solve **only integrals**.

Each typed endpoint accepts the same request body as `/api/math/solve`:

```json
{ "formula": "d/dx(x^2 + 3x)" }
```

#### `POST /api/math/validate`

Validate and classify a formula without relying on the frontend to parse it.

**Request body**:

```json
{ "formula": "2x + 5 = 13" }
```

**Response (200)**:

```json
{
  "originalFormula": "2x + 5 = 13",
  "parsedFormula": "2\\cdot x+5 = 13",
  "parsedFormulaText": "2x + 5 = 13",
  "type": "equation",
  "isSpecial": false,
  "valid": true,
  "error": null
}
```

## Notes on math output

- **`parsedFormula` is LaTeX**: use it directly in the frontend renderer.
- **`parsedFormulaText` is the normalized plain-text form** used internally by the solver.
- **Polynomials without `= 0`** (e.g. `x^3 + 2x^2 - 5`) are interpreted as `= 0` automatically.
- **Polynomial roots (degree ≥ 3)**: the API may return complex roots (with `i`). Verification supports complex numbers.

## Deployment

### Docker

Build and run:

```bash
docker build -t algenova-backend .
docker run --rm -p 3000:3000 -e PORT=3000 algenova-backend
```

Health check:

```bash
curl http://localhost:3000/health
```

#### `POST /api/math/solve/batch`

Solve multiple formulas in a single request.

**Request body**:

```json
{
  "formulas": [
    "2x + 5 = 13",
    "d/dx(x^2 + 3x)",
    "∫x^2"
  ]
}
```

**Response (200)**:

```json
{
  "count": 3,
  "results": [
    {
      "index": 0,
      "formula": "2x + 5 = 13",
      "ok": true,
      "solution": { "...": "..." }
    },
    {
      "index": 1,
      "formula": "d/dx(x^2 + 3x)",
      "ok": true,
      "solution": { "...": "..." }
    },
    {
      "index": 2,
      "formula": "∫x^2",
      "ok": true,
      "solution": { "...": "..." }
    }
  ]
}
```

If solving a particular formula fails, `ok` is `false` and `error` is populated for that entry.

## Curl examples

Health:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
```

Math help:

```bash
curl http://localhost:3000/api/math/help
```

Solve (auto-detect type):

```bash
curl -X POST http://localhost:3000/api/math/solve \
  -H "Content-Type: application/json" \
  -d '{"formula":"2x + 5 = 13"}'
```

Solve derivative only:

```bash
curl -X POST http://localhost:3000/api/math/solve/derivative \
  -H "Content-Type: application/json" \
  -d '{"formula":"d/dx(x^2 + 3x)"}'
```

Batch solve:

```bash
curl -X POST http://localhost:3000/api/math/solve/batch \
  -H "Content-Type: application/json" \
  -d '{"formulas":["2x + 5 = 13","d/dx(x^2 + 3x)","∫x^2"]}'
```

## Notes

- This project is intentionally **CommonJS** and **JavaScript-only**.
- If you want to expand math features, prefer adding new logic in `src/services/` and keep controllers thin.
