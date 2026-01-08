import { faker } from '@faker-js/faker';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAuthenticated: boolean;
  roomId?: string;
}

export class UserFactory {
  /**
   * Create a test user with random data
   */
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
      isAuthenticated: false,
      ...overrides,
    };
  }

  /**
   * Create multiple test users
   */
  static createUsers(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }

  /**
   * Create an authenticated user (with session)
   */
  static async createAuthenticatedUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const user = this.createUser({
      isAuthenticated: true,
      roomId: faker.string.uuid(),
      ...overrides,
    });

    // In a real implementation, this would:
    // 1. Create user in test database
    // 2. Generate authentication token
    // 3. Store session data

    // For now, just return the user object
    return user;
  }

  /**
   * Clean up test user data
   */
  static async cleanup(userId: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Remove user from test database
    // 2. Clean up any associated sessions
    // 3. Remove uploaded files/images

    console.log(`Cleaning up test user: ${userId}`);
  }

  /**
   * Create a TikTok viewer user
   */
  static createTikTokViewer(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      name: faker.internet.username(), // TikTok-style usernames
      avatar: faker.image.avatar(),
      ...overrides,
    });
  }

  /**
   * Create a room moderator user
   */
  static createModerator(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      name: `${faker.person.firstName()} (Mod)`,
      ...overrides,
    });
  }
}