/**
 * Custom hook for audio recording and streaming to WebSocket.
 * Handles expo-av Audio recording and converts to 16kHz 16-bit PCM format for web and native.
 * Streams chunks in real-time to prevent processing delays.
 */

import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { WebSocketService } from '../services/WebSocketService';

/**
 * Add WAV header to raw PCM audio data.
 * Gemini API requires proper WAV format with RIFF header.
 */
function addWavHeader(
  pcmData: Uint8Array,
  sampleRate: number,
  bitDepth: number,
  channels: number
): Uint8Array {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmData.length;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // Helper to write string to DataView
  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Combine header + PCM data
  const wavData = new Uint8Array(44 + dataSize);
  wavData.set(new Uint8Array(header), 0);
  wavData.set(pcmData, 44);

  return wavData;
}

export interface AudioRecordingConfig {
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  chunkDurationMs?: number;
}

const DEFAULT_CONFIG: Required<AudioRecordingConfig> = {
  sampleRate: 16000, // 16kHz
  bitDepth: 16, // 16-bit
  channels: 1, // mono
  chunkDurationMs: 500, // 500ms chunks for real-time streaming
};

export interface UseAudioRecordingReturn {
  isRecording: boolean;
  isPreparing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  duration: number;
  error: string | null;
}

export function useAudioRecording(
  wsService: WebSocketService | null,
  config: AudioRecordingConfig = {}
): UseAudioRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcmBufferRef = useRef<Float32Array[]>([]); // Accumulate float32 samples for chunking
  const workletModuleRegisteredRef = useRef(false);
  const workletModuleUrlRef = useRef<string | null>(null);

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const sendPcmChunk = useCallback((force = false) => {
    if (!wsService?.isConnected()) {
      console.log('WebSocket not connected, skipping PCM send');
      return;
    }

    if (pcmBufferRef.current.length === 0) {
      console.log('No PCM data to send');
      return;
    }

    // Flatten accumulated samples to single Float32Array, then convert to Int16
    const totalLength = pcmBufferRef.current.reduce((acc, arr) => acc + arr.length, 0);
    const floatData = new Float32Array(totalLength);
    let offset = 0;
    pcmBufferRef.current.forEach(arr => {
      floatData.set(arr, offset);
      offset += arr.length;
    });
    pcmBufferRef.current = []; // Clear buffer

    if (totalLength < 4000 && !force) { // ~0.25s at 16kHz
      console.log(`Skipping small PCM chunk (${totalLength} samples)`);
      return;
    }

    const pcmData = new Int16Array(totalLength);
    for (let i = 0; i < totalLength; i++) {
      pcmData[i] = Math.max(-32768, Math.min(32767, floatData[i] * 32767));
    }

    const pcmBytes = new Uint8Array(pcmData.buffer);
    const wavBytes = addWavHeader(
      pcmBytes,
      finalConfig.sampleRate,
      finalConfig.bitDepth,
      finalConfig.channels
    );

    console.log(`📤 Sending chunk (${wavBytes.length} bytes) to WebSocket`);
    if (Platform.OS === 'web') {
      wsService.sendAudioChunkBase64(wavBytes);
    } else {
      wsService.sendAudioChunk(wavBytes);
    }
  }, [wsService, finalConfig]);

  const startRecording = useCallback(async () => {
    try {
      setIsPreparing(true);
      setError(null);

      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (Platform.OS === 'web') {
        // Raw PCM capture with AudioWorkletNode
        try {
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext({ sampleRate: finalConfig.sampleRate });
            console.log('🎵 AudioContext initialized');
          }

          if (!workletModuleRegisteredRef.current) {
            // Define AudioWorklet processor as string
            const processorCode = `
              class PcmProcessor extends AudioWorkletProcessor {
                constructor() {
                  super();
                }
                process(inputs) {
                  const input = inputs[0][0];
                  if (input) {
                    this.port.postMessage(input);
                  }
                  return true;
                }
              }
              registerProcessor('pcm-processor', PcmProcessor);
            `;

            // Create blob URL for worklet module once per context
            const blob = new Blob([processorCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await audioContextRef.current.audioWorklet.addModule(url);
            workletModuleRegisteredRef.current = true;
            workletModuleUrlRef.current = url;
            console.log('🎵 AudioWorklet module added');
          } else {
            console.log('🎵 AudioWorklet module already registered, reusing existing processor');
          }

          streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
          sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);

          workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm-processor');

          workletNodeRef.current.port.onmessage = (event) => {
            // Don't check isRecording here - it's stale in the closure
            // The worklet will be disconnected when recording stops
            const inputData = event.data; // Float32Array
            if (inputData && inputData.length > 0) {
              pcmBufferRef.current.push(new Float32Array(inputData));
              console.log(`🔊 Captured PCM chunk: ${inputData.length} samples`);
            }
          };

          // Connect nodes
          sourceNodeRef.current.connect(workletNodeRef.current);
          workletNodeRef.current.connect(audioContextRef.current.destination);

          // Resume context if suspended (or start if new)
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
            console.log('🎵 AudioContext resumed');
          } else if (audioContextRef.current.state === 'running') {
            console.log('🎵 AudioContext already running');
          }

          console.log('🎤 Web raw PCM recording started with AudioWorklet');
        } catch (webError) {
          console.error('Web recording setup failed:', webError);
          throw new Error(`Web recording setup failed: ${webError instanceof Error ? webError.message : String(webError)}`);
        }
      } else {
        // Native recording with expo-av
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync({
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          android: {
            extension: '.wav',
            outputFormat: Audio.AndroidOutputFormat.DEFAULT,
            audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
            sampleRate: finalConfig.sampleRate,
            numberOfChannels: finalConfig.channels,
            bitRate: finalConfig.sampleRate * finalConfig.bitDepth * finalConfig.channels,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: finalConfig.sampleRate,
            numberOfChannels: finalConfig.channels,
            bitRate: finalConfig.sampleRate * finalConfig.bitDepth * finalConfig.channels,
            linearPCMBitDepth: finalConfig.bitDepth,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm;codecs=opus',
            bitsPerSecond: 128000,
          },
        });

        recordingRef.current = recording;
        await recording.startAsync();
      }

      setIsRecording(true);
      setIsPreparing(false);

      // Notify WebSocket that conversation started
      if (wsService?.isConnected()) {
        wsService.startConversation();
      }

      // Track duration
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration((Date.now() - startTime) / 1000);
      }, 100);

      // Send chunks periodically (for web PCM accumulation)
      if (Platform.OS === 'web') {
        chunkIntervalRef.current = setInterval(() => {
          console.log('Checking for PCM chunks to send');
          sendPcmChunk();
        }, finalConfig.chunkDurationMs);
      }

      console.log('🎤 Recording started');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsPreparing(false);
      setIsRecording(false);
      if (wsService?.isConnected()) {
        wsService.sendTextMessage('Failed to start recording, please try again');
      }
    }
  }, [wsService, finalConfig, sendPcmChunk]);

  const stopRecording = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        // Send final chunk only if connected
        if (wsService?.isConnected()) {
          console.log('Sending final PCM chunk');
          sendPcmChunk(true);
        }
        pcmBufferRef.current = [];

        // Disconnect nodes
        if (workletNodeRef.current) {
          workletNodeRef.current.disconnect();
          workletNodeRef.current.port.close();
          workletNodeRef.current = null;
        }
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Don't close AudioContext - keep it for subsequent recordings
        // Only suspend it to save resources
        if (audioContextRef.current && audioContextRef.current.state !== 'suspended') {
          await audioContextRef.current.suspend();
          console.log('🎵 AudioContext suspended (kept alive for next recording)');
        }
      } else if (recordingRef.current) {
        console.log('🛑 Stopping native recording...');
        await recordingRef.current.stopAndUnloadAsync();

        // Get recorded URI
        const uri = recordingRef.current.getURI();
        if (!uri) {
          throw new Error('No recording URI available');
        }

        console.log('📁 Recording saved to:', uri);

        // Read audio file and send to WebSocket
        if (wsService?.isConnected()) {
          try {
            const base64Audio = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            });

            // Convert base64 to Uint8Array
            const binaryString = atob(base64Audio);
            let bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Check if already WAV (avoid double-headering)
            let pcmBytes = bytes;
            if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70) { // 'RIFF'
              console.log('Native recording already has WAV header, stripping header');
              pcmBytes = bytes.slice(44); // Strip existing header
            }

            // Add WAV header to raw PCM
            const wavBytes = addWavHeader(
              pcmBytes,
              finalConfig.sampleRate,
              finalConfig.bitDepth,
              finalConfig.channels
            );

            console.log(`📤 Sending final audio (${wavBytes.length} bytes) to WebSocket [PCM: ${pcmBytes.length}, WAV header: 44 bytes]`);
            if (Platform.OS === 'web') {
              wsService.sendAudioChunkBase64(wavBytes);
            } else {
              wsService.sendAudioChunk(wavBytes);
            }
          } catch (sendError) {
            console.error('Failed to send audio to WebSocket:', sendError);
            setError('Failed to send audio to server');
            wsService.sendTextMessage('Failed to send audio, please try again');
          }
        }

        recordingRef.current = null;
      }

      // Clear timers
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
        chunkIntervalRef.current = null;
      }

      setIsRecording(false);
      setDuration(0);

      // Notify WebSocket that conversation stopped
      if (wsService?.isConnected()) {
        wsService.stopConversation();
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      if (wsService?.isConnected()) {
        wsService.sendTextMessage('Failed to stop recording, please try again');
      }
    }
  }, [wsService, finalConfig, sendPcmChunk]);

  return {
    isRecording,
    isPreparing,
    startRecording,
    stopRecording,
    duration,
    error,
  };
}
