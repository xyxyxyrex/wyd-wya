import { useState, useRef, useCallback } from "react";
import { compressAudio } from "../utils/audioCompression";

const MAX_DURATION = 5; // 5 seconds max

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedDurationRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];
      pausedDurationRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const rawBlob = new Blob(chunksRef.current, { type: "audio/webm" });

        // Compress audio
        setIsCompressing(true);
        try {
          const compressedBlob = await compressAudio(rawBlob);
          setAudioBlob(compressedBlob);
          setAudioUrl(URL.createObjectURL(compressedBlob));
        } catch (err) {
          console.error("Compression error:", err);
          // Fallback to raw audio if compression fails
          setAudioBlob(rawBlob);
          setAudioUrl(URL.createObjectURL(rawBlob));
        }
        setIsCompressing(false);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();

      // Update duration timer
      timerRef.current = setInterval(() => {
        const elapsed =
          pausedDurationRef.current +
          (Date.now() - startTimeRef.current) / 1000;
        setDuration(Math.min(elapsed, MAX_DURATION));

        // Auto-stop at max duration
        if (elapsed >= MAX_DURATION) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access.");
      console.error("Recording error:", err);
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      pausedDurationRef.current += (Date.now() - startTimeRef.current) / 1000;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed =
          pausedDurationRef.current +
          (Date.now() - startTimeRef.current) / 1000;
        setDuration(Math.min(elapsed, MAX_DURATION));

        if (elapsed >= MAX_DURATION) {
          stopRecording();
        }
      }, 100);
    }
  }, [isRecording, isPaused]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setError(null);
    setIsPaused(false);
    pausedDurationRef.current = 0;
  }, [audioUrl]);

  return {
    isRecording,
    isPaused,
    audioBlob,
    audioUrl,
    duration,
    error,
    isCompressing,
    maxDuration: MAX_DURATION,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  };
};
