const { configure } = require('@testing-library/react');
require('@testing-library/jest-dom');

// Mock pour les APIs WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
}));

// Mock pour requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock pour performance.memory
Object.defineProperty(window, 'performance', {
  value: {
    ...window.performance,
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 2172649472,
    },
    now: () => Date.now(),
  },
  writable: true,
});

// Mock pour ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Configuration des tests React
configure({
  testIdAttribute: 'data-testid',
});

// Mock pour Next.js Request/Response
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers || {});
      this._body = init.body;
    }

    async json() {
      return JSON.parse(this._body || '{}');
    }

    text() {
      return Promise.resolve(this._body || '');
    }
  };
}

if (typeof global.URL === 'undefined') {
  global.URL = class URL {
    constructor(url, base) {
      this._url = new (require('url').URL)(url, base);
      this.href = this._url.href;
      this.searchParams = this._url.searchParams;
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this._body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Headers(init.headers || {});
      this.ok = this.status >= 200 && this.status < 300;
    }

    async json() {
      return typeof this._body === 'string' ? JSON.parse(this._body) : this._body;
    }

    async text() {
      return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
    }
  };
}

// Mock NextResponse
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: (body, init = {}) => {
        return new Response(JSON.stringify(body), {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init.headers,
          },
        });
      },
    },
  };
});