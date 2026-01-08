/**
 * Mock pour next/server pour les tests Jest
 */

class MockResponse extends Response {
  constructor(body, init = {}) {
    super(body, init);
    this._body = body;
    this.status = init.status || 200;
  }

  async json() {
    return typeof this._body === 'string' ? JSON.parse(this._body) : this._body;
  }
}

class MockNextResponse {
  static json(body, init = {}) {
    return new MockResponse(JSON.stringify(body), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  }
}

module.exports = {
  NextRequest: class NextRequest extends Request {
    constructor(input, init = {}) {
      super(input, init);
    }
  },
  NextResponse: MockNextResponse,
};
