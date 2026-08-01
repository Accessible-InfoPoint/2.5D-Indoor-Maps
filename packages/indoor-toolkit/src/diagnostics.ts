import { OverpassElement } from "./models/overpassJson";
import { IndoorElementRef } from "./models/indoorElementRef";

export type IndoorDiagnosticSeverity = "warning" | "error";

/**
 * Parser warning or error produced while building the model or deriving lazy geometry.
 *
 * Warnings describe tolerated or skipped data. Errors describe values the parser
 * refuses to interpret, while keeping the rest of the model usable.
 */
export interface IndoorDiagnostic {
  /** `warning` for tolerated issues, `error` for rejected values. */
  severity: IndoorDiagnosticSeverity;
  /** Stable-ish diagnostic identifier, for example `ExtractLevels.comma-separated-levels`. */
  code: string;
  /** Human-readable explanation suitable for logs or editor feedback. */
  message: string;
  /** Lightweight indoor element reference when the issue belongs to a parsed element. */
  elementRef?: IndoorElementRef;
  /** Raw OSM element that caused the diagnostic, when known. */
  sourceElement?: OverpassElement;
  /** Optional structured details for consumers that need machine-readable context. */
  context?: Record<string, unknown>;
}

/** Callback invoked whenever an `IndoorDiagnostics` instance records a diagnostic. */
export type IndoorDiagnosticHandler = (diagnostic: IndoorDiagnostic) => void;

/**
 * Controls diagnostic collection during parser use.
 */
export interface IndoorDiagnosticOptions {
  /** Called for every retained diagnostic. Useful for validators, editors, and logs. */
  onDiagnostic?: IndoorDiagnosticHandler;
  /** Also write formatted diagnostics to `console.warn`. Defaults to `false`. */
  logDiagnostics?: boolean;
  /** Avoid recording the same diagnostic repeatedly. Defaults to `true`. */
  deduplicateDiagnostics?: boolean;
}

/**
 * Mutable diagnostic collector used by parser elements.
 *
 * Most callers do not need to construct this directly; pass
 * `CreateIndoorModelOptions` to `createIndoorModel` and inspect
 * `model.diagnostics` instead.
 */
export class IndoorDiagnostics {
  /** Retained diagnostics in emission order. */
  readonly diagnostics: IndoorDiagnostic[] = [];

  private readonly emittedDiagnosticKeys = new Set<string>();
  private readonly onDiagnostic?: IndoorDiagnosticHandler;
  private readonly logDiagnostics: boolean;
  private readonly deduplicateDiagnostics: boolean;

  constructor(options: IndoorDiagnosticOptions = {}) {
    this.onDiagnostic = options.onDiagnostic;
    this.logDiagnostics = options.logDiagnostics ?? false;
    this.deduplicateDiagnostics = options.deduplicateDiagnostics ?? true;
  }

  /** Record a warning diagnostic. */
  warn(diagnostic: Omit<IndoorDiagnostic, "severity">): void {
    this.report({
      ...diagnostic,
      severity: "warning",
    });
  }

  /** Record an error diagnostic. */
  error(diagnostic: Omit<IndoorDiagnostic, "severity">): void {
    this.report({
      ...diagnostic,
      severity: "error",
    });
  }

  /** Record a fully formed diagnostic, applying configured deduplication and forwarding. */
  report(diagnostic: IndoorDiagnostic): void {
    if (this.deduplicateDiagnostics) {
      const key = getDiagnosticKey(diagnostic);

      if (this.emittedDiagnosticKeys.has(key)) {
        return;
      }

      this.emittedDiagnosticKeys.add(key);
    }

    this.diagnostics.push(diagnostic);
    this.onDiagnostic?.(diagnostic);

    if (this.logDiagnostics) {
      console.warn(formatIndoorDiagnostic(diagnostic));
    }
  }
}

/** Format a diagnostic for console output or plain text logs. */
export function formatIndoorDiagnostic(diagnostic: IndoorDiagnostic): string {
  const elementId = diagnostic.elementRef?.id;
  const elementPart = elementId === undefined ? "" : ` ${elementId}`;

  return `[IndoorToolkit:${diagnostic.severity}:${diagnostic.code}]${elementPart} ${diagnostic.message}`;
}

function getDiagnosticKey(diagnostic: IndoorDiagnostic): string {
  return [
    diagnostic.severity,
    diagnostic.code,
    diagnostic.elementRef?.id,
    diagnostic.sourceElement === undefined
      ? undefined
      : `${diagnostic.sourceElement.type}/${diagnostic.sourceElement.id}`,
    diagnostic.message,
  ].join(":");
}
