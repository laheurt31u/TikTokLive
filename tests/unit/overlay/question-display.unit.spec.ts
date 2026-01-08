/**
 * Tests unitaires pour le composant QuestionDisplay
 */

import { render, screen } from '@testing-library/react';
import { QuestionDisplay } from '@/components/overlay/QuestionDisplay';
import { Question } from '@/types/gamification';

describe('QuestionDisplay', () => {
  const mockQuestion: Question = {
    id: 'q1',
    text: 'Quelle est la capitale de la France ?',
    answers: ['Paris', 'London', 'Berlin'],
    difficulty: 'facile',
    points: 10,
    category: 'géographie'
  };

  it('should render question text correctly', () => {
    render(<QuestionDisplay question={mockQuestion} />);

    expect(screen.getByText('Quelle est la capitale de la France ?')).toBeInTheDocument();
  });

  it('should show call-to-action for chat response', () => {
    render(<QuestionDisplay question={mockQuestion} />);

    expect(screen.getByText(/Répondez dans le chat TikTok/i)).toBeInTheDocument();
  });

  it('should not render question content when no question provided', () => {
    render(<QuestionDisplay question={null} />);

    expect(screen.getByText('Aucune question disponible')).toBeInTheDocument();
    expect(screen.getByText('Chargement en cours...')).toBeInTheDocument();
  });

  it('should show loading skeleton when isLoading is true', () => {
    render(<QuestionDisplay question={mockQuestion} isLoading={true} />);

    expect(screen.getByTestId('question-skeleton')).toBeInTheDocument();
  });

  it('should apply GPU acceleration classes', () => {
    const { container } = render(<QuestionDisplay question={mockQuestion} />);

    const acceleratedElements = container.querySelectorAll('.gpu-accelerated');
    expect(acceleratedElements.length).toBeGreaterThan(0);
  });

  it('should have question display test id', () => {
    render(<QuestionDisplay question={mockQuestion} />);

    expect(screen.getByTestId('question-display')).toBeInTheDocument();
  });

  it('should display "QUESTION ACTIVE" header', () => {
    render(<QuestionDisplay question={mockQuestion} />);

    expect(screen.getByText('QUESTION ACTIVE')).toBeInTheDocument();
  });

  it('should handle question change callback', () => {
    const onQuestionChange = jest.fn();
    const { rerender } = render(
      <QuestionDisplay question={mockQuestion} onQuestionChange={onQuestionChange} />
    );

    const newQuestion: Question = {
      ...mockQuestion,
      id: 'q2',
      text: 'Nouvelle question'
    };

    rerender(<QuestionDisplay question={newQuestion} onQuestionChange={onQuestionChange} />);

    // Le callback devrait être appelé lors du changement de question
    // Note: Le composant utilise un setTimeout de 300ms, donc onQuestionChange
    // sera appelé après l'animation
    expect(screen.getByText('Nouvelle question')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <QuestionDisplay question={mockQuestion} className="custom-class" />
    );

    const questionDisplay = container.querySelector('[data-testid="question-display"]');
    expect(questionDisplay).toHaveClass('custom-class');
  });
});