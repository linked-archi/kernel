import type { ValidationResult } from './rdf-engine/interfaces.js';
import type { PlainResult } from './rdf-engine/validation-engine.js';

/** The observable outputs of a consumer's normal model open, save and validation (KReq 1.4). */
export interface ShopConformanceResult {
  modelIri: string | undefined;
  metamodelIris: readonly string[];
  trig: string;
  findings: readonly PlainResult[];
}

/** Project validation terms to transportable data for comparisons across runtimes. */
export function conformanceFindings(report: { results: readonly ValidationResult[] }): PlainResult[] {
  return report.results.map(result => ({
    focusNode: result.focusNode.value,
    resultPath: result.resultPath.value,
    sourceShape: result.sourceShape.value,
    message: result.message,
    severity: result.severity,
    ...(result.sourceConstraintComponent && { sourceConstraintComponent: result.sourceConstraintComponent.value }),
    ...(result.withinShape && { withinShape: result.withinShape.value }),
  }));
}

function sortedFindings(findings: readonly PlainResult[]): string[] {
  return findings.map(finding => JSON.stringify([
    finding.focusNode,
    finding.resultPath,
    finding.sourceShape,
    finding.message,
    finding.severity,
    finding.sourceConstraintComponent,
    finding.withinShape,
  ])).sort();
}

/**
 * Qualify the bundled shop model using the consumer's own open, export and validate path.
 * The reader can use a filesystem or a test host. The canonical sample retains full TriG
 * graph identities, model and view IRIs, and all three named SHACL findings.
 */
export async function runShopConformance(
  readText: (file: URL) => Promise<string>,
  open: (text: string, filename: string) => Promise<ShopConformanceResult>,
): Promise<void> {
  const [trig, expected] = await Promise.all([
    readText(new URL('../fixtures/interoperability/archimate4-demo.trig', import.meta.url)),
    readText(new URL('../fixtures/interoperability/expected-findings.json', import.meta.url)),
  ]);
  const result = await open(trig, 'archimate4-demo.trig');
  if (result.modelIri !== 'https://example.org/acme/shop/model') {
    throw new Error(`Shop conformance: expected the shop model IRI, got ${result.modelIri ?? 'none'}.`);
  }
  if (result.metamodelIris.length !== 1 ||
    result.metamodelIris[0] !== 'https://meta.linked.archi/archimate4/metamodel#ArchiMate4') {
    throw new Error(`Shop conformance: expected the pinned ArchiMate 4.0 metamodel, got ${result.metamodelIris.join(', ') || 'none'}.`);
  }
  if (result.trig !== trig) {
    throw new Error('Shop conformance: saved TriG differs from the canonical fixture.');
  }
  const expectedFindings = sortedFindings(JSON.parse(expected) as PlainResult[]);
  const actualFindings = sortedFindings(result.findings);
  if (JSON.stringify(actualFindings) !== JSON.stringify(expectedFindings)) {
    throw new Error(`Shop conformance: SHACL findings differ. Expected ${expectedFindings.join('; ')}. Got ${actualFindings.join('; ')}.`);
  }
}
