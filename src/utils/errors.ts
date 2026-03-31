export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}

export class TriageError extends ServiceError {
  constructor(message: string) {
    super(message);
    this.name = "TriageError";
  }
}

export class OutlineError extends ServiceError {
  constructor(message: string) {
    super(message);
    this.name = "OutlineError";
  }
}
