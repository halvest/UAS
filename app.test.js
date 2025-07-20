const request = require('supertest');
const app = require('./app');
const db = require('./database');

afterAll((done) => {
    db.close(err => {
        if (err) {
            console.error('Error closing the database', err.message);
            done(err);
            return;
        }
        console.log('Database connection closed for testing.');
        done();
    });
});

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
    });

    it('POST /login with correct credentials should succeed', async () => {
        const response = await request(app)
            .post('/login')
            .send({ username: 'admin', password: 'admin1234' });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Login berhasil! Mengarahkan...');
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
        const unauthenticatedAgent = request.agent(app);
        const response = await unauthenticatedAgent.get('/dashboard');
        
        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe('/');
    });

    it('GET /dashboard with login should return the dashboard page', async () => {
        const response = await agent.get('/dashboard'); 
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toMatch(/html/);
    });

    it('POST /logout should destroy the session and redirect', async () => {
        const logoutResponse = await agent.post('/logout');
        expect(logoutResponse.statusCode).toBe(302);
        expect(logoutResponse.headers.location).toBe('/');

        const dashboardResponse = await agent.get('/dashboard');
        expect(dashboardResponse.statusCode).toBe(302);
        expect(dashboardResponse.headers.location).toBe('/');
    });
});
