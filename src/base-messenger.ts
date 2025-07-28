import { Message, MessageHandler, PendingRequest } from "./types";

export abstract class BaseMessenger {
  protected targetOrigin: string;
  private eventHandlers: Map<string, MessageHandler<any>[]> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private boundOnMessage: (event: MessageEvent<Message>) => void;

  constructor(targetOrigin: string) {
    this.targetOrigin = targetOrigin;
    this.boundOnMessage = this.onMessage.bind(this);
    window.addEventListener("message", this.boundOnMessage);
  }

  /** Abstrakt: Gibt das Ziel-Fenster zurück (Parent oder iFrame) */
  protected abstract getTargetWindow(): Window;

  /** Interner Message-Empfänger */
  private onMessage(event: MessageEvent<Message>) {
    if (event.origin !== this.targetOrigin) return;
    const { type, payload, requestId, responseTo, error } = event.data;

    // 1) Antwort auf einen Request
    if (responseTo && this.pendingRequests.has(responseTo)) {
      const req = this.pendingRequests.get(responseTo)!;
      clearTimeout(req.timeout);
      this.pendingRequests.delete(responseTo);
      error ? req.reject(new Error(error)) : req.resolve(payload);
      return;
    }

    // 2) Event-Handler aufrufen
    if (type && this.eventHandlers.has(type)) {
      for (const handler of this.eventHandlers.get(type)!) {
        handler(payload, requestId);
      }
    } else if (type) {
      // Logging bei unerwarteten Nachrichten
      console.warn(`[BaseMessenger] no Handler for messagetype: "${type}"`, event.data);
    }
  }

  /** Event registrieren */
  public on<T = any>(type: string, handler: MessageHandler<T>) {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    this.eventHandlers.get(type)!.push(handler as MessageHandler<any>);
  }

  /** Event deregistrieren */
  public off<T = any>(type: string, handler: MessageHandler<T>) {
    if (this.eventHandlers.has(type)) {
      this.eventHandlers.set(
        type,
        this.eventHandlers.get(type)!.filter(h => h !== handler)
      );
    }
  }

  /** Nachricht ohne Antwort senden */
  public send<T = any>(type: string, payload?: T) {
    this.getTargetWindow().postMessage({ type, payload }, this.targetOrigin);
  }

  /** Nachricht mit Antwort (Request-Response) */
  public request<T = any, R = any>(
    type: string,
    payload?: T,
    timeoutMs = 5000
  ): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const timeout = window.setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error("Request timed out"));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      this.getTargetWindow().postMessage({ type, payload, requestId }, this.targetOrigin);
    });
  }

  /** Antwort auf einen Request senden */
  public respond(responseTo: string, payload?: any, error?: string) {
    this.getTargetWindow().postMessage({ responseTo, payload, error }, this.targetOrigin);
  }

  /** Clean-Up: Entfernt Event-Listener */
  public destroy() {
    window.removeEventListener("message", this.boundOnMessage);
    this.eventHandlers.clear();
    this.pendingRequests.clear();
  }
}
