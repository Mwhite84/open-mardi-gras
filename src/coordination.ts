/**
 * PluginCoordinator — shared coordination point between BeadsPlugin and
 * ThenChainingPlugin.
 *
 * Both plugins import the module-level `coordinator` singleton so they
 * share the same instance regardless of load order.
 */

/**
 * Interface for what the coordinator needs from a chain state manager.
 * Avoids importing the concrete ChainStateManager class, keeping the
 * coordination module decoupled from then-chaining internals.
 */
export interface ChainStateProvider {
  hasActiveChain(sessionID: string): boolean
}

export interface ChainGateProvider {
  isChainBlocked(sessionID: string): boolean
}

export class PluginCoordinator {
  private providers: ChainStateProvider[] = []
  private pendingCallbacks: Map<string, () => void> = new Map()
  private gateProviders: ChainGateProvider[] = []
  private pendingUnblockedCallbacks: Map<string, () => void> = new Map()

  /**
   * Register a chain state provider. Called by ThenChainingPlugin during init.
   * The ChainStateManager class already satisfies ChainStateProvider.
   */
  registerChainState(provider: ChainStateProvider): void {
    this.providers.push(provider)
  }

  registerChainGate(provider: ChainGateProvider): void {
    this.gateProviders.push(provider)
  }

  isChainBlocked(sessionID: string): boolean {
    return this.gateProviders.some((provider) => provider.isChainBlocked(sessionID))
  }

  onChainUnblocked(sessionID: string, callback: () => void): void {
    this.pendingUnblockedCallbacks.set(sessionID, callback)
  }

  notifyChainUnblocked(sessionID: string): void {
    const callback = this.pendingUnblockedCallbacks.get(sessionID)
    if (!callback) return
    this.pendingUnblockedCallbacks.delete(sessionID)
    try {
      callback()
    } catch {
      // A plugin callback cannot be allowed to break chain event handling.
    }
  }

  cancelChainUnblocked(sessionID: string): void {
    this.pendingUnblockedCallbacks.delete(sessionID)
  }

  /**
   * Check if any registered provider has an active chain for this session.
   * Returns false if no providers are registered (safe when only BeadsPlugin
   * is loaded without ThenChainingPlugin).
   */
  isChainActive(sessionID: string): boolean {
    return this.providers.some((p) => p.hasActiveChain(sessionID))
  }

  /**
   * Queue a callback to fire when notifyChainComplete is called for this
   * session. Deduplicates: if a callback is already queued for the session,
   * it is replaced rather than stacked.
   */
  onChainComplete(sessionID: string, callback: () => void): void {
    this.pendingCallbacks.set(sessionID, callback)
  }

  /**
   * Fire and remove the pending callback for this session.
   * No-op when no callback is queued — safe to call unconditionally.
   */
  notifyChainComplete(sessionID: string): void {
    const callback = this.pendingCallbacks.get(sessionID)
    if (callback) {
      this.pendingCallbacks.delete(sessionID)
      try {
        callback()
      } catch {
        // Callback errors must not propagate to chain event handling.
      }
    }
  }
}

/** Module-level singleton — both plugins get the same instance. */
export const coordinator = new PluginCoordinator()
