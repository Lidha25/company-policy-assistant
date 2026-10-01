// Read-only model discovery. Never print the API key or raw server errors.
const key = process.env.GEMINI_API_KEY;
if (!key?.trim()) {
  console.error('GEMINI_API_KEY is missing from .env. Add it locally; do not share it.');
  process.exitCode = 1;
} else {
  try {
    let pageToken;
    do {
      const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
      url.searchParams.set('pageSize', '1000');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const response = await fetch(url, {
        headers: { 'x-goog-api-key': key },
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) {
        console.error(`Model-list request failed: HTTP ${response.status}`);
        process.exitCode = 1;
        break;
      }
      const data = await response.json();
      for (const model of data.models || []) {
        const methods = model.supportedGenerationMethods || [];
        if (methods.includes('generateContent') || methods.includes('embedContent')) {
          console.log(`${model.name} | ${methods.join(', ')}`);
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch {
    console.error('Could not list models. Check your internet connection and try again.');
    process.exitCode = 1;
  }
}
