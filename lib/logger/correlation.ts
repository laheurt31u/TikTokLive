/**
 * Gestion des correlation IDs pour le tracking des requêtes
 * Pattern standardisé utilisé dans tout le projet
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
 * Utilisé pour tracer les requêtes à travers les différents services
 */
export class CorrelationManager {
  private static currentContext: CorrelationContext | null = null;
  private static contextStack: CorrelationContext[] = [];

  /**
   * Génère un nouveau correlation ID
   * @returns UUID v4 string
   */
  static generateId(): string {
    return uuidv4();
  }

  /**
   * Crée un nouveau contexte de corrélation
   * @param tags Tags additionnels pour le contexte
   * @returns Le contexte de corrélation créé
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
   * @returns Le contexte actuel ou null
   */
  static getCurrentContext(): CorrelationContext | null {
    return this.currentContext;
  }

  /**
   * Restaure le contexte précédent (pop de la stack)
   */
  static popContext(): void {
    if (this.contextStack.length > 0) {
      this.contextStack.pop();
      this.currentContext = this.contextStack.length > 0 
        ? this.contextStack[this.contextStack.length - 1] 
        : null;
    }
  }

  /**
   * Exécute une fonction dans un nouveau contexte de corrélation
   * @param fn Fonction à exécuter
   * @param tags Tags additionnels
   * @returns Le résultat de la fonction
   */
  static async runInContext<T>(
    fn: () => Promise<T>,
    tags: Record<string, string> = {}
  ): Promise<T> {
    const context = this.createContext(tags);
    try {
      return await fn();
    } finally {
      this.popContext();
    }
  }
}
