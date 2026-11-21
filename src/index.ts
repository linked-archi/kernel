/**
 * @linked-archi/kernel — provisional entry (K01).
 *
 * Each module is exported as a namespace, so names the modules share do not clash. Until K02 freezes
 * the public API from what the workspace and la-gram call, consumers may also import any module file
 * by its path, `@linked-archi/kernel/model-manager/model-diff.js` (KD-5).
 */
export * as rdfEngine from './rdf-engine/index.js';
export * as metamodelManager from './metamodel-manager/index.js';
export * as modelManager from './model-manager/index.js';
export * as modelIo from './import-export/model-io.js';
