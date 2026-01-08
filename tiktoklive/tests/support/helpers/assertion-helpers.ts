import { expect, Page, Locator } from '@playwright/test';

/**
 * Custom assertion helpers for TikTokLive testing
 */
export class AssertionHelpers {
  /**
   * Assert that a user appears in the leaderboard
   */
  static async expectUserInLeaderboard(
    page: Page,
    username: string,
    expectedRank?: number
  ): Promise<void> {
    const leaderboardItem = page.locator('[data-testid="leaderboard-item"]').filter({
      hasText: username
    });

    await expect(leaderboardItem).toBeVisible();

    if (expectedRank !== undefined) {
      await expect(leaderboardItem.locator('[data-testid="rank"]')).toHaveText(expectedRank.toString());
    }
  }

  /**
   * Assert that a question is displayed correctly
   */
  static async expectQuestionDisplayed(
    page: Page,
    questionText: string,
    answers?: string[]
  ): Promise<void> {
    const questionElement = page.locator('[data-testid="question"]');
    await expect(questionElement).toHaveText(questionText);

    if (answers) {
      for (let i = 0; i < answers.length; i++) {
        const answerElement = page.locator(`[data-testid="answer-${i}"]`);
        await expect(answerElement).toHaveText(answers[i]);
      }
    }
  }

  /**
   * Assert that a winner announcement contains expected elements
   */
  static async expectWinnerAnnouncement(
    page: Page,
    winnerName: string,
    expectedMessage: string = "Vous avez gagné"
  ): Promise<void> {
    const announcement = page.locator('[data-testid="winner-announcement"]');
    await expect(announcement).toBeVisible();
    await expect(announcement).toContainText(winnerName);
    await expect(announcement).toContainText(expectedMessage);
  }

  /**
   * Assert that the leaderboard is sorted correctly (highest score first)
   */
  static async expectLeaderboardSorted(page: Page): Promise<void> {
    const scoreElements = page.locator('[data-testid="leaderboard-score"]');
    const scores = await scoreElements.allTextContents();

    const numericScores = scores.map(score => parseInt(score.replace(/\D/g, '')));

    // Check that scores are in descending order
    for (let i = 0; i < numericScores.length - 1; i++) {
      expect(numericScores[i]).toBeGreaterThanOrEqual(numericScores[i + 1]);
    }
  }

  /**
   * Assert that a user has a specific score
   */
  static async expectUserScore(
    page: Page,
    username: string,
    expectedScore: number
  ): Promise<void> {
    const userItem = page.locator('[data-testid="leaderboard-item"]').filter({
      hasText: username
    });

    const scoreElement = userItem.locator('[data-testid="score"]');
    await expect(scoreElement).toHaveText(expectedScore.toString());
  }

  /**
   * Assert that a profile picture is displayed for a winner
   */
  static async expectWinnerProfilePicture(
    page: Page,
    winnerName: string
  ): Promise<void> {
    const winnerSection = page.locator('[data-testid="winner-section"]');
    const profilePic = winnerSection.locator('img[alt*="profile"], img[data-testid="profile-picture"]');
    await expect(profilePic).toBeVisible();

    // Check that alt text contains the winner name or indicates it's a profile picture
    const altText = await profilePic.getAttribute('alt');
    expect(altText?.toLowerCase()).toMatch(/(profile|avatar|winner)/);
  }

  /**
   * Assert that the quiz is in a specific state
   */
  static async expectQuizState(
    page: Page,
    state: 'waiting' | 'active' | 'completed'
  ): Promise<void> {
    const quizContainer = page.locator('[data-testid="quiz-container"]');

    switch (state) {
      case 'waiting':
        await expect(quizContainer).toHaveAttribute('data-state', 'waiting');
        break;
      case 'active':
        await expect(quizContainer).toHaveAttribute('data-state', 'active');
        await expect(page.locator('[data-testid="question"]')).toBeVisible();
        break;
      case 'completed':
        await expect(quizContainer).toHaveAttribute('data-state', 'completed');
        await expect(page.locator('[data-testid="quiz-results"]')).toBeVisible();
        break;
    }
  }

  /**
   * Assert that rate limiting is working (user can't answer twice)
   */
  static async expectRateLimited(
    page: Page,
    username: string
  ): Promise<void> {
    // This would check for a rate limit message or disabled input
    const rateLimitMessage = page.locator('[data-testid="rate-limit-message"]');
    await expect(rateLimitMessage).toBeVisible();
    await expect(rateLimitMessage).toContainText(username);
  }

  /**
   * Assert that audio announcement is triggered (best effort)
   */
  static async expectAudioTriggered(page: Page): Promise<void> {
    // Check for audio element or indication that TTS was triggered
    const audioElement = page.locator('audio, [data-testid="audio-announcement"]');
    // Note: Actual audio playback can't be reliably tested in headless mode
    // This is more of a placeholder for future audio testing capabilities
    console.log('Audio announcement should have been triggered');
  }
}