'use strict';

// Set required env vars before any module is loaded
process.env.GEMINI_API_KEY = 'test-key';
process.env.DATABASE_URL   = 'postgresql://test:test@localhost:5432/test';
process.env.FRONTEND_ORIGIN = 'http://localhost:5500';

// ── Prisma mock ───────────────────────────────────────────────
const mockCreate     = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate     = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    session: { create: mockCreate, findUnique: mockFindUnique, update: mockUpdate },
  })),
}));

// ── Gemini mock ───────────────────────────────────────────────
jest.mock('../services/gemini', () => ({
  generateLetterAndProfile: jest.fn(),
  chatReply: jest.fn(),
}));

const request = require('supertest');
const app     = require('../app');

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Health check ──────────────────────────────────────────────
describe('GET /health', () => {
  test('returns 200 with status ok and a timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ── Unknown routes ────────────────────────────────────────────
describe('Unknown routes', () => {
  test('returns 404 for an unregistered path', async () => {
    const res = await request(app).get('/not-a-real-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});

// ── POST /api/sessions — input validation ─────────────────────
describe('POST /api/sessions — validation', () => {
  test('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ relationship: 'grandmother', thingsNeverSaid: 'I miss you' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('returns 400 when relationship is missing', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ name: 'Grandma Rose', thingsNeverSaid: 'I miss you' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('returns 400 when thingsNeverSaid is missing', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ name: 'Grandma Rose', relationship: 'grandmother' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('returns 202 with id when all required fields are present', async () => {
    const fakeId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    mockCreate.mockResolvedValueOnce({ id: fakeId, status: 'pending' });

    const res = await request(app)
      .post('/api/sessions')
      .send({
        name:            'Grandma Rose',
        relationship:    'grandmother',
        thingsNeverSaid: 'I never told you how much I loved you.',
      });

    expect(res.status).toBe(202);
    expect(res.body.id).toBe(fakeId);
    expect(res.body.status).toBe('pending');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

// ── GET /api/sessions/:id/status — polling endpoint ──────────
describe('GET /api/sessions/:id/status', () => {
  test('returns 404 when session does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/sessions/nonexistent/status');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('returns status and null letter when still pending', async () => {
    mockFindUnique.mockResolvedValueOnce({ status: 'pending', letter: null });
    const res = await request(app).get('/api/sessions/some-id/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.letter).toBeNull();
  });

  test('returns status and letter text when ready', async () => {
    mockFindUnique.mockResolvedValueOnce({
      status: 'ready',
      letter: 'Dear you, I wanted to say...',
    });
    const res = await request(app).get('/api/sessions/some-id/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.letter).toBe('Dear you, I wanted to say...');
  });
});

// ── POST /api/sessions/:id/chat ───────────────────────────────
describe('POST /api/sessions/:id/chat', () => {
  test('returns 400 when message is empty', async () => {
    const res = await request(app)
      .post('/api/sessions/some-id/chat')
      .send({ message: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('returns 404 when session does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/sessions/ghost-id/chat')
      .send({ message: 'Hello' });
    expect(res.status).toBe(404);
  });

  test('returns 409 when session is not ready yet', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'some-id',
      status: 'pending',
      persona_profile: null,
      chat_history: [],
    });
    const res = await request(app)
      .post('/api/sessions/some-id/chat')
      .send({ message: 'Hello' });
    expect(res.status).toBe(409);
  });

  test('returns reply when session is ready', async () => {
    const { chatReply } = require('../services/gemini');
    chatReply.mockResolvedValueOnce('I love you too.');

    mockFindUnique.mockResolvedValueOnce({
      id: 'some-id',
      status: 'ready',
      persona_profile: { tone: 'warm' },
      chat_history: [],
    });
    mockUpdate.mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/sessions/some-id/chat')
      .send({ message: 'I miss you so much.' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('I love you too.');
  });
});
