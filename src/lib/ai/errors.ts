export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigurationError";
  }
}

export class AiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiGenerationError";
  }
}
