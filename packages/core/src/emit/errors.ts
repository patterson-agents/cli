/**
 * Emit-engine error types.
 */

/**
 * Thrown whenever any code path attempts to write a path on the constitution's
 * never-write list (Principle II). This is a hard error: the batch aborts and
 * nothing is written.
 */
export class PattersonNeverWriteError extends Error {
  readonly code = "PATTERSON_NEVER_WRITE";
  readonly path: string;

  constructor(path: string, detail: string) {
    super(`Refusing to write "${path}": ${detail}`);
    this.name = "PattersonNeverWriteError";
    this.path = path;
  }
}
