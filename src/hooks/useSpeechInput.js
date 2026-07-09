import { useState, useRef, useCallback } from "react";

const SpeechRecognition = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export function useSpeechInput(onTranscript) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => !!SpeechRecognition);
  const recRef = useRef(null);

  const start = useCallback(() => {
    if (!SpeechRecognition || listening) return;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .slice(e.resultIndex)
        .filter(r => r.isFinal)
        .map(r => r[0].transcript)
        .join(" ");
      if (transcript.trim()) onTranscript(transcript.trim());
    };

    rec.onerror = () => { setListening(false); recRef.current = null; };
    rec.onend = () => { setListening(false); recRef.current = null; };

    rec.start();
    recRef.current = rec;
    setListening(true);
  }, [listening, onTranscript]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  return { listening, supported, toggle };
}
