import { OverpassElement } from "./models/overpassJson";
import { IndoorElementRef } from "./models/indoorElementRef";

export type IndoorDiagnosticSeverity = "warning" | "error";

export interface IndoorDiagnostic {
  severity: IndoorDiagnosticSeverity;
  code: string;
  message: string;
  elementRef?: IndoorElementRef;
  sourceElement?: OverpassElement;
  context?: Record<string, unknown>;
}

export type IndoorDiagnosticHandler = (diagnostic: IndoorDiagnostic) => void;

export interface IndoorDiagnosticOptions {
  onDiagnostic?: IndoorDiagnosticHandler;
  logDiagnostics?: boolean;
  deduplicateDiagnostics?: boolean;
}

export class IndoorDiagnostics {
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

  warn(diagnostic: Omit<IndoorDiagnostic, "severity">): void {
    this.report({
      ...diagnostic,
      severity: "warning",
    });
  }

  error(diagnostic: Omit<IndoorDiagnostic, "severity">): void {
    this.report({
      ...diagnostic,
      severity: "error",
    });
  }

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
