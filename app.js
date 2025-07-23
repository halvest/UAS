// --- Impor Modul ---
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./database.js'); // Impor koneksi database
const client = require('prom-client'); // Impor klien Prometheus

// Buat instance aplikasi Express.
const app = express();
const register = new client.Registry();
// Tambahkan label default ke semua metrik yang diekspos.
register.setDefaultLabels({ app: 'login-app' });
// Kumpulkan metrik default (CPU, memori, dll.) dari Node.js.
client.collectDefaultMetrics({ register });

// Buat metrik kustom (Counter) untuk menghitung total permintaan login.
const loginCounter = new client.Counter({
    name: 'login_requests_total',
    help: 'Total login requests processed',
    labelNames: ['status'] // Label untuk membedakan 'success' atau 'error'.
});
register.registerMetric(loginCounter);

const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 0.5, 1, 1.5] 
});
register.registerMetric(httpRequestDurationMicroseconds);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'key-devops-project', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 } 
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ route: req.route ? req.route.path : req.path, code: res.statusCode, method: req.method });
  });
  next();
});

app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (ex) {
        console.error('Error serving /metrics:', ex); // LOG ERROR
        res.status(500).end(ex.message);
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

app.get('/', (req, res) => {
    if (req.session.isLoggedIn) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            console.error('Database error saat login:', err); // LOG ERROR
            return res.status(500).json({ success: false, message: 'Server error.' });
        }
        if (!user) {
            loginCounter.inc({ status: 'error' }); 
            console.warn(`Login gagal untuk user: ${username}`); // LOG GAGAL
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                req.session.isLoggedIn = true;
                req.session.username = username;
                loginCounter.inc({ status: 'success' }); 
                console.log(`Login berhasil untuk user: ${username}`); // LOG SUKSES
                res.status(200).json({ success: true, message: 'Login berhasil! Mengarahkan...' });
            } else {
                loginCounter.inc({ status: 'error' });
                console.warn(`Login gagal (password salah) untuk user: ${username}`); // LOG GAGAL
                res.status(401).json({ success: false, message: 'Username atau password salah.' });
            }
        });
    });
});

app.get('/dashboard', (req, res) => {
    if (req.session && req.session.isLoggedIn) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/'); 
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err); // LOG ERROR
            return res.status(500).json({ success: false, message: 'Gagal untuk logout.' });
        }
        console.log(`Logout berhasil untuk user: ${req.session?.username}`); // LOG SUKSES
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true, message: 'Logout berhasil.' });
    });
});

module.exports = { app, register };