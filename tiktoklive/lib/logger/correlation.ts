/**
 * Gestion des correlation IDs pour le tracking des requêtes
 */

import { v4 as uuidv4 } from 'uuid';

export interface CorrelationContext {
  id: string;
  parentId?: string;
  startTime: Date;
  tags: Record<string, string>;
}

/**
 * Gestionnaire de correlation IDs
 */
export class CorrelationManager {
  private static currentContext: CorrelationContext | null = null;
  private static contextStack: CorrelationContext[] = [];

  /**
   * Génère un nouveau correlation ID
   */
  static generateId(): string {
    return uuidv4();
  }

  /**
   * Crée un nouveau contexte de corrélation
   */
  static createContext(tags: Record<string, string> = {}): CorrelationContext {
    const context: CorrelationContext = {
      id: this.generateId(),
      parentId: this.currentContext?.id,
      startTime: new Date(),
      tags: { ...tags }
    };

    this.contextStack.push(context);
    this.currentContext = context;

    return context;
  }

  /**
   * Obtient le contexte de corrélation actuel
   */
  static getCurrentContext(): CorrelationContext | null {
    return this.currentContext;
  }

  /**
   * Obtient l'ID de corrélation actuel
   */
  static getCurrentId(): string | null {
    return this.currentContext?.id || null;
  }

  /**
   * Met à jour les tags du contexte actuel
   */
  static updateTags(tags: Record<string, string>): void {
    if (this.currentContext) {
      this.currentContext.tags = { ...this.currentContext.tags, ...tags };
    }
  }

  /**
   * Termine le contexte actuel et revient au contexte parent
   */
  static endContext(): CorrelationContext | null {
    const endedContext = this.contextStack.pop();

    if (this.contextStack.length > 0) {
      this.currentContext = this.contextStack[this.contextStack.length - 1];
    } else {
      this.currentContext = null;
    }

    return endedContext || null;
  }

  /**
   * Exécute une fonction dans un nouveau contexte de corrélation
   */
  static async runInContext<T>(
    tags: Record<string, string>,
    fn: () => Promise<T>
  ): Promise<T> {
    const context = this.createContext(tags);

    try {
      const result = await fn();
      return result;
    } finally {
      this.endContext();
    }
  }

  /**
   * Obtient la durée écoulée depuis le début du contexte actuel
   */
  static getElapsedTime(): number {
    if (!this.currentContext) return 0;

    return Date.now() - this.currentContext.startTime.getTime();
  }

  /**
   * Nettoie tous les contextes (pour les tests)
   */
  static reset(): void {
    this.currentContext = null;
    this.contextStack = [];
  }
}

/**
 * Utilitaire pour créer un correlation ID simple (sans contexte)
 */
export function createCorrelationId(): string {
  return CorrelationManager.generateId();
}

/**
 * Utilitaire pour obtenir le correlation ID actuel
 */
export function getCurrentCorrelationId(): string | null {
  return CorrelationManager.getCurrentId();
}