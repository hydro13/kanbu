/**
 * Speech-to-Text Plugin for Lexical Editor
 *
 * Uses the Web Speech API to convert voice to text.
 * Supported in Chrome, Edge, and Safari.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, $createTextNode } from 'lexical';

// =============================================================================
// Types
// =============================================================================

// Web Speech API types (not always in TypeScript)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Declare global types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// =============================================================================
// Props
// =============================================================================

export interface SpeechToTextPluginProps {
  /** Language for speech recognition (default: browser language) */
  lang?: string;
  /** Callback when listening state changes */
  onListeningChange?: (isListening: boolean) => void;
}

// =============================================================================
// Hook for Speech Recognition
// =============================================================================

export function useSpeechRecognition(lang?: string) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [editor] = useLexicalComposerContext();

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = lang || navigator.language || 'en-US';
      setRecognition(recognitionInstance);
    }
  }, [lang]);

  // Handle recognition results
  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result.isFinal && result[0]) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        // Insert the transcribed text at cursor position
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            // Add space before if needed
            const textNode = $createTextNode(finalTranscript);
            selection.insertNodes([textNode]);
          }
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event);
      setIsListening(false);
    };
  }, [recognition, editor]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  }, [recognition, isListening]);

  return {
    isListening,
    isSupported,
    toggleListening,
  };
}

// =============================================================================
// Plugin Component (renders nothing, just provides functionality)
// =============================================================================

export function SpeechToTextPlugin({ lang, onListeningChange }: SpeechToTextPluginProps) {
  const { isListening } = useSpeechRecognition(lang);

  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  return null;
}

export default SpeechToTextPlugin;
