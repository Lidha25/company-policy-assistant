import { readFile } from 'node:fs/promises';
export function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('Unclosed quote in CSV');
  row.push(cell); if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift();
  if (!['title', 'department', 'policy_text', 'category'].every(h => headers?.includes(h))) throw new Error('Missing policy columns');
  return rows.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`Invalid CSV row ${i + 2}`);
    const result = Object.fromEntries(headers.map((h, j) => [h, values[j]]));
    if (Object.values(result).some(v => !v.trim())) throw new Error(`Empty policy field at row ${i + 2}`);
    return { id: `P${String(i + 1).padStart(3, '0')}`, csv_row: i + 2, ...result };
  });
}
export async function loadPolicies() { return parseCSV(await readFile(new URL('../company_policies.csv', import.meta.url), 'utf8')); }
