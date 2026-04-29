const videoUrl   = document.getElementById('video-url');
const btn        = document.getElementById('transcribe-btn');
const errorMsg   = document.getElementById('error-msg');
const skeleton   = document.getElementById('skeleton');
const outputCard = document.getElementById('output-card');
const outputText = document.getElementById('output-text');
const copyBtn    = document.getElementById('copy-btn');
const wordCount  = document.getElementById('word-count');
const downloadLk = document.getElementById('download-link');

// ── Helpers ──────────────────────────────────────────────

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('error');
}

function clearError() {
  errorMsg.textContent = '';
  errorMsg.classList.remove('error');
}

function setLoading(loading) {
  btn.disabled = loading;
  btn.querySelector('.btn-text').textContent = loading ? 'Transcribiendo…' : 'Transcribir';
  skeleton.classList.toggle('visible', loading);
  if (loading) outputCard.classList.remove('visible');
}

function showResult(text) {
  const words = text.trim().split(/\s+/).length;
  outputText.textContent = text;
  wordCount.textContent  = `${words.toLocaleString('es-ES')} palabras`;

  // Prepare download link
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadLk.href = URL.createObjectURL(blob);

  outputCard.classList.add('visible');
  outputCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Copy ─────────────────────────────────────────────────

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(outputText.textContent);
    copyBtn.querySelector('svg').style.display = 'none';
    copyBtn.classList.add('copied');
    const originalText = copyBtn.childNodes[copyBtn.childNodes.length - 1];
    originalText.textContent = ' Copiado ✓';
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      originalText.textContent = ' Copiar';
      copyBtn.querySelector('svg').style.display = '';
    }, 2000);
  } catch {
    showError('No se pudo copiar al portapapeles.');
  }
});

// ── Transcribe ───────────────────────────────────────────

async function transcribe() {
  const url = videoUrl.value.trim();
  clearError();

  if (!url) {
    showError('Por favor, introduce una URL.');
    videoUrl.focus();
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    showError('La URL debe comenzar con http:// o https://');
    return;
  }

  setLoading(true);

  try {
    const res = await fetch('/api/transcribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error desconocido al transcribir.');
    }

    // Supadata may return an object with a `content` array or plain text
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
    showError(err.message || 'Error al conectar con el servidor.');
  } finally {
    setLoading(false);
  }
}

btn.addEventListener('click', transcribe);

videoUrl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    transcribe();
  }
});