/**
 * Web Speech API Integration for Audible Monitoring & Accessibility
 */

export interface SpeechOptions {
  volume?: number;
  rate?: number;
  pitch?: number;
  lang?: string;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function speakNotification(text: string, options: SpeechOptions = {}): boolean {
  if (!isSpeechSupported()) {
    console.warn('[Web Speech API] SpeechSynthesis is not supported in this browser.');
    return false;
  }

  try {
    // Cancel any previous queued speech for immediacy
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = options.volume ?? 1.0;
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.lang = options.lang ?? 'en-US';

    // Pick crisp English voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferredVoice = voices.find(
        (v) =>
          (v.lang === 'en-US' || v.lang.startsWith('en')) &&
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.default)
      ) || voices.find((v) => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error('[Web Speech API] Failed to speak message:', err);
    return false;
  }
}
