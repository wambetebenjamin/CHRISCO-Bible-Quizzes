/* Accessible synthesized game sounds; no external audio files or autoplay. */
(function () {
  'use strict';
  const STORAGE_KEY = 'chrisco_game_sounds_muted_v1';
  let muted = false;
  try { muted = localStorage.getItem(STORAGE_KEY) === 'true'; } catch (_) {}
  let audioContext = null;
  const patterns = {
    select: [660],
    next: [494, 659],
    start: [392, 523, 659],
    reveal: [523, 659],
    correct: [523, 659, 784],
    incorrect: [330, 247],
    tick: [740],
    complete: [523, 659, 784, 1047]
  };
  function play(name) {
    if (muted || !patterns[name]) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      audioContext = audioContext || new AudioContext();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      const now = audioContext.currentTime;
      patterns[name].forEach((frequency, index) => {
        const start = now + index * (name === 'tick' || name === 'select' ? .02 : .095);
        const duration = name === 'tick' ? .055 : name === 'select' ? .075 : .14;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = name === 'incorrect' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(name === 'tick' ? .035 : .075, start + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(start); oscillator.stop(start + duration + .015);
      });
    } catch (_) { /* Sound is optional; never interrupt gameplay if audio is unavailable. */ }
  }
  function syncButton(button) {
    button.setAttribute('aria-pressed', String(!muted));
    button.setAttribute('aria-label', muted ? 'Turn game sounds on' : 'Turn game sounds off');
    button.title = muted ? 'Sound off — turn sounds on' : 'Sound on — turn sounds off';
    button.innerHTML = '<i class="fa-solid ' + (muted ? 'fa-volume-xmark' : 'fa-volume-high') + '" aria-hidden="true"></i><span class="sound-label">Sound ' + (muted ? 'off' : 'on') + '</span>';
  }
  function init() {
    const mount = document.querySelector('.topbar-actions') || document.querySelector('.header-inner');
    if (mount && !mount.querySelector('[data-game-sound-toggle]')) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'sound-toggle'; button.dataset.gameSoundToggle = '';
      button.addEventListener('click', () => {
        muted = !muted;
        try { localStorage.setItem(STORAGE_KEY, String(muted)); } catch (_) {}
        syncButton(button);
        if (!muted) play('select');
      });
      syncButton(button); mount.appendChild(button);
    }
  }
  window.ChriscoFX = { play, isMuted: () => muted, setMuted(value) { muted = !!value; try { localStorage.setItem(STORAGE_KEY, String(muted)); } catch (_) {} init(); document.querySelectorAll('[data-game-sound-toggle]').forEach(syncButton); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
