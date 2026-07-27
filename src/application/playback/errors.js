export class PlaybackError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "PlaybackError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export function playbackError(code, message, details) {
  return new PlaybackError(code, message, details);
}
