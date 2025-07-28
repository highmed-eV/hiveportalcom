import { BaseMessenger } from "./base-messenger";

/**
 * Messenger for HIVEportal (parent page).
 * Communicates with multiple embedded apps in iframes.
 */
export class HivePortalMessenger extends BaseMessenger {
  /**
   * Map for managing all registered iframes (Key = custom ID, Value = {iframe, origin})
   */
  private iframes: Map<string, { iframe: HTMLIFrameElement; origin: string }> = new Map();

  /**
   * Creates a new messenger instance for the parent page.
   * targetOrigin is optional and only needed for compatibility.
   */
  constructor(targetOrigin?: string) {
    super(targetOrigin || "*");
  }

  /**
   * Registers an iframe under a unique ID and stores its allowed origin.
   * @param id Unique identifier for the iframe (e.g. "app1")
   * @param iframe The HTMLIFrameElement to communicate with
   * @param origin The allowed target origin for this iframe (e.g. "https://app1.com")
   */
  public registerIframe(id: string, iframe: HTMLIFrameElement, origin: string) {
    this.iframes.set(id, { iframe, origin });
  }

  /**
   * Removes an iframe by its ID.
   * @param id The ID of the iframe to remove
   */
  public unregisterIframe(id: string) {
    this.iframes.delete(id);
  }

  /**
   * Required by the base class, but not meaningful for multi-iframe usage.
   * Always throws. Please use sendTo/requestTo/respondTo with iframe ID!
   */
  protected getTargetWindow(): Window {
    throw new Error(
      "Please use sendTo/requestTo/respondTo with iframe ID!"
    );
  }

  /**
   * Sends a message to a specific iframe.
   * @param iframeId The ID of the target iframe
   * @param type Message type (e.g. "PING")
   * @param payload Any payload data
   */
  public sendTo<T = any>(iframeId: string, type: string, payload?: T) {
    const entry = this.iframes.get(iframeId);
    if (!entry || !entry.iframe || !entry.iframe.contentWindow) {
      throw new Error(
        `iFrame with ID "${iframeId}" or contentWindow is not available.`
      );
    }
    // Send message to the target iframe with its specific origin
    entry.iframe.contentWindow!.postMessage({ type, payload }, entry.origin);
  }

  /**
   * Sends a message with response (request-response) to a specific iframe.
   * @param iframeId The ID of the target iframe
   * @param type Message type
   * @param payload Any payload data
   * @param timeoutMs Timeout for the response (ms)
   * @returns Promise with the response
   */
  public requestTo<T = any, R = any>(
    iframeId: string,
    type: string,
    payload?: T,
    timeoutMs = 5000
  ): Promise<R> {
    const entry = this.iframes.get(iframeId);
    if (!entry || !entry.iframe || !entry.iframe.contentWindow) {
      throw new Error(
        `iFrame with ID "${iframeId}" or contentWindow is not available.`
      );
    }
    // Promise-based communication with response
    return new Promise<R>((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const timeout = window.setTimeout(() => {
        this["pendingRequests"].delete(requestId);
        reject(new Error("Request timed out"));
      }, timeoutMs);

      this["pendingRequests"].set(requestId, { resolve, reject, timeout });
      entry.iframe.contentWindow!.postMessage(
        { type, payload, requestId },
        entry.origin
      );
    });
  }

  /**
   * Sends a response to a request to a specific iframe.
   * @param iframeId The ID of the target iframe
   * @param responseTo The request ID being responded to
   * @param payload Response data
   * @param error Optional error message
   */
  public respondTo(
    iframeId: string,
    responseTo: string,
    payload?: any,
    error?: string
  ) {
    const entry = this.iframes.get(iframeId);
    if (!entry || !entry.iframe || !entry.iframe.contentWindow) {
      throw new Error(
        `iFrame with ID "${iframeId}" or contentWindow is not available.`
      );
    }
    // Send response to the target iframe with its specific origin
    entry.iframe.contentWindow!.postMessage(
      { responseTo, payload, error },
      entry.origin
    );
  }
}
