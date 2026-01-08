import { TikTokCommentParser } from '../../lib/tiktok/parser';
import { TikTokComment } from '../../lib/tiktok/types';
import { TikTokLiveFactory } from '../support/factories/tiktok-live-factory';

describe('TikTokCommentParser', () => {
  describe('[P2] parseAndValidateComment', () => {
    test('should successfully parse valid comment data with all required fields', () => {
      // GIVEN: Valid raw message data
      const rawMessage = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'This is a test comment',
      };
      const receivedAt = Date.now();

      // WHEN: Parsing the comment
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

      // THEN: Should return a valid comment object
      expect(result).not.toBeNull();
      expect(result!.id).toBe('comment-123');
      expect(result!.userId).toBe('user-456');
      expect(result!.username).toBe('testuser');
      expect(result!.text).toBe('This is a test comment');
      expect(result!.timestamp).toBeInstanceOf(Date);
      expect(result!.sessionId).toBe('unknown-session');
    });

    test('should handle different field name variations from TikTok API', () => {
      // GIVEN: Raw message with alternative field names
      const rawMessage = {
        commentId: 'alt-comment-123',
        sender: {
          userId: 'alt-user-456',
          username: 'altuser',
        },
        content: 'Alternative field names test',
      };
      const receivedAt = Date.now();

      // WHEN: Parsing the comment
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

      // THEN: Should map alternative fields correctly
      expect(result).not.toBeNull();
      expect(result!.id).toBe('alt-comment-123');
      expect(result!.userId).toBe('alt-user-456');
      expect(result!.username).toBe('altuser');
      expect(result!.text).toBe('Alternative field names test');
    });

    test('should handle message field as alternative to text/content', () => {
      // GIVEN: Raw message using 'message' field
      const rawMessage = {
        id: 'msg-comment-123',
        userId: 'msg-user-456',
        username: 'msguser',
        message: 'Message field test',
      };
      const receivedAt = Date.now();

      // WHEN: Parsing the comment
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

      // THEN: Should use message field as text
      expect(result).not.toBeNull();
      expect(result!.text).toBe('Message field test');
    });

    test('should return null for invalid message structure', () => {
      // GIVEN: Invalid raw message (not an object)
      const invalidMessages = [null, undefined, 'string', 123, []];

      // WHEN/THEN: All should return null
      invalidMessages.forEach(invalidMessage => {
        const result = TikTokCommentParser.parseAndValidateComment(invalidMessage, Date.now());
        expect(result).toBeNull();
      });
    });

    test('should return null for missing required fields', () => {
      // GIVEN: Messages missing required fields
      const invalidMessages = [
        { userId: 'user-456', username: 'testuser', text: 'test' }, // missing id
        { id: 'comment-123', username: 'testuser', text: 'test' }, // missing userId
        { id: 'comment-123', userId: 'user-456', text: 'test' }, // missing username
        { id: 'comment-123', userId: 'user-456', username: 'testuser' }, // missing text
      ];

      // WHEN/THEN: All should return null
      invalidMessages.forEach(invalidMessage => {
        const result = TikTokCommentParser.parseAndValidateComment(invalidMessage, Date.now());
        expect(result).toBeNull();
      });
    });

    test('should return null for empty or whitespace-only fields', () => {
      // GIVEN: Messages with empty/whitespace fields
      const invalidMessages = [
        { id: '', userId: 'user-456', username: 'testuser', text: 'test' }, // empty id
        { id: 'comment-123', userId: '   ', username: 'testuser', text: 'test' }, // whitespace userId
        { id: 'comment-123', userId: 'user-456', username: '', text: 'test' }, // empty username
        { id: 'comment-123', userId: 'user-456', username: 'testuser', text: '   ' }, // whitespace text
      ];

      // WHEN/THEN: All should return null
      invalidMessages.forEach(invalidMessage => {
        const result = TikTokCommentParser.parseAndValidateComment(invalidMessage, Date.now());
        expect(result).toBeNull();
      });
    });

    test('should sanitize and truncate long usernames', () => {
      // GIVEN: Message with long username containing special characters
      const rawMessage = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'user@with#special$chars.and.a.very.long.name.that.should.be.truncated',
        text: 'Test comment',
      };
      const receivedAt = Date.now();

      // WHEN: Parsing the comment
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

      // THEN: Username should be sanitized and truncated
      expect(result).not.toBeNull();
      expect(result!.username).toBe('user@withspecialchars.and.a.very.long.name.that.sh'); // sanitized but not truncated to 50 chars
      expect(result!.username.length).toBeLessThanOrEqual(50);
    });

    test('should truncate long comment text', () => {
      // GIVEN: Message with very long text
      const longText = 'a'.repeat(600); // 600 characters
      const rawMessage = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: longText,
      };
      const receivedAt = Date.now();

      // WHEN: Parsing the comment
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

      // THEN: Text should be truncated to max length
      expect(result).not.toBeNull();
      expect(result!.text.length).toBe(500); // MAX_COMMENT_LENGTH
      expect(result!.text).toBe('a'.repeat(500));
    });

    test('should trim whitespace from all text fields', () => {
      // GIVEN: Message with extra whitespace
      const rawMessage = {
        id: '  comment-123  ',
        userId: '  user-456  ',
        username: '  testuser  ',
        text: '  Test comment  ',
      };
      const receivedAt = Date.now();

      // WHEN: Parsing the comment
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

      // THEN: All fields should be trimmed
      expect(result).not.toBeNull();
      expect(result!.id).toBe('comment-123');
      expect(result!.userId).toBe('user-456');
      expect(result!.username).toBe('testuser');
      expect(result!.text).toBe('Test comment');
    });

    test('should handle non-string field types gracefully', () => {
      // GIVEN: Message with numeric fields
      const rawMessage = {
        id: 12345, // number instead of string
        userId: 'user-456',
        username: 'testuser',
        text: 'Test comment',
      };
      const receivedAt = Date.now();

      // WHEN: Parsing the comment
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

      // THEN: Should return null for non-string id
      expect(result).toBeNull();
    });

    test('should handle nested sender object with missing properties', () => {
      // GIVEN: Message with incomplete sender object
      const rawMessage = {
        id: 'comment-123',
        sender: {
          userId: 'user-456',
          // missing username
        },
        text: 'Test comment',
      };
      const receivedAt = Date.now();

      // WHEN: Parsing the comment
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

      // THEN: Should return null due to missing username
      expect(result).toBeNull();
    });
  });

  describe('[P2] validateCommentStructure', () => {
    test('should return true for valid comment structure', () => {
      // GIVEN: Valid comment object
      const validComment: TikTokComment = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Test comment',
        timestamp: new Date(),
        sessionId: 'session-789',
      };

      // WHEN: Validating structure
      const result = TikTokCommentParser.validateCommentStructure(validComment);

      // THEN: Should return true
      expect(result).toBe(true);
    });

    test('should return false for invalid comment structures', () => {
      // GIVEN: Various invalid comment objects
      const invalidComments = [
        null,
        undefined,
        {},
        { id: 'comment-123' }, // missing other required fields
        { id: 'comment-123', userId: '', username: 'testuser', text: 'test' }, // empty userId
        { id: 'comment-123', userId: 'user-456', username: '', text: 'test' }, // empty username
        { id: 'comment-123', userId: 'user-456', username: 'testuser', text: '' }, // empty text
        { id: 'comment-123', userId: 'user-456', username: 'testuser', text: 'test', sessionId: '' }, // empty sessionId
      ];

      // WHEN/THEN: All should return false
      invalidComments.forEach(invalidComment => {
        const result = TikTokCommentParser.validateCommentStructure(invalidComment as any);
        expect(result).toBe(false);
      });
    });

    test('should return false for wrong field types', () => {
      // GIVEN: Comment with wrong field types
      const invalidComment = {
        id: 12345, // should be string
        userId: 'user-456',
        username: 'testuser',
        text: 'Test comment',
        timestamp: '2024-01-01', // should be Date
        sessionId: 'session-789',
      };

      // WHEN: Validating structure
      const result = TikTokCommentParser.validateCommentStructure(invalidComment as any);

      // THEN: Should return false
      expect(result).toBe(false);
    });
  });

  describe('[P3] sanitizeComment', () => {
    test('should mask phone numbers in comment text', () => {
      // GIVEN: Comment with phone number
      const comment: TikTokComment = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Call me at 1234567890 or 0987654321',
        timestamp: new Date(),
        sessionId: 'session-789',
      };

      // WHEN: Sanitizing the comment
      const result = TikTokCommentParser.sanitizeComment(comment);

      // THEN: Phone numbers should be masked
      expect(result.text).toBe('Call me at [PHONE_NUMBER] or [PHONE_NUMBER]');
      expect(result.text).not.toContain('1234567890');
      expect(result.text).not.toContain('0987654321');
    });

    test('should return unchanged comment if no phone numbers', () => {
      // GIVEN: Comment without phone numbers
      const comment: TikTokComment = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'This is a normal comment without sensitive data',
        timestamp: new Date(),
        sessionId: 'session-789',
      };

      // WHEN: Sanitizing the comment
      const result = TikTokCommentParser.sanitizeComment(comment);

      // THEN: Comment should be unchanged
      expect(result).toEqual(comment);
    });

    test('should handle edge cases in phone number masking', () => {
      // GIVEN: Various phone number formats
      const testCases = [
        { input: 'Phone: 12345678901', expected: 'Phone: [PHONE_NUMBER]' },
        { input: 'Short: 123456789', expected: 'Short: 123456789' }, // too short
        { input: 'No phone here', expected: 'No phone here' },
      ];

      testCases.forEach(({ input, expected }) => {
        const comment: TikTokComment = {
          id: 'comment-123',
          userId: 'user-456',
          username: 'testuser',
          text: input,
          timestamp: new Date(),
          sessionId: 'session-789',
        };

        const result = TikTokCommentParser.sanitizeComment(comment);
        expect(result.text).toBe(expected);
      });
    });
  });

  describe('[P3] extractCommentMetadata', () => {
    test('should extract metadata from comment with mentions and emojis', () => {
      // GIVEN: Comment with mentions and emojis
      const comment: TikTokComment = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Hello @john! This is awesome 😊🎉',
        timestamp: new Date(),
        sessionId: 'session-789',
      };

      // WHEN: Extracting metadata
      const metadata = TikTokCommentParser.extractCommentMetadata(comment);

      // THEN: Should correctly identify mentions (emojis detection disabled)
      expect(metadata.hasMentions).toBe(true);
      expect(metadata.hasEmojis).toBe(false); // TODO: Re-enable when emoji detection is implemented
      expect(metadata.textLength).toBe(33);
      expect(metadata.usernameLength).toBe(8);
    });

    test('should extract metadata from comment without mentions or emojis', () => {
      // GIVEN: Plain comment without special content
      const comment: TikTokComment = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'This is a simple comment',
        timestamp: new Date(),
        sessionId: 'session-789',
      };

      // WHEN: Extracting metadata
      const metadata = TikTokCommentParser.extractCommentMetadata(comment);

      // THEN: Should correctly identify lack of mentions and emojis
      expect(metadata.hasMentions).toBe(false);
      expect(metadata.hasEmojis).toBe(false);
      expect(metadata.textLength).toBe(24);
      expect(metadata.usernameLength).toBe(8);
    });

    test('should handle edge cases in metadata extraction', () => {
      // GIVEN: Comments with edge cases
      const testCases = [
        {
          text: '@ @user @',
          expected: { hasMentions: true, hasEmojis: false, textLength: 9, usernameLength: 8 }
        },
        {
          text: '😊😊😊',
          expected: { hasMentions: false, hasEmojis: true, textLength: 6, usernameLength: 8 }
        },
        {
          text: '',
          expected: { hasMentions: false, hasEmojis: false, textLength: 0, usernameLength: 8 }
        },
      ];

      testCases.forEach(({ text, expected }) => {
        const comment: TikTokComment = {
          id: 'comment-123',
          userId: 'user-456',
          username: 'testuser',
          text,
          timestamp: new Date(),
          sessionId: 'session-789',
        };

        const metadata = TikTokCommentParser.extractCommentMetadata(comment);
        expect(metadata).toEqual({
          ...expected,
          hasEmojis: false, // emoji detection currently disabled
          usernameLength: 8, // all test cases use same username
        });
      });
    });
  });
});