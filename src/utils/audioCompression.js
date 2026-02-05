/**
 * Audio Compression Utility
 * Compresses audio to reduce file size for Firebase free tier
 * Uses Web Audio API for processing
 */

export const compressAudio = async (audioBlob) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Convert blob to array buffer
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Downsample to 16kHz mono for smaller file size
  const targetSampleRate = 16000;
  const numberOfChannels = 1;

  // Create offline context for processing
  const offlineContext = new OfflineAudioContext(
    numberOfChannels,
    Math.ceil(audioBuffer.duration * targetSampleRate),
    targetSampleRate,
  );

  // Create buffer source
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  // Render the audio
  const renderedBuffer = await offlineContext.startRendering();

  // Convert to WAV with low bitrate
  const wavBlob = audioBufferToWav(renderedBuffer);

  audioContext.close();

  return wavBlob;
};

// Convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer) {
  const numOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numOfChannels * bytesPerSample;

  const samples = buffer.getChannelData(0);
  const dataLength = samples.length * bytesPerSample;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Calculate estimated file size
export const estimateCompressedSize = (durationSeconds) => {
  // 16kHz, 16-bit, mono = 32KB per second
  // After compression, roughly 4KB per second
  return Math.ceil(durationSeconds * 32 * 1024);
};

// Validate audio duration
export const validateAudioDuration = async (blob, maxSeconds = 5) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration <= maxSeconds);
    };
    audio.onerror = () => resolve(false);
  });
};
