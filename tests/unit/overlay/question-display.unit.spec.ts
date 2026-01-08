/**
 * Tests unitaires pour le composant QuestionDisplay
 */

import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { QuestionDisplay } from '@/components/overlay/QuestionDisplay';

describe('QuestionDisplay', () => {
  const mockQuestion = {
    id: 'q1',
    text: 'Quelle est la capitale de la France ?',
    difficulty: 'easy' as const,
    timeLimit: 30
  };

  const mockWinner = {
    username: 'testuser',
    profileImage: 'https://example.com/avatar.jpg',
    points: 10
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render question with difficulty badge', () => {
    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={null} />);

    expect(screen.getByText('Quelle est la capitale de la France ?')).toBeInTheDocument();
    expect(screen.getByText('🟢 FACILE')).toBeInTheDocument();
    expect(screen.getByText('(10 pts)')).toBeInTheDocument();
  });

  it('should show countdown timer', () => {
    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={null} />);

    expect(screen.getByText('25s')).toBeInTheDocument();
  });

  it('should display different difficulty levels correctly', () => {
    const hardQuestion = { ...mockQuestion, difficulty: 'hard' as const };

    render(<QuestionDisplay question={hardQuestion} timeLeft={25} winner={null} />);

    expect(screen.getByText('🔴 DIFFICILE')).toBeInTheDocument();
    expect(screen.getByText('(30 pts)')).toBeInTheDocument();
  });

  it('should show call-to-action for chat response', () => {
    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={null} />);

    expect(screen.getByText('Répondez dans le chat TikTok !')).toBeInTheDocument();
  });

  it('should not render when no question provided', () => {
    render(<QuestionDisplay question={null} timeLeft={0} winner={null} />);

    expect(screen.queryByText(/Répondez dans le chat/)).not.toBeInTheDocument();
  });

  it('should show winner celebration overlay', async () => {
    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={mockWinner} />);

    await waitFor(() => {
      expect(screen.getByText('VOUS AVEZ GAGNÉ !')).toBeInTheDocument();
      expect(screen.getByText('Félicitations @testuser')).toBeInTheDocument();
      expect(screen.getByText('+10 points')).toBeInTheDocument();
    });
  });

  it('should display winner avatar when available', async () => {
    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={mockWinner} />);

    await waitFor(() => {
      const avatar = document.querySelector('img[alt*="testuser"]');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  it('should show default avatar when no profile image', async () => {
    const winnerWithoutImage = { ...mockWinner, profileImage: undefined };

    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={winnerWithoutImage} />);

    await waitFor(() => {
      const defaultAvatar = document.querySelector('.bg-gradient-to-br');
      expect(defaultAvatar).toBeInTheDocument();
    });
  });

  it('should apply GPU acceleration classes', () => {
    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={null} />);

    const acceleratedElements = document.querySelectorAll('.gpu-accelerated');
    expect(acceleratedElements.length).toBeGreaterThan(0);
  });

  it('should hide winner celebration after timeout', async () => {
    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={mockWinner} />);

    // Attendre que la célébration apparaisse
    await waitFor(() => {
      expect(screen.getByText('VOUS AVEZ GAGNÉ !')).toBeInTheDocument();
    });

    // Avancer le temps de 5 secondes (durée de la célébration)
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText('VOUS AVEZ GAGNÉ !')).not.toBeInTheDocument();
    });
  });

  it('should show performance metrics in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={null} />);

    const debugInfo = document.querySelector('.bg-black\\/80');
    expect(debugInfo).toBeInTheDocument();
    expect(screen.getByText(/Frame drops:/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show performance metrics in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={null} />);

    const debugInfo = document.querySelector('.bg-black\\/80');
    expect(debugInfo).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should have circular progress indicator', () => {
    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={null} />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
  });

  it('should animate question appearance', () => {
    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={null} />);

    const questionContainer = document.querySelector('.transition-all');
    expect(questionContainer).toHaveClass('duration-500', 'ease-out');
  });

  it('should create celebration particles', async () => {
    render(<QuestionDisplay question={mockQuestion} timeLeft={25} winner={mockWinner} />);

    await waitFor(() => {
      const particles = document.querySelectorAll('.animate-ping');
      expect(particles.length).toBeGreaterThan(0);
    });
  });
});