const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const autoHost = require('./auto-host');

const app = express();
const allowedOrigins = [process.env.CORS_ORIGIN, process.env.RENDER_EXTERNAL_URL].filter(Boolean).flatMap(value => value.split(',')).map(origin => origin.trim()).filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  const database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ ok: true, service: 'chrisco-master-server', database, autoHost: autoHost.state });
});
app.use('/api/share', require('./routes/share'));
app.use('/api/camp', require('./routes/camp'));
app.use('/api/combat', require('./routes/combat'));

app.use((err, _req, res, _next) => {
  console.error('Request failed:', err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection failed:', err.message));
} else {
  console.warn('MONGODB_URI is not set. Quiz static files will work; camp and combat APIs return 503.');
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 24/7 Master Server running on port ${PORT}`);
  autoHost.startAutoHost();
});
async function stopServer() {
  await autoHost.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', stopServer);
process.on('SIGINT', stopServer);

module.exports = app;
