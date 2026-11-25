/** Choose a label from the RDF literals an author supplied. */
export function selectLocalizedLiteral<T extends { termType: string; value: string; language?: string }>(
  terms: readonly T[],
  preferredLanguage = 'en',
): T | undefined {
  const literals = terms.filter(term => term.termType === 'Literal' && term.value.trim());
  const language = preferredLanguage.toLowerCase();
  for (const tag of [language, language.split('-')[0], 'en', '']) {
    const match = literals.find(term => (term.language ?? '').toLowerCase() === tag);
    if (match) return match;
  }
  return literals[0];
}
