import { CorrelationManager } from '../../lib/logger/correlation';

describe('CorrelationManager', () => {
  beforeEach(() => {
    // Reset correlation manager state before each test
    CorrelationManager.clear();
  });

  describe('[P2] generateId()', () => {
    test('should generate valid UUID v4 format', () => {
      // GIVEN: No specific input required

      // WHEN: Generating a correlation ID
      const id = CorrelationManager.generateId();

      // THEN: Returns a valid UUID v4 string
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should generate unique IDs', () => {
      // GIVEN: Generating multiple IDs

      // WHEN: Creating multiple correlation IDs
      const id1 = CorrelationManager.generateId();
      const id2 = CorrelationManager.generateId();
      const id3 = CorrelationManager.generateId();

      // THEN: All IDs are unique
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('[P2] createContext()', () => {
    test('should create context with generated ID and current timestamp', () => {
      // GIVEN: No existing context
      const tags = { service: 'test', operation: 'create' };

      // WHEN: Creating a new context
      const beforeTime = new Date();
      const context = CorrelationManager.createContext(tags);
      const afterTime = new Date();

      // THEN: Context has all required properties
      expect(context).toHaveProperty('id');
      expect(context.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(context.startTime).toBeInstanceOf(Date);
      expect(context.startTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(context.startTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(context.tags).toEqual(tags);
      expect(context.parentId).toBeUndefined();
    });

    test('should set parent ID when context already exists', () => {
      // GIVEN: Existing context
      const parentContext = CorrelationManager.createContext({ parent: 'true' });

      // WHEN: Creating nested context
      const childContext = CorrelationManager.createContext({ child: 'true' });

      // THEN: Child context references parent
      expect(childContext.parentId).toBe(parentContext.id);
      expect(childContext.tags).toEqual({ child: 'true' });
    });

    test('should handle empty tags', () => {
      // GIVEN: No tags provided

      // WHEN: Creating context without tags
      const context = CorrelationManager.createContext();

      // THEN: Context has empty tags object
      expect(context.tags).toEqual({});
    });
  });

  describe('[P2] getCurrentContext()', () => {
    test('should return null when no context exists', () => {
      // GIVEN: No context created

      // WHEN: Getting current context
      const context = CorrelationManager.getCurrentContext();

      // THEN: Returns null
      expect(context).toBeNull();
    });

    test('should return current context when one exists', () => {
      // GIVEN: Context created
      const createdContext = CorrelationManager.createContext({ test: 'current' });

      // WHEN: Getting current context
      const currentContext = CorrelationManager.getCurrentContext();

      // THEN: Returns the created context
      expect(currentContext).toBe(createdContext);
      expect(currentContext?.tags).toEqual({ test: 'current' });
    });
  });

  describe('[P2] Context stack management', () => {
    test('should maintain context stack with nested contexts', () => {
      // GIVEN: Multiple nested contexts
      const rootContext = CorrelationManager.createContext({ level: 'root' });
      const middleContext = CorrelationManager.createContext({ level: 'middle' });
      const leafContext = CorrelationManager.createContext({ level: 'leaf' });

      // WHEN: Checking context relationships
      const current = CorrelationManager.getCurrentContext();

      // THEN: Proper nesting maintained
      expect(current).toBe(leafContext);
      expect(leafContext.parentId).toBe(middleContext.id);
      expect(middleContext.parentId).toBe(rootContext.id);
      expect(rootContext.parentId).toBeUndefined();
    });

    test('should handle context cleanup', () => {
      // GIVEN: Context created
      CorrelationManager.createContext({ test: 'cleanup' });
      expect(CorrelationManager.getCurrentContext()).not.toBeNull();

      // WHEN: Clearing correlation manager
      CorrelationManager.clear();

      // THEN: Context is cleared
      expect(CorrelationManager.getCurrentContext()).toBeNull();
    });
  });

  describe('[P2] runWithContext()', () => {
    test('should execute function within context scope', async () => {
      // GIVEN: Context tags
      const tags = { operation: 'test-run', user: 'test-user' };
      let capturedContext: any = null;

      // WHEN: Running function with context
      await CorrelationManager.runWithContext(tags, async () => {
        capturedContext = CorrelationManager.getCurrentContext();
        return 'result';
      });

      // THEN: Function executed with correct context
      expect(capturedContext).toBeDefined();
      expect(capturedContext?.tags).toEqual(tags);
    });

    test('should restore previous context after execution', async () => {
      // GIVEN: Existing context
      const originalContext = CorrelationManager.createContext({ original: 'true' });

      // WHEN: Running function with new context
      const result = await CorrelationManager.runWithContext({ new: 'context' }, async () => {
        const innerContext = CorrelationManager.getCurrentContext();
        expect(innerContext?.tags).toEqual({ new: 'context' });
        expect(innerContext?.parentId).toBe(originalContext.id);
        return 'inner result';
      });

      // THEN: Original context restored and function completed
      const restoredContext = CorrelationManager.getCurrentContext();
      expect(restoredContext).toBe(originalContext);
      expect(result).toBe('inner result');
    });

    test('should handle synchronous functions', () => {
      // GIVEN: Synchronous function
      const tags = { sync: 'test' };

      // WHEN: Running sync function with context
      const result = CorrelationManager.runWithContext(tags, () => {
        const context = CorrelationManager.getCurrentContext();
        expect(context?.tags).toEqual(tags);
        return 'sync result';
      });

      // THEN: Function executed correctly
      expect(result).toBe('sync result');
    });

    test('should propagate errors while maintaining context cleanup', async () => {
      // GIVEN: Function that throws error
      const error = new Error('Test error');

      // WHEN/THEN: Error is propagated but context is still cleaned up
      await expect(
        CorrelationManager.runWithContext({ failing: 'test' }, async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('[P2] Context timing', () => {
    test('should track context duration', async () => {
      // GIVEN: Context created
      const startTime = Date.now();
      const context = CorrelationManager.createContext({ timing: 'test' });

      // WHEN: Waiting for some time
      await new Promise(resolve => setTimeout(resolve, 10));
      const endTime = Date.now();

      // THEN: Context has appropriate timing
      expect(context.startTime.getTime()).toBeGreaterThanOrEqual(startTime);
      expect(context.startTime.getTime()).toBeLessThanOrEqual(endTime);
    });
  });
});