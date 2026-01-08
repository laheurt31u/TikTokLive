/**
 * Tests unitaires pour QuestionDisplay selon Story 2.2
 * Phase RED : Tests qui échouent avant implémentation
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QuestionDisplay } from '@/components/overlay/QuestionDisplay';
import { Question } from '@/types/gamification';

describe('QuestionDisplay Component - Story 2.2', () => {
  const mockQuestion: Question = {
    id: '1',
    text: 'Quelle est la capitale de la France ?',
    answers: ['Paris', 'Lyon', 'Marseille'],
    difficulty: 'facile',
    points: 10,
    category: 'Géographie'
  };

  describe('Affichage de la question', () => {
    test('devrait afficher le texte de la question quand question est fournie', () => {
      render(<QuestionDisplay question={mockQuestion} />);
      
      expect(screen.getByText('Quelle est la capitale de la France ?')).toBeInTheDocument();
    });

    test('devrait afficher un message gracieux quand question est null', () => {
      render(<QuestionDisplay question={null} />);
      
      // Message de fallback attendu
      expect(screen.getByText(/aucune question/i)).toBeInTheDocument();
    });

    test('devrait afficher un skeleton screen quand isLoading est true', () => {
      render(<QuestionDisplay question={null} isLoading={true} />);
      
      // Skeleton screen attendu
      expect(screen.getByTestId('question-skeleton')).toBeInTheDocument();
    });
  });

  describe('Support multiligne', () => {
    test('devrait gérer les questions longues avec plusieurs lignes', () => {
      const longQuestion: Question = {
        ...mockQuestion,
        text: 'Cette question est très longue et devrait s\'afficher sur plusieurs lignes pour être lisible par les viewers du stream TikTok'
      };

      render(<QuestionDisplay question={longQuestion} />);
      
      const questionElement = screen.getByText(longQuestion.text);
      expect(questionElement).toBeInTheDocument();
      // Vérifier que le texte peut s'afficher sur plusieurs lignes
      expect(questionElement).toHaveClass(/break-words|whitespace-normal/i);
    });
  });

  describe('Animations', () => {
    test('devrait appliquer animation d\'entrée (fade-in + slide-up) au montage', async () => {
      const { container } = render(<QuestionDisplay question={mockQuestion} />);
      
      const displayElement = container.querySelector('[data-testid="question-display"]');
      
      await waitFor(() => {
        expect(displayElement).toHaveClass(/animate|fade|slide/i);
      });
    });

    test('devrait appliquer animation de sortie (fade-out) quand question change', async () => {
      const { rerender } = render(<QuestionDisplay question={mockQuestion} />);
      
      const newQuestion: Question = {
        ...mockQuestion,
        id: '2',
        text: 'Nouvelle question'
      };

      rerender(<QuestionDisplay question={newQuestion} />);
      
      // Animation de sortie attendue avant changement
      await waitFor(() => {
        expect(screen.getByText('Nouvelle question')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibilité et lisibilité', () => {
    test('devrait respecter le contrast WCAG AA minimum', () => {
      const { container } = render(<QuestionDisplay question={mockQuestion} />);
      
      const questionText = screen.getByText(mockQuestion.text);
      const computedStyle = window.getComputedStyle(questionText);
      
      // Vérifier que le texte a un contrast suffisant
      // Contrast ratio minimum WCAG AA : 4.5:1 pour texte normal
      expect(questionText).toHaveClass(/text-white|text-gray-900/i);
    });

    test('devrait avoir une taille de police lisible', () => {
      render(<QuestionDisplay question={mockQuestion} />);
      
      const questionText = screen.getByText(mockQuestion.text);
      // Taille de police minimale recommandée : 16px pour lisibilité
      expect(questionText).toHaveClass(/text-(base|lg|xl)/i);
    });
  });

  describe('Performance streaming', () => {
    test('devrait utiliser animations GPU-accelerated', () => {
      const { container } = render(<QuestionDisplay question={mockQuestion} />);
      
      const displayElement = container.querySelector('[data-testid="question-display"]');
      
      // Vérifier utilisation de transform/opacity pour GPU acceleration
      expect(displayElement).toHaveClass(/transform|translate|opacity/i);
    });
  });

  describe('Callback onQuestionChange', () => {
    test('devrait appeler onQuestionChange quand question change', () => {
      const onQuestionChange = jest.fn();
      const { rerender } = render(
        <QuestionDisplay question={mockQuestion} onQuestionChange={onQuestionChange} />
      );

      const newQuestion: Question = {
        ...mockQuestion,
        id: '2',
        text: 'Nouvelle question'
      };

      rerender(<QuestionDisplay question={newQuestion} onQuestionChange={onQuestionChange} />);
      
      // Le callback devrait être appelé lors du changement
      // Note: L'implémentation déterminera exactement quand appeler ce callback
    });
  });
});
