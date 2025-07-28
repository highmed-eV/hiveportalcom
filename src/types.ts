// Base type for message types (can be extended as needed)
export type MessageType = string;

// Message exchanged between parent and child
export interface Message<T = any> {
  type: MessageType;       // e.g. "SAVE_DATA", "GET_STATE"
  payload?: T;             // Any payload data
  requestId?: string;      // For requests (to match responses)
  responseTo?: string;     // For responses (which request ID is answered)
  error?: string;          // Optional error message
}

// Handler function for events (receives payload and optional requestId)
export type MessageHandler<T = any> = (payload: T, requestId?: string) => void | Promise<void>;

// For pending requests (Promise resolution)
export interface PendingRequest {
  resolve: (data: any) => void;
  reject: (error: any) => void;
  timeout: number; // Timeout for aborting
}