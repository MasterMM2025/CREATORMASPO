(function() {
  function showInlineHistoryToast(message, type) {
    if (typeof document === 'undefined' || !document.body) return;
    let toast = document.getElementById('historyInlineToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'historyInlineToast';
      toast.style.cssText = [
        'position:fixed',
        'right:16px',
        'top:16px',
        'max-width:360px',
        'padding:10px 12px',
        'border-radius:10px',
        'font-family:Arial,sans-serif',
        'font-size:13px',
        'font-weight:600',
        'line-height:1.35',
        'box-shadow:0 10px 30px rgba(0,0,0,0.2)',
        'z-index:10000001',
        'opacity:0',
        'transform:translateY(-6px)',
        'transition:opacity .2s ease, transform .2s ease',
        'pointer-events:none'
      ].join(';');
      document.body.appendChild(toast);
    }
    const bg = type === 'error' ? '#d9534f' : type === 'success' ? '#28a745' : '#007cba';
    toast.style.background = bg;
    toast.style.color = '#fff';
    toast.textContent = String(message || '');
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(window.__historyInlineToastTimer);
    window.__historyInlineToastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
    }, 2200);
  }

  function updateProjectHistoryButtons(history) {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    const undoCount = history && Array.isArray(history.undo) ? history.undo.length : 0;
    const redoCount = history && Array.isArray(history.redo) ? history.redo.length : 0;
    const busy = !!(history && history.isApplying);
    const canUndo = undoCount > 0 && !busy;
    const canRedo = redoCount > 0 && !busy;

    if (undoBtn) {
      undoBtn.disabled = !canUndo;
      undoBtn.title = undoCount > 0 ? `Cofnij (${undoCount})` : 'Cofnij';
      undoBtn.style.opacity = canUndo ? '1' : '0.5';
      undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
      undoBtn.style.pointerEvents = canUndo ? 'auto' : 'none';
    }
    if (redoBtn) {
      redoBtn.disabled = !canRedo;
      redoBtn.title = redoCount > 0 ? `Ponów (${redoCount})` : 'Ponów';
      redoBtn.style.opacity = canRedo ? '1' : '0.5';
      redoBtn.style.cursor = canRedo ? 'pointer' : 'not-allowed';
      redoBtn.style.pointerEvents = canRedo ? 'auto' : 'none';
    }
  }

  function showHistoryInfo(message, type) {
    if (typeof window.showAppToast === 'function') {
      window.showAppToast(message, type || 'info');
      return;
    }
    showInlineHistoryToast(message, type || 'info');
    if (type === 'error') {
      console.error(message);
      return;
    }
    console.info(message);
  }

  window.updateProjectHistoryButtons = updateProjectHistoryButtons;
  window.showHistoryInfo = showHistoryInfo;
})();
