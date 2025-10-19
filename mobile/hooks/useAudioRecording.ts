/**
 * Custom hook for audio recording and streaming to WebSocket.
 * Handles expo-av Audio recording and converts to 16kHz 16-bit PCM format.
 */

import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { WebSocketService } from '../services/WebSocketService';

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
  chunkDurationMs: 100, // 100ms chunks
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

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

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

      // Create recording with desired format
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

      // Start recording
      await recording.startAsync();
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

      console.log('🎤 Recording started');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsPreparing(false);
      setIsRecording(false);
    }
  }, [wsService, finalConfig]);

  const stopRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) {
        return;
      }

      console.log('🛑 Stopping recording...');
      setIsRecording(false);

      // Clear duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Stop recording
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
          let bytes: Uint8Array;
          
          // Platform-specific audio reading
          if (Platform.OS === 'web') {
            // On web, use fetch to read the blob
            const response = await fetch(uri);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            bytes = new Uint8Array(arrayBuffer);
          } else {
            // On native, use FileSystem
            const base64Audio = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Convert base64 to Uint8Array
            const binaryString = atob(base64Audio);
            bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
          }

          // Send audio to WebSocket
          console.log(`📤 Sending audio (${bytes.length} bytes) to WebSocket`);
          wsService.sendAudioChunk(bytes);

          // Notify that conversation stopped
          wsService.stopConversation();
        } catch (sendError) {
          console.error('Failed to send audio to WebSocket:', sendError);
          setError('Failed to send audio to server');
        }
      }

      // Clean up
      recordingRef.current = null;
      setDuration(0);
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
    }
  }, [wsService]);

  return {
    isRecording,
    isPreparing,
    startRecording,
    stopRecording,
    duration,
    error,
  };
}
