import { useCallback, useRef, useEffect } from 'react';

// Reliable Web Audio API synthesizer for notification chimes and loud kitchen alerts
export const useSound = () => {
  const audioCtx = useRef(null);

  useEffect(() => {
    // AudioContext can only be started after a user gesture on some browsers,
    // so we initialize it lazily when play is called.
  }, []);

  const initAudio = () => {
    if (!audioCtx.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if(AudioContext) {
        audioCtx.current = new AudioContext();
      }
    }
    if (audioCtx.current && audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
  };

  const playChime = useCallback(() => {
    initAudio();
    if (!audioCtx.current) return;
    const t = audioCtx.current.currentTime;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.1); // Slide up to A6
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    osc.start(t);
    osc.stop(t + 0.5);
  }, []);

  const playLoudBeep = useCallback(() => {
    initAudio();
    if (!audioCtx.current) return;
    
    const playSingleBeep = (timeOffset) => {
      const t = audioCtx.current.currentTime + timeOffset;
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, t); 
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + 0.05);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      
      osc.start(t);
      osc.stop(t + 0.2);
    };

    // 3 quick loud beeps
    playSingleBeep(0);
    playSingleBeep(0.3);
    playSingleBeep(0.6);
  }, []);

  return { playChime, playLoudBeep };
};
