
import { BaseMessenger } from "./base-messenger";

// Dummy window for testing
class DummyWindow {
  public messages: any[] = [];
  postMessage(msg: any, origin: string) {
    this.messages.push({ msg, origin });
  }
}

// Concrete test messenger
class TestMessenger extends BaseMessenger {
  private dummyWindow: DummyWindow;
  constructor(dummyWindow: DummyWindow, targetOrigin: string) {
    super(targetOrigin);
    this.dummyWindow = dummyWindow;
  }
  protected getTargetWindow(): Window {
    // @ts-ignore
    return this.dummyWindow;
  }
}

describe("BaseMessenger", () => {
  let dummyWindow: DummyWindow;
  let messenger: TestMessenger;
  const origin = "https://test.com";

  beforeEach(() => {
    dummyWindow = new DummyWindow();
    messenger = new TestMessenger(dummyWindow, origin);
  });

  afterEach(() => {
    messenger.destroy();
  });

  it("should register and call event handler with payload and requestId", () => {
    const handler = jest.fn();
    messenger.on("TEST_EVENT", handler);

    window.dispatchEvent(new MessageEvent("message", {
      origin,
      data: { type: "TEST_EVENT", payload: { foo: 42 }, requestId: "abc-1" }
    }));

    expect(handler).toHaveBeenCalledWith({ foo: 42 }, "abc-1");
  });

  it("should send message to target window", () => {
    messenger.send("SEND_EVENT", { bar: 123 });
    expect(dummyWindow.messages[0].msg).toEqual({ type: "SEND_EVENT", payload: { bar: 123 } });
    expect(dummyWindow.messages[0].origin).toBe(origin);
  });

  it("should remove event handler", () => {
    const handler = jest.fn();
    messenger.on("REMOVE_EVENT", handler);
    messenger.off("REMOVE_EVENT", handler);

    window.dispatchEvent(new MessageEvent("message", {
      origin,
      data: { type: "REMOVE_EVENT", payload: { test: true } }
    }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle request/response with correct requestId", async () => {
    setTimeout(() => {
      window.dispatchEvent(new MessageEvent("message", {
        origin,
        data: { responseTo: "req-1", payload: { answer: "ok" } }
      }));
    }, 10);

    const origUUID = global.crypto.randomUUID;
    // @ts-ignore
    global.crypto.randomUUID = () => "req-1";

    const result = await messenger.request("REQ_EVENT", { ask: true });
    expect(result).toEqual({ answer: "ok" });

    // @ts-ignore
    global.crypto.randomUUID = origUUID;
  });

  it("should timeout request if no response", async () => {
    const origUUID = global.crypto.randomUUID;
    // @ts-ignore
    global.crypto.randomUUID = () => "timeout-1";

    await expect(
      messenger.request("TIMEOUT_EVENT", {}, 20)
    ).rejects.toThrow("Request timed out");

    // @ts-ignore
    global.crypto.randomUUID = origUUID;
  });

  it("destroy should remove listeners and clear handlers", () => {
    const handler = jest.fn();
    messenger.on("DESTROY_EVENT", handler);
    messenger.destroy();

    window.dispatchEvent(new MessageEvent("message", {
      origin,
      data: { type: "DESTROY_EVENT", payload: {} }
    }));

    expect(handler).not.toHaveBeenCalled();
  });
});