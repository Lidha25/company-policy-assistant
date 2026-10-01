const stop = new Set('a an the is are do does can may must should i we my our of for to in on at and or with how what when many much policy employees employee company'.split(' '));
export const words = text => text.toLowerCase().match(/[a-z0-9]+/g)?.filter(w => !stop.has(w)) || [];
export function rulesAnswer(question, policies) {
  const start = performance.now(); const query = [...new Set(words(question))];
  const ranked = policies.map(p => {
    const title = new Set(words(p.title)), content = new Set(words(p.policy_text));
    return { policy: p, score: query.reduce((sum, w) => sum + (title.has(w) ? 3 : content.has(w) ? 1 : 0), 0) };
  }).filter(p => p.score >= 3).sort((a,b) => b.score - a.score || a.policy.id.localeCompare(b.policy.id));
  const selected = ranked.slice(0, 1).map(p => p.policy);
  return { method: 'rules', status: 'ok', answer: selected.length ? selected[0].policy_text : 'The policy database does not provide an answer to this question.', policies: selected, abstained: !selected.length,
    response_ms: performance.now() - start, input_tokens: 0, output_tokens: 0, embedding_tokens: 0, total_tokens: 0,
    support: selected.length ? 'Exact policy quote; relevance requires review' : 'No answer claimed', model: 'Keyword matching' };
}
