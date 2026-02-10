// ASCII Glitch effect for redacted text
// Credits: https://codepen.io/erevan
const WAVE_THRESH = 3;
const CHAR_MULT = 3;
const ANIM_STEP = 40;
const WAVE_BUF = 5;

const createASCIIShift = (el, opts = {}) => {
  let origTxt = el.getAttribute('data-reveal') || el.textContent;
  let origChars = origTxt.split("");
  let isAnim = false;
  let cursorPos = 0;
  let waves = [];
  let animId = null;
  let isHover = false;
  let origW = null;

  const cfg = {
    dur: 800,
    chars: '.,·-─~+:;=*π""┐┌┘┴┬╗╔╝╚╬╠╣╩╦║░▒▓█▄▀▌▐■!?&#$@0123456789*',
    preserveSpaces: true,
    spread: 0.8,
    ...opts
  };

  const updateCursorPos = (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const len = origTxt.length;
    const pos = Math.round((x / rect.width) * len);
    cursorPos = Math.max(0, Math.min(pos, len - 1));
  };

  const startWave = () => {
    waves.push({
      startPos: cursorPos,
      startTime: Date.now(),
      id: Math.random()
    });

    if (!isAnim) start();
  };

  const cleanupWaves = (t) => {
    waves = waves.filter((w) => t - w.startTime < cfg.dur);
  };

  const calcWaveEffect = (charIdx, t) => {
    let shouldAnim = false;
    let resultChar = origChars[charIdx];

    for (const w of waves) {
      const age = t - w.startTime;
      const prog = Math.min(age / cfg.dur, 1);
      const dist = Math.abs(charIdx - w.startPos);
      const maxDist = Math.max(w.startPos, origChars.length - w.startPos - 1);
      const rad = (prog * (maxDist + WAVE_BUF)) / cfg.spread;

      if (dist <= rad) {
        shouldAnim = true;
        const intens = Math.max(0, rad - dist);

        if (intens <= WAVE_THRESH && intens > 0) {
          const charIdx =
            (dist * CHAR_MULT + Math.floor(age / ANIM_STEP)) % cfg.chars.length;
          resultChar = cfg.chars[charIdx];
        }
      }
    }

    return { shouldAnim, char: resultChar };
  };

  const genScrambledTxt = (t) =>
    origChars
      .map((char, i) => {
        if (cfg.preserveSpaces && char === " ") return " ";
        const res = calcWaveEffect(i, t);
        return res.shouldAnim ? res.char : char;
      })
      .join("");

  const stop = () => {
    el.textContent = origTxt;
    el.classList.remove("ascii-active");
    if (origW !== null) {
      el.style.width = "";
      origW = null;
    }
    isAnim = false;
  };

  const start = () => {
    if (isAnim) return;

    if (origW === null) {
      origW = el.getBoundingClientRect().width;
      el.style.width = `${origW}px`;
    }

    isAnim = true;
    el.classList.add("ascii-active");

    const animate = () => {
      const t = Date.now();
      cleanupWaves(t);

      if (waves.length === 0) {
        stop();
        return;
      }

      el.textContent = genScrambledTxt(t);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
  };

  const handleEnter = (e) => {
    isHover = true;
    updateCursorPos(e);
    startWave();
  };

  const handleLeave = () => {
    isHover = false;
  };

  const init = () => {
    const events = [
      ["mouseenter", handleEnter],
      ["mouseleave", handleLeave]
    ];
    events.forEach(([evt, handler]) => el.addEventListener(evt, handler));
  };

  const destroy = () => {
    waves = [];
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (origW !== null) {
      el.style.width = "";
      origW = null;
    }
    stop();
    ["mouseenter", "mouseleave"].forEach((evt, i) =>
      el.removeEventListener(evt, [handleEnter, handleLeave][i])
    );
  };

  init();
  return { destroy };
};

// Export createASCIIShift to global scope
window.createASCIIShift = createASCIIShift;

// Initialize ASCII effect on all redactions
const initRedactionGlitch = () => {
  const redactions = document.querySelectorAll('.redaction');
  redactions.forEach((redaction) => {
    if (!redaction.textContent.trim()) return;
    createASCIIShift(redaction, { dur: 1000, spread: 0.6 });
  });
};

// Export for use in main script
window.initRedactionGlitch = initRedactionGlitch;
