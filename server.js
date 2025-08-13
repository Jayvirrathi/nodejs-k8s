const express = require('express');
const mongoose = require('mongoose');
const client = require('prom-client');

const { createLogger, format, transports } = require('winston');
const LokiTransport = require('winston-loki');
const expressWinston = require('express-winston');

const app = express();
app.use(express.json());

// ---------- Winston + Loki ----------
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.json(),
  transports: [
    // Ship to Loki
    new LokiTransport({
      // Self-hosted: http://loki:3100 ; Grafana Cloud: your HTTPS Loki push URL
      host: process.env.LOKI_URL || 'http://loki:3100',
      labels: { app: 'node-api', env: process.env.NODE_ENV || 'dev' },
      // Good defaults for throughput
      batching: true,
      interval: 5, // seconds
      // For Grafana Cloud or protected Loki, set "username:password" or "tenant_id:api_key"
      basicAuth: process.env.LOKI_BASIC_AUTH || undefined,
      // If your endpoint needs custom headers, you can add: headers: { 'X-Scope-OrgID': 'your-tenant' }
      // json: true,        // (default true) send JSON
      // replaceTimestamp: false
    }),
    // Also print to console (useful locally / for Promtail scraping)
    new transports.Console(),
  ],
});

// Structured HTTP access logs -> Winston (and thus Loki)
app.use(
  expressWinston.logger({
    winstonInstance: logger,
    meta: true,
    // Include route pattern so you can aggregate in Grafana
    dynamicMeta: (req, res) => ({
      route: req.route?.path || req.path,
    }),
    // Simple message; details live in meta
    msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}}',
    expressFormat: false,
    colorize: false,
    ignoreRoute: () => false,
  })
);

// ---------- MongoDB connection ----------
mongoose
  .connect('mongodb://mongo:27017/nodedb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => logger.error({ err }, 'MongoDB connection error'));

// ---------- Prometheus metrics ----------
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5],
});
register.registerMetric(httpRequestDurationSeconds);

// Observe request durations
app.use((req, res, next) => {
  const end = httpRequestDurationSeconds.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      code: res.statusCode,
    });
  });
  next();
});

// ---------- Routes ----------
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// test fail
// app.get('/healthz', (_req, res) => res.status(500).send('ok'));

app.get('/ready', async (_req, res) => {
  try {
    // await mongoose.connection.db.admin().ping();
    res.status(200).send('ready');
  } catch (err) {
    res.status(503).send('not ready');
  }
});


// Simple model
const User = mongoose.model('User', new mongoose.Schema({ name: String }));

app.post('/users', async (req, res, next) => {
  try {
    const user = new User({ name: req.body.name });
    await user.save();
    res.send(user);
  } catch (err) {
    next(err);
  }
});

app.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
  res.send(users);
  } catch (err) {
    next(err);
  }
});

// Error logger -> Winston/Loki
app.use(
  expressWinston.errorLogger({
    winstonInstance: logger,
  })
);

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

// Optional: flush on shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down…');
  // winston-loki batches automatically; process exit will flush
  process.exit(0);
});
