import { EventEmitter } from "events";

declare global {
  var __metrixSSEEmitter: EventEmitter | undefined;
}

if (!global.__metrixSSEEmitter) {
  global.__metrixSSEEmitter = new EventEmitter();
  global.__metrixSSEEmitter.setMaxListeners(100);
}

export const sseEmitter = global.__metrixSSEEmitter;
