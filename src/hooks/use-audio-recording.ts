import { useEffect, useRef, useState } from "react"

import { recordAudio } from "@/lib/audio-utils"

interface UseAudioRecordingOptions {
  transcribeAudio?: (blob: Blob) => Promise<string>
  onTranscriptionComplete?: (text: string) => void
}

export function useAudioRecording({
  transcribeAudio,
  onTranscriptionComplete,
}: UseAudioRecordingOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(!!transcribeAudio)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const activeRecordingRef = useRef<any>(null)

  useEffect(() => {
    const checkSpeechSupport = async () => {
      const hasMediaDevices = !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      )
      console.debug(`[useAudioRecording] checkSpeechSupport: hasMediaDevices=${hasMediaDevices} transcribeAudio=${!!transcribeAudio} ts=${new Date().toISOString()}`)
      setIsSpeechSupported(hasMediaDevices && !!transcribeAudio)
    }

    checkSpeechSupport()
  }, [transcribeAudio])

  const stopRecording = async () => {
    setIsRecording(false)
    setIsTranscribing(true)
    try {
      // First stop the recording to get the final blob
      recordAudio.stop()
      // Wait for the recording promise to resolve with the final blob
      const recording = await activeRecordingRef.current
      if (transcribeAudio) {
        const text = await transcribeAudio(recording)
        onTranscriptionComplete?.(text)
      }
    } catch (error) {
      console.error("Error transcribing audio:", error)
    } finally {
      setIsTranscribing(false)
      setIsListening(false)
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
        setAudioStream(null)
      }
      activeRecordingRef.current = null
    }
  }

  const toggleListening = async () => {
    // Respect global guard to avoid requesting mic unless audio init is explicitly allowed
    const allowAudioInit = typeof window !== 'undefined' && (window as any).__ALLOW_AUDIO_INIT === true;
    if (!allowAudioInit) {
      console.debug('[useAudioRecording] toggleListening blocked: audio init not allowed (global guard) ts=' + new Date().toISOString());
      return;
    }

    if (!isListening) {
      try {
        console.debug(`[useAudioRecording] toggleListening -> requesting permission ts=${new Date().toISOString()}`)
        setIsListening(true)
        setIsRecording(true)
        // Get audio stream first
        console.debug(`[useAudioRecording] calling navigator.mediaDevices.getUserMedia ts=${new Date().toISOString()}`)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
        console.debug(`[useAudioRecording] getUserMedia resolved ts=${new Date().toISOString()}`)
        setAudioStream(stream)
        console.debug(`[useAudioRecording] audioStream set ts=${new Date().toISOString()}`, stream)

        // Start recording with the stream
        activeRecordingRef.current = recordAudio(stream)
      } catch (error) {
        console.error("Error recording audio:", error)
        setIsListening(false)
        setIsRecording(false)
        if (audioStream) {
          audioStream.getTracks().forEach((track) => track.stop())
          setAudioStream(null)
        }
      }
    } else {
      await stopRecording()
    }
  }

  return {
    isListening,
    isSpeechSupported,
    isRecording,
    isTranscribing,
    audioStream,
    toggleListening,
    stopRecording,
  }
}
