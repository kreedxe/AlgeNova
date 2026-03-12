const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { env, port } = require('./config');
const logger = require('./logger');
const healthController = require('./controllers/healthController');
const mathRoutes = require('./routes/mathRoutes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env === 'production' ? 'combined' : 'dev'));

app.get('/health', healthController.liveness);
app.get('/health/ready', healthController.readiness);

app.use('/api/math', mathRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server listening on http://localhost:${port}`, { env });
});

