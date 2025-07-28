import { BaseMessenger } from "./base-messenger";

/**
 * Messenger für eingebettete Apps (Child-Seite).
 * Kommuniziert mit HIVEport (Parent).
 */
export class AppMessenger extends BaseMessenger {
  constructor(targetOrigin: string) {
    super(targetOrigin);
  }

  /** Ziel-Fenster: Immer der Parent (HIVEport) */
  protected getTargetWindow(): Window {
    return window.parent;
  }
}
