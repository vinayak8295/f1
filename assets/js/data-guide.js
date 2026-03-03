document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('copySchemaBtn');
  const code = document.getElementById('jsonSchemaExample');
  if (!btn || !code) return;

  btn.addEventListener('click', async () => {
    const text = code.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      const prev = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = prev || 'Copy Sample JSON'; }, 1400);
    } catch {
      btn.textContent = 'Copy Failed';
      setTimeout(() => { btn.textContent = 'Copy Sample JSON'; }, 1400);
    }
  });
});
