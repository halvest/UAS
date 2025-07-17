const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./app.db', (err) => {
    if (err) {
        console.error('Error saat membuka database:', err.message);
    }
    console.log('Terhubung ke database SQLite.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`, (err) => {
        if (err) {
            return console.error('Error saat membuat tabel:', err.message);
        }

        const adminUser = 'admin';
        const adminPass = 'admin1234';

        db.get(`SELECT * FROM users WHERE username = ?`, [adminUser], (err, row) => {
            if (err) {
                return console.error('Error saat query user:', err.message);
            }
            if (!row) {
                bcrypt.hash(adminPass, 10, (err, hash) => {
                    if (err) {
                        return console.error('Error saat hashing password:', err.message);
                    }

                    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [adminUser, hash], (err) => {
                        if (err) {
                            return console.error('Error saat insert admin:', err.message);
                        }
                        console.log('Pengguna admin default telah dibuat.');
                    });
                });
            }
        });
    });
});

module.exports = db;
