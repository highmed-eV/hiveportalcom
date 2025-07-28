
# HIVEportalCom SDK

> **Note:** This project was initially developed for the HIVEportal project to exchange messages between a parent app and its children. However, it can be used with any website that uses iframes and wants to exchange messages between parent and child frames.

**HIVEportalCom** is a lightweight JavaScript/TypeScript SDK for secure, event-based, bidirectional communication between a parent website (e.g. HIVEportal) and embedded apps (children, e.g., in iframes).

---

## Installation

### Using npm

```bash
npm install hiveportalcom
```

### Or via `<script>` tag

Bundle the SDK (see project instructions) and include it in your HTML:

```html
<script src="dist/hiveportal-messenger.standalone.min.js"></script>
```

---

## Usage


### Parent Side: manages multiple iframes, each with its own origin

```typescript
import { HivePortalMessenger } from "hiveportalcom";

// Create the messenger for the parent (no origin needed)
const messenger = new HivePortalMessenger();

// Register iframes by ID, passing the iframe element and its allowed origin
const iframe1 = document.getElementById("iframe1") as HTMLIFrameElement;
const iframe2 = document.getElementById("iframe2") as HTMLIFrameElement;

messenger.registerIframe("app1", iframe1, "https://child-app1.example.com");
messenger.registerIframe("app2", iframe2, "https://child-app2.example.com");

// Listen for events from any child
messenger.on("SAVE_DONE", (payload, requestId) => {
  console.log("Save completed:", payload, requestId);
});

// Send a message to a specific iframe
messenger.sendTo("app1", "SAVE_DATA", { reason: "beforeClose" });

// Request/response: Ask a specific app for its state
const state = await messenger.requestTo("app2", "GET_STATE");
console.log("App2 state:", state);

// Clean up
messenger.destroy();
```

### Child Side: Embedded App (iframe)

```typescript
import { AppMessenger } from "hiveportalcom";

// Create the messenger for the child
const messenger = new AppMessenger("https://parent-website.example.com");

// Listen for events from the parent
messenger.on("SAVE_DATA", (payload, requestId) => {
  console.log("Saving because:", payload.reason);
  // ...do save...
  messenger.send("SAVE_DONE", { status: "ok" });
});

// Handle a request from the parent
messenger.on("GET_STATE", (payload, requestId) => {
  messenger.respond(requestId, { state: "ready" });
});

// Send a custom event to the parent
messenger.send("CUSTOM_EVENT", { foo: "bar" });

// Clean up
messenger.destroy();
```

---


---

## Registering Iframes with different Origins

You can register multiple iframes, each with its own unique origin:

```typescript
messenger.registerIframe("app1", iframe1, "https://child-app1.example.com");
messenger.registerIframe("app2", iframe2, "https://child-app2.example.com");
```

All messages to a given iframe will be sent to its registered origin. This allows secure communication with multiple apps from different domains.

---

## API Reference & Examples

### `on(type, handler)`
Register an event handler for a message type.

```typescript
messenger.on("EVENT_TYPE", (payload, requestId) => {
  // Handle the event
});
```

### `send(type, payload?)`
Send a one-way event to the other side (no response expected).

```typescript
messenger.send("EVENT_TYPE", { foo: "bar" });
```

### `request(type, payload?, timeoutMs?)` (Child) / `requestTo(iframeId, type, payload?, timeoutMs?)` (Parent)
Send a request and receive a response (Promise-based).

```typescript
// Parent (to a specific iframe)
const result = await messenger.requestTo("app1", "GET_DATA", { id: 123 });

// Child (to parent)
const result = await messenger.request("GET_CONFIG");
```

### `respond(requestId, payload?, error?)`
Send a response to a request.

```typescript
messenger.on("GET_DATA", (payload, requestId) => {
  messenger.respond(requestId, { data: "value" });
});
```

### `destroy()`
Remove all event listeners and clear resources.

```typescript
messenger.destroy();
```

---

## Architecture

- **HivePortalMessenger**: For the parent (HIVEportal), manages and communicates with multiple iframes.
- **AppMessenger**: For the embedded app (child), communicates with the parent window.
- **BaseMessenger**: Shared base class for event handling, request/response, and timeouts.

---

## Security

- **Origin validation**: Only accepts messages from the configured `targetOrigin`.
- **Request timeouts**: Requests automatically time out after 5 seconds (configurable).

---

## License

MIT
