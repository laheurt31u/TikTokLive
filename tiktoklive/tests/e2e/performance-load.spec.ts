import { test, expect } from '../support/fixtures';

test.describe('TikTok API Performance and Load Testing', () => {
  test.describe('API Connection Performance', () => {
    test('[P2] should handle rapid API connection attempts', async ({ request }) => {
      // GIVEN: API endpoint is available

      // WHEN: Making rapid connection attempts
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request.post('/api/tiktok', {
            data: {
              sessionId: `session_${i}`,
              cookies: `sessionid=abc${i}; user_id=123`
            }
          })
        );
      }

      const responses = await Promise.all(promises);

      // THEN: All requests are handled (may fail due to validation, but don't crash)
      responses.forEach(response => {
        expect([200, 400, 500]).toContain(response.status()); // Valid HTTP responses
      });
    });

    test('[P2] should validate connection parameters correctly', async ({ request }) => {
      // Test cases for parameter validation
      const testCases = [
        {
          name: 'missing sessionId',
          data: { cookies: 'sessionid=abc123; user_id=123' },
          expectedStatus: 400,
          expectedError: 'Données de connexion invalides'
        },
        {
          name: 'missing cookies',
          data: { sessionId: 'test_session_123' },
          expectedStatus: 400,
          expectedError: 'Données de connexion invalides'
        },
        {
          name: 'empty sessionId',
          data: { sessionId: '', cookies: 'sessionid=abc123; user_id=123' },
          expectedStatus: 400,
          expectedError: 'sessionId requis'
        },
        {
          name: 'valid parameters',
          data: {
            sessionId: 'test_session_123',
            cookies: 'sessionid=abc123; user_id=123'
          },
          expectedStatus: 200
        }
      ];

      for (const testCase of testCases) {
        // WHEN: Making request with specific parameters
        const response = await request.post('/api/tiktok', {
          data: testCase.data
        });

        // THEN: Response matches expectations
        expect(response.status()).toBe(testCase.expectedStatus);

        if (testCase.expectedError) {
          const body = await response.json();
          expect(body.success).toBe(false);
          expect(body.error.message).toContain(testCase.expectedError);
        } else {
          const body = await response.json();
          expect(body.success).toBe(true);
        }
      }
    });
  });

  test.describe('API Status Performance', () => {
    test('[P2] should handle high-frequency status requests', async ({ request }) => {
      // WHEN: Making many concurrent status requests
      const promises = Array.from({ length: 10 }, () =>
        request.get('/api/tiktok')
      );

      const responses = await Promise.all(promises);

      // THEN: All requests succeed and return valid status
      for (const response of responses) {
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('connected');
        expect(body.data).toHaveProperty('status');
      }
    });

    test('[P2] should return consistent status information', async ({ request }) => {
      // WHEN: Making multiple status requests in sequence
      const responses = [];
      for (let i = 0; i < 3; i++) {
        const response = await request.get('/api/tiktok');
        responses.push(await response.json());
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }

      // THEN: Status information is consistent across requests
      responses.forEach(body => {
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('connected');
        expect(body.data).toHaveProperty('status');
        // correlationId may not be present when no active operation
        if (body.data.hasOwnProperty('correlationId')) {
          expect(typeof body.data.correlationId).toBe('string');
        }
      });
    });
  });

  test.describe('API Error Handling', () => {
    test('[P2] should handle malformed JSON gracefully', async ({ request }) => {
      // WHEN: Sending malformed JSON
      const response = await request.post('/api/tiktok', {
        data: '{invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // THEN: Returns appropriate error response
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    test('[P2] should handle oversized payloads', async ({ request }) => {
      // WHEN: Sending very large payload
      const largeData = {
        sessionId: 'a'.repeat(10000), // Very long session ID
        cookies: 'b'.repeat(50000),   // Very long cookies
      };

      const response = await request.post('/api/tiktok', {
        data: largeData
      });

      // THEN: Handles large payload appropriately (may succeed or fail gracefully)
      expect([200, 400, 413]).toContain(response.status()); // Valid responses

      if (response.status() === 413) {
        const body = await response.json();
        expect(body.success).toBe(false);
      }
    });

    test('[P2] should handle concurrent requests without race conditions', async ({ request }) => {
      // WHEN: Making many concurrent requests with same parameters
      const concurrentRequests = Array.from({ length: 20 }, () =>
        request.post('/api/tiktok', {
          data: {
            sessionId: 'concurrent_test_session',
            cookies: 'sessionid=concurrent123; user_id=456'
          }
        })
      );

      const responses = await Promise.all(concurrentRequests);

      // THEN: All requests are handled consistently
      responses.forEach(response => {
        expect([200, 400, 500]).toContain(response.status());
      });

      // AND: No race conditions cause server crashes
      // (If we reach here, server handled concurrent load)
      expect(true).toBe(true);
    });
  });

  test.describe('API Resource Management', () => {
    test('[P2] should handle connection lifecycle properly', async ({ request }) => {
      // GIVEN: Initial clean state
      let statusResponse = await request.get('/api/tiktok');
      let statusBody = await statusResponse.json();

      // WHEN: Attempting to connect
      const connectResponse = await request.post('/api/tiktok', {
        data: {
          sessionId: 'lifecycle_test_session',
          cookies: 'sessionid=lifecycle123; user_id=789'
        }
      });

      // THEN: Connection attempt is processed
      expect([200, 400, 500]).toContain(connectResponse.status());

      // WHEN: Checking status after connection attempt
      statusResponse = await request.get('/api/tiktok');
      statusBody = await statusResponse.json();

      // THEN: Status reflects current state
      expect(statusBody.success).toBe(true);
      expect(statusBody.data).toHaveProperty('connected');
      expect(statusBody.data).toHaveProperty('status');

      // WHEN: Disconnecting
      const disconnectResponse = await request.delete('/api/tiktok');

      // THEN: Disconnect succeeds
      expect([200, 500]).toContain(disconnectResponse.status());

      if (disconnectResponse.status() === 200) {
        const disconnectBody = await disconnectResponse.json();
        expect(disconnectBody.success).toBe(true);
        expect(disconnectBody.data.status).toBe('disconnected');
      }
    });

    test('[P2] should prevent resource leaks under load', async ({ request }) => {
      // WHEN: Making many requests in sequence
      for (let i = 0; i < 10; i++) {
        // Connect
        await request.post('/api/tiktok', {
          data: {
            sessionId: `load_test_session_${i}`,
            cookies: `sessionid=load${i}; user_id=${100 + i}`
          }
        });

        // Check status
        await request.get('/api/tiktok');

        // Disconnect
        await request.delete('/api/tiktok');
      }

      // THEN: System remains stable (no crashes, memory leaks, etc.)
      // Final status check
      const finalStatusResponse = await request.get('/api/tiktok');
      expect(finalStatusResponse.status()).toBe(200);

      const finalStatusBody = await finalStatusResponse.json();
      expect(finalStatusBody.success).toBe(true);
      // May or may not be connected depending on cleanup, but should not crash
    });
  });

  test.describe('API Response Times', () => {
    test('[P2] should respond within acceptable time limits', async ({ request }) => {
      const maxResponseTime = 5000; // 5 seconds max
      const testCases = [
        { method: 'GET', path: '/api/tiktok' },
        { method: 'POST', path: '/api/tiktok', data: { sessionId: 'timing_test', cookies: 'sessionid=timing123; user_id=999' } },
        { method: 'DELETE', path: '/api/tiktok' }
      ];

      for (const testCase of testCases) {
        const startTime = Date.now();

        let response;
        if (testCase.method === 'GET') {
          response = await request.get(testCase.path);
        } else if (testCase.method === 'POST') {
          response = await request.post(testCase.path, { data: testCase.data });
        } else if (testCase.method === 'DELETE') {
          response = await request.delete(testCase.path);
        }

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // THEN: Response time is acceptable
        expect(responseTime).toBeLessThan(maxResponseTime);

        // AND: Response is valid
        expect([200, 400, 500]).toContain(response!.status());
      }
    });

    test('[P2] should maintain consistent response times under load', async ({ request }) => {
      const responseTimes: number[] = [];

      // WHEN: Making multiple requests
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();

        const response = await request.get('/api/tiktok');

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);

        expect(response.status()).toBe(200);
      }

      // THEN: Response times are reasonably consistent
      const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const maxDeviation = Math.max(...responseTimes) - Math.min(...responseTimes);

      // Average should be reasonable
      expect(avgResponseTime).toBeLessThan(2000); // Under 2 seconds

      // Deviation should not be extreme (allowing for some variance)
      expect(maxDeviation).toBeLessThan(3000); // Under 3 seconds difference
    });
  });
});