/**
 * Tests unitaires pour la page overlay principale
 */

import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import OverlayPage from '@/app/overlay/page';

// Mock des composants
jest.mock('@/components/overlay/QuestionDisplay', () => ({
  QuestionDisplay: ({ question, timeLeft, winner }: any) => (
    <div data-testid="question-display">
      {question && <div>Question: {question.text}</div>}
      <div>Time: {timeLeft}</div>
      {winner && <div>Winner: {winner.username}</div>}
    </div>
  )
}));

jest.mock('@/components/overlay/Leaderboard', () => ({
  Leaderboard: ({ entries }: any) => (
    <div data-testid="leaderboard">
      {entries.map((entry: any, index: number) => (
        <div key={entry.username} data-testid={`leaderboard-entry-${index}`}>
          {entry.username}: {entry.points}
        </div>
      ))}
    </div>
  )
}));

describe('OverlayPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render overlay structure', () => {
    render(<OverlayPage />);

    expect(screen.getByTestId('question-display')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
  });

  it('should show connection status indicator', () => {
    render(<OverlayPage />);

    // Vérifier le statut de connexion (initialement rouge)
    const statusIndicator = document.querySelector('.w-3.h-3');
    expect(statusIndicator).toBeInTheDocument();
  });

  it('should initialize with default state', () => {
    render(<OverlayPage />);

    // Pas de question au départ
    expect(screen.queryByText(/Question:/)).not.toBeInTheDocument();

    // Leaderboard vide initialement
    expect(screen.queryByTestId('leaderboard-entry-0')).not.toBeInTheDocument();
  });

  it('should simulate connection after delay', async () => {
    render(<OverlayPage />);

    // Avancer le temps pour simuler la connexion
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      const statusIndicator = document.querySelector('.bg-green-400');
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  it('should display question after connection', async () => {
    render(<OverlayPage />);

    // Simuler la séquence complète
    jest.advanceTimersByTime(1000); // Connexion
    jest.advanceTimersByTime(2000); // Question apparaît

    await waitFor(() => {
      expect(screen.getByText('Question: Quelle est la capitale de la France ?')).toBeInTheDocument();
    });
  });

  it('should display leaderboard entries', async () => {
    render(<OverlayPage />);

    // Attendre que le leaderboard soit initialisé
    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-entry-0')).toBeInTheDocument();
    });

    expect(screen.getByText('user1: 150')).toBeInTheDocument();
    expect(screen.getByText('user2: 120')).toBeInTheDocument();
  });

  it('should show winner celebration', async () => {
    render(<OverlayPage />);

    // Simuler la séquence jusqu'à l'affichage du gagnant
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.getByText('Winner: user1')).toBeInTheDocument();
    });
  });

  it('should have responsive container structure', () => {
    render(<OverlayPage />);

    const container = document.querySelector('.container');
    expect(container).toHaveClass('mx-auto', 'px-4', 'py-8', 'max-w-7xl');

    const grid = document.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1', 'lg:grid-cols-3', 'gap-8');
  });

  it('should apply dark gradient background', () => {
    render(<OverlayPage />);

    const mainDiv = document.querySelector('.min-h-screen');
    expect(mainDiv).toHaveClass(
      'bg-gradient-to-br',
      'from-slate-900',
      'via-purple-900',
      'to-slate-900'
    );
  });
});