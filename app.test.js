const request = require('supertest');
const { app, register } = require('./app');
const db = require('./database');
const bcrypt = require('bcrypt');
const client = require('prom-client');

describe('Authentication Endpoints', () => {

    it('GET / should return the login page', async () => {
        const response = await request(app).get('/');
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toMatch(/html/);
    });

    it('POST /login with wrong credentials should fail', async () => {
        const response = await request(app)
            .post('/login')
            .send({ username: 'salah', password: 'salah' });
        
        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Username atau password salah.');
    });

    it('POST /login with correct credentials should succeed', async () => {
        const response = await request(app)
            .post('/login')
            .send({ username: 'admin', password: 'admin1234' });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Login berhasil! Mengarahkan...');
        expect(response.headers['set-cookie']).toBeDefined();
    });

    it('POST /login should handle DB error', async () => {
        jest.spyOn(db, 'get').mockImplementationOnce((q, p, cb) => cb(new Error('DB error')));
        const response = await request(app)
            .post('/login')
            .send({ username: 'admin', password: 'admin1234' });
        expect(response.statusCode).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/Server error/);
        db.get.mockRestore();
    });

    it('POST /login should handle bcrypt error', async () => {
        jest.spyOn(db, 'get').mockImplementationOnce((q, p, cb) => cb(null, { username: 'admin', password: 'hash' }));
        jest.spyOn(bcrypt, 'compare').mockImplementationOnce((pw, hash, cb) => cb(new Error('bcrypt error')));
        const response = await request(app)
            .post('/login')
            .send({ username: 'admin', password: 'admin1234' });
        expect(response.statusCode).toBe(401); // Atau 500 jika ingin error
        db.get.mockRestore();
        bcrypt.compare.mockRestore();
    });
});

describe('Protected Endpoints', () => {
    let agent;
    beforeEach(async () => {
        agent = request.agent(app);
        await agent
            .post('/login')
            .send({ username: 'admin', password: 'admin1234' });
    });

    it('GET /dashboard without login should redirect to /', async () => {
        const response = await request(app).get('/dashboard');
        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe('/');
    });

    it('GET /dashboard with login should return the dashboard page', async () => {
        const response = await agent.get('/dashboard');
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toMatch(/html/);
    });

    it('POST /logout should handle session destroy error', async () => {
        const agent = request.agent(app);
        await agent
            .post('/login')
            .send({ username: 'admin', password: 'admin1234' });

        const destroyMock = jest.fn(cb => cb(new Error('destroy error')));
        app.request.session = { destroy: destroyMock };
        const response = await agent.post('/logout');
        expect(response.statusCode).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/Gagal untuk logout/);
        delete app.request.session;
    });
});

describe('Metrics Endpoint', () => {
    it('GET /metrics should handle error', async () => {
        jest.spyOn(register, 'metrics').mockImplementationOnce(() => { throw new Error('metrics error'); });
        const response = await request(app).get('/metrics');
        expect(response.statusCode).toBe(500);
        register.metrics.mockRestore();
    });
});