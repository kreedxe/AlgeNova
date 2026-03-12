const dotenv = require('dotenv');

dotenv.config();

const env = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT) || 3000;

module.exports = {
  env,
  port,
};

