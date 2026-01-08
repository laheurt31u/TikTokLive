/**
 * Tests d'intégration pour l'API REST /api/questions
 */

// Mock next/server avec NextResponse fonctionnel
jest.mock('next/server', () => {
  const MockResponse = class extends Response {
    constructor(body, init = {}) {
      super(typeof body === 'string' ? body : JSON.stringify(body), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
      this._jsonBody = typeof body === 'string' ? JSON.parse(body) : body;
    }

    async json() {
      return this._jsonBody;
    }
  };

  return {
    NextRequest: class extends Request {},
    NextResponse: {
      json: (body: any, init?: { status?: number; headers?: HeadersInit }) => {
        return new MockResponse(body, init);
      },
    },
  };
});

// Mock uuid avant d'importer correlation
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-correlation-id-12345')
}));

// Mock CorrelationManager avant d'importer route
jest.mock('@/lib/logger/correlation', () => ({
  CorrelationManager: {
    generateId: jest.fn(() => 'test-correlation-id-12345')
  }
}));

// Mock le service de questions
jest.mock('@/lib/gamification/questions');

import { GET } from '@/app/api/questions/route';
import { loadQuestionsFromFile, clearCache } from '@/lib/gamification/questions';

describe('GET /api/questions', () => {
  const mockQuestions = [
    {
      id: 'q1',
      text: 'Question facile',
      answers: ['Answer 1'],
      difficulty: 'facile' as const,
      points: 10,
      category: 'test'
    },
    {
      id: 'q2',
      text: 'Question moyenne',
      answers: ['Answer 2'],
      difficulty: 'moyen' as const,
      points: 20,
      category: 'test'
    },
    {
      id: 'q3',
      text: 'Question difficile',
      answers: ['Answer 3'],
      difficulty: 'difficile' as const,
      points: 30,
      category: 'test'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
  });

  it('should return all questions successfully', async () => {
    (loadQuestionsFromFile as jest.Mock).mockResolvedValue({
      success: true,
      data: mockQuestions
    });

    const request = new Request('http://localhost:3000/api/questions');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(3);
    expect(data.meta).toEqual({
      total: 3,
      filtered: 3
    });
  });

  it('should filter questions by difficulty', async () => {
    (loadQuestionsFromFile as jest.Mock).mockResolvedValue({
      success: true,
      data: mockQuestions
    });

    const request = new Request('http://localhost:3000/api/questions?difficulty=facile');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].difficulty).toBe('facile');
    expect(data.meta).toEqual({
      total: 3,
      filtered: 1
    });
  });

  it('should support pagination with limit and offset', async () => {
    (loadQuestionsFromFile as jest.Mock).mockResolvedValue({
      success: true,
      data: mockQuestions
    });

    const request = new Request('http://localhost:3000/api/questions?limit=2&offset=1');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.meta).toEqual({
      total: 3,
      filtered: 3,
      limit: 2,
      offset: 1,
      hasMore: true
    });
  });

  it('should combine difficulty filter and pagination', async () => {
    (loadQuestionsFromFile as jest.Mock).mockResolvedValue({
      success: true,
      data: mockQuestions
    });

    const request = new Request('http://localhost:3000/api/questions?difficulty=moyen&limit=1');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].difficulty).toBe('moyen');
  });

  it('should return 500 when questions fail to load', async () => {
    (loadQuestionsFromFile as jest.Mock).mockResolvedValue({
      success: false,
      error: {
        code: 'LOAD_ERROR',
        message: 'Erreur lors du chargement'
      }
    });

    const request = new Request('http://localhost:3000/api/questions');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should return 400 for invalid difficulty parameter', async () => {
    (loadQuestionsFromFile as jest.Mock).mockResolvedValue({
      success: true,
      data: mockQuestions
    });

    const request = new Request('http://localhost:3000/api/questions?difficulty=invalid');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should return empty array when no questions match filter', async () => {
    (loadQuestionsFromFile as jest.Mock).mockResolvedValue({
      success: true,
      data: [mockQuestions[0]] // Only easy question
    });

    const request = new Request('http://localhost:3000/api/questions?difficulty=difficile');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
    expect(data.meta.filtered).toBe(0);
  });
});
