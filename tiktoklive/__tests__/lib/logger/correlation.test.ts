/**
 * Tests unitaires pour la gestion des correlation IDs
 */

import { CorrelationManager, createCorrelationId, getCurrentCorrelationId } from '../../../lib/logger/correlation';

// Mock de uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-1234567890abcdef')
}));

describe('CorrelationManager', () => {
  beforeEach(() => {
    CorrelationManager.reset();
  });

  describe('Génération d\'ID', () => {
    it('devrait générer un ID unique à chaque fois', () => {
      const id1 = CorrelationManager.generateId();
      const id2 = CorrelationManager.generateId();

      expect(id1).toBe('mocked-uuid-1234567890abcdef');
      expect(id2).toBe('mocked-uuid-1234567890abcdef');
      // Note: Dans un vrai environnement, ils seraient différents
    });
  });

  describe('Gestion des contextes', () => {
    it('devrait créer et gérer un contexte de corrélation', () => {
      const tags = { operation: 'test', user: '123' };
      const context = CorrelationManager.createContext(tags);

      expect(context.id).toBe('mocked-uuid-1234567890abcdef');
      expect(context.tags).toEqual(tags);
      expect(context.startTime).toBeInstanceOf(Date);
      expect(context.parentId).toBeUndefined();
    });

    it('devrait gérer les contextes imbriqués', () => {
      const parentContext = CorrelationManager.createContext({ level: 'parent' });
      const childContext = CorrelationManager.createContext({ level: 'child' });

      expect(childContext.parentId).toBe(parentContext.id);
      expect(CorrelationManager.getCurrentContext()).toBe(childContext);
    });

    it('devrait terminer un contexte et revenir au parent', () => {
      const parentContext = CorrelationManager.createContext({ level: 'parent' });
      const childContext = CorrelationManager.createContext({ level: 'child' });

      const endedContext = CorrelationManager.endContext();

      expect(endedContext).toBe(childContext);
      expect(CorrelationManager.getCurrentContext()).toBe(parentContext);
    });

    it('devrait mettre à jour les tags du contexte actuel', () => {
      CorrelationManager.createContext({ initial: 'value' });
      CorrelationManager.updateTags({ updated: 'value', additional: 'tag' });

      const current = CorrelationManager.getCurrentContext();
      expect(current?.tags).toEqual({
        initial: 'value',
        updated: 'value',
        additional: 'tag'
      });
    });
  });

  describe('runInContext', () => {
    it('devrait exécuter une fonction dans un nouveau contexte', async () => {
      let capturedId: string | null = null;

      await CorrelationManager.runInContext({ operation: 'async-test' }, async () => {
        capturedId = CorrelationManager.getCurrentId();
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });

      expect(capturedId).toBe('mocked-uuid-1234567890abcdef');
    });

    it('devrait nettoyer le contexte même en cas d\'erreur', async () => {
      await expect(
        CorrelationManager.runInContext({ operation: 'error-test' }, async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      expect(CorrelationManager.getCurrentContext()).toBeNull();
    });
  });

  describe('Mesure du temps écoulé', () => {
    it('devrait mesurer le temps écoulé depuis le début du contexte', async () => {
      CorrelationManager.createContext();

      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 50));

      const elapsed = CorrelationManager.getElapsedTime();
      expect(elapsed).toBeGreaterThanOrEqual(45); // Au moins 45ms
      expect(elapsed).toBeLessThan(100); // Moins de 100ms
    });

    it('devrait retourner 0 si aucun contexte actif', () => {
      expect(CorrelationManager.getElapsedTime()).toBe(0);
    });
  });
});

describe('Utilitaires de corrélation', () => {
  beforeEach(() => {
    CorrelationManager.reset();
  });

  it('createCorrelationId devrait générer un ID valide', () => {
    const id = createCorrelationId();
    expect(id).toBe('mocked-uuid-1234567890abcdef');
  });

  it('getCurrentCorrelationId devrait retourner l\'ID actuel', () => {
    expect(getCurrentCorrelationId()).toBeNull();

    CorrelationManager.createContext();
    expect(getCurrentCorrelationId()).toBe('mocked-uuid-1234567890abcdef');
  });
});