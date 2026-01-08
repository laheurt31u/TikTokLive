/**
 * Tests unitaires pour le gestionnaire de correlation IDs
 * Priorité: P2 (infrastructure de logging)
 */

import { CorrelationManager } from '@/lib/logger/correlation';

describe('CorrelationManager', () => {
  beforeEach(() => {
    // Nettoyer le contexte avant chaque test
    while (CorrelationManager.getCurrentContext() !== null) {
      CorrelationManager.popContext();
    }
  });

  describe('generateId', () => {
    test('[P2] devrait générer un UUID v4 unique', () => {
      // GIVEN: Aucun contexte existant

      // WHEN: Génération d'un correlation ID
      const id1 = CorrelationManager.generateId();
      const id2 = CorrelationManager.generateId();

      // THEN: Les IDs sont des strings non vides et différents
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
    });
  });

  describe('createContext', () => {
    test('[P2] devrait créer un nouveau contexte avec tags', () => {
      // GIVEN: Tags pour le contexte
      const tags = { endpoint: 'test-endpoint', userId: 'user-123' };

      // WHEN: Création d'un contexte
      const context = CorrelationManager.createContext(tags);

      // THEN: Le contexte est créé avec les bonnes propriétés
      expect(context.id).toBeTruthy();
      expect(context.startTime).toBeInstanceOf(Date);
      expect(context.tags).toMatchObject(tags);
      expect(context.parentId).toBeUndefined();
    });

    test('[P2] devrait créer un contexte enfant avec parentId', () => {
      // GIVEN: Contexte parent existant
      const parentContext = CorrelationManager.createContext({ endpoint: 'parent' });

      // WHEN: Création d'un contexte enfant
      const childContext = CorrelationManager.createContext({ endpoint: 'child' });

      // THEN: Le contexte enfant a le parentId correct
      expect(childContext.parentId).toBe(parentContext.id);
    });
  });

  describe('getCurrentContext', () => {
    test('[P2] devrait retourner null quand aucun contexte', () => {
      // GIVEN: Aucun contexte créé

      // WHEN: Récupération du contexte actuel
      const context = CorrelationManager.getCurrentContext();

      // THEN: Retourne null
      expect(context).toBeNull();
    });

    test('[P2] devrait retourner le contexte actuel après création', () => {
      // GIVEN: Contexte créé
      const createdContext = CorrelationManager.createContext({ endpoint: 'test' });

      // WHEN: Récupération du contexte actuel
      const currentContext = CorrelationManager.getCurrentContext();

      // THEN: Retourne le contexte créé
      expect(currentContext).toBe(createdContext);
    });
  });

  describe('popContext', () => {
    test('[P2] devrait restaurer le contexte précédent après pop', () => {
      // GIVEN: Deux contextes empilés
      const parentContext = CorrelationManager.createContext({ endpoint: 'parent' });
      const childContext = CorrelationManager.createContext({ endpoint: 'child' });

      // WHEN: Pop du contexte enfant
      CorrelationManager.popContext();

      // THEN: Le contexte parent est restauré
      const currentContext = CorrelationManager.getCurrentContext();
      expect(currentContext).toBe(parentContext);
    });

    test('[P2] devrait retourner null après pop du dernier contexte', () => {
      // GIVEN: Un seul contexte
      CorrelationManager.createContext({ endpoint: 'test' });

      // WHEN: Pop du contexte
      CorrelationManager.popContext();

      // THEN: Aucun contexte actif
      const context = CorrelationManager.getCurrentContext();
      expect(context).toBeNull();
    });
  });

  describe('runInContext', () => {
    test('[P2] devrait exécuter une fonction dans un nouveau contexte', async () => {
      // GIVEN: Fonction à exécuter
      const tags = { endpoint: 'test-endpoint' };
      let executedContextId: string | null = null;

      // WHEN: Exécution dans un contexte
      await CorrelationManager.runInContext(async () => {
        const context = CorrelationManager.getCurrentContext();
        executedContextId = context?.id || null;
        return 'result';
      }, tags);

      // THEN: La fonction a été exécutée avec le contexte
      expect(executedContextId).toBeTruthy();
    });

    test('[P2] devrait restaurer le contexte après exécution', async () => {
      // GIVEN: Contexte parent existant
      const parentContext = CorrelationManager.createContext({ endpoint: 'parent' });

      // WHEN: Exécution dans un nouveau contexte
      await CorrelationManager.runInContext(async () => {
        return 'result';
      }, { endpoint: 'child' });

      // THEN: Le contexte parent est restauré
      const currentContext = CorrelationManager.getCurrentContext();
      expect(currentContext).toBe(parentContext);
    });

    test('[P2] devrait restaurer le contexte même en cas d\'erreur', async () => {
      // GIVEN: Contexte parent existant
      const parentContext = CorrelationManager.createContext({ endpoint: 'parent' });

      // WHEN: Exécution avec erreur
      try {
        await CorrelationManager.runInContext(async () => {
          throw new Error('Test error');
        }, { endpoint: 'child' });
      } catch (error) {
        // Erreur attendue
      }

      // THEN: Le contexte parent est restauré malgré l'erreur
      const currentContext = CorrelationManager.getCurrentContext();
      expect(currentContext).toBe(parentContext);
    });

    test('[P2] devrait retourner le résultat de la fonction', async () => {
      // GIVEN: Fonction qui retourne une valeur
      const expectedResult = { data: 'test' };

      // WHEN: Exécution dans un contexte
      const result = await CorrelationManager.runInContext(async () => {
        return expectedResult;
      }, { endpoint: 'test' });

      // THEN: Le résultat est retourné
      expect(result).toBe(expectedResult);
    });
  });
});
