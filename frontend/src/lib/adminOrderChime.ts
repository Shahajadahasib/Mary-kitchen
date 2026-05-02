/** Short two-tone chime when a new admin order notification arrives (no audio file). */
export function playAdminOrderChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    void ctx
      .resume()
      .then(() => {
        playTone(784, 0, 0.12);
        playTone(988, 0.1, 0.18);
        window.setTimeout(() => {
          ctx.close().catch(() => {});
        }, 400);
      })
      .catch(() => {});
  } catch {
    // Autoplay / AudioContext restrictions — ignore silently
  }
}
