const input   = document.getElementById('t-url');
const btn     = document.getElementById('t-btn');
const btnText = document.getElementById('t-btn-text');
const errorEl = document.getElementById('t-error');
const skeleton = document.getElementById('t-skeleton');
const result  = document.getElementById('t-result');
const textEl  = document.getElementById('t-text');
const wcEl    = document.getElementById('t-wc');
const copyBtn = document.getElementById('t-copy');
const copyLbl = document.getElementById('t-copy-lbl');
const dlEl    = document.getElementById('t-dl');

// ── Helpers ──────────────────────────────────────────────

function setError(msg) {
  errorEl.textContent = msg;
}

function clearError() {
  errorEl.textContent = '';
}

function setLoading(on) {
  btn.disabled = on;
  btnText.textContent = on ? 'Transcribiendo…' : 'Descargar Transcripción';
  skeleton.classList.toggle('visible', on);
  if (on) result.classList.remove('visible');
}

function showResult(text) {
  const words = text.trim().split(/\s+/).length;
  textEl.textContent = text;
  wcEl.textContent = words.toLocaleString('es-ES') + ' palabras';

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  dlEl.href = URL.createObjectURL(blob);

  result.classList.add('visible');
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Copy ─────────────────────────────────────────────────

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(textEl.textContent);
    copyBtn.classList.add('copied');
    copyLbl.textContent = 'Copiado ✓';
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyLbl.textContent = 'Copiar';
    }, 2000);
  } catch {
    setError('No se pudo copiar al portapapeles.');
  }
});

// ── Transcribe ───────────────────────────────────────────

async function transcribe() {
  const url = input.value.trim();
  clearError();

  if (!url) {
    setError('Introduce una URL.');
    input.focus();
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    setError('La URL debe comenzar con http:// o https://');
    return;
  }

  setLoading(true);

  try {
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error desconocido al transcribir.');
    }

    let text = '';
    if (typeof data.transcript === 'string') {
      text = data.transcript;
    } else if (Array.isArray(data.transcript?.content)) {
      text = data.transcript.content.map(c => c.text).join(' ');
    } else if (typeof data.transcript?.text === 'string') {
      text = data.transcript.text;
    } else {
      text = JSON.stringify(data.transcript, null, 2);
    }

    if (!text.trim()) {
      throw new Error('El vídeo no tiene transcripción disponible.');
    }

    showResult(text);
  } catch (err) {
    setError(err.message || 'Error al conectar con el servidor.');
  } finally {
    setLoading(false);
  }
}

btn.addEventListener('click', transcribe);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    transcribe();
  }
});