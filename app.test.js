const request = require('supertest');
const app = require('./app'); 

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

    it('POST /logout should destroy the session', async () => {
        const response = await agent.post('/logout');
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Logout berhasil.');

        const subsequentResponse = await agent.get('/dashboard');
        expect(subsequentResponse.statusCode).toBe(302);
        expect(subsequentResponse.headers.location).toBe('/');
    });
});
