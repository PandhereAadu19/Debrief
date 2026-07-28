'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Mic, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { postFormData } from '@/lib/api';

export default function NewMeetingPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'upload' | 'record' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const startRecording = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setMicError('Could not access microphone. Please grant permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canSubmit = title.trim() !== '' && (file !== null || audioBlob !== null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) {
      setError('Please provide a title and select an audio source.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('title', title.trim());
      
      if (mode === 'upload' && file) {
        formData.append('audio', file);
      } else if (mode === 'record' && audioBlob) {
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        formData.append('audio', audioFile);
      }
      
      // Get Clerk token
      const token = await getToken();
      
      const response = await postFormData('/api/meetings', formData, token);
      const data = await response.json();
      
      // Redirect to meeting detail page
      router.push(`/dashboard/meetings/${data.id}`);
      
    } catch (err) {
      console.error('Error creating meeting:', err);
      setError('Failed to create meeting. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <span className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium mb-4">
          New Session
        </span>
        <h1 
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text mb-4"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Capture Clarity
        </h1>
        <p className="text-base sm:text-lg text-text-muted">
          Transform your spoken words into structured intelligence. Choose how you'd like to begin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-text mb-2">
            Meeting Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter meeting title..."
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
            disabled={submitting}
          />
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Upload Card */}
          <button
            type="button"
            onClick={() => {
              setMode('upload');
              triggerFileInput();
            }}
            className={`
              relative p-6 rounded-xl border-2 transition-all text-left
              ${mode === 'upload' 
                ? 'border-accent bg-accent/5' 
                : 'border-border bg-surface hover:border-accent/50'
              }
              ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={submitting}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.webm"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-accent mb-3" />
            <h3 className="text-lg font-semibold text-text mb-1" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              Upload Audio File
            </h3>
            <p className="text-sm text-text-muted">
              {file ? file.name : 'Select an audio file from your device'}
            </p>
          </button>

          {/* Record Card */}
          <button
            type="button"
            onClick={() => setMode('record')}
            className={`
              relative p-6 rounded-xl border-2 transition-all text-left
              ${mode === 'record' 
                ? 'border-accent bg-accent/5' 
                : 'border-border bg-surface hover:border-accent/50'
              }
              ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={submitting}
          >
            <Mic className="w-8 h-8 text-accent mb-3" />
            <h3 className="text-lg font-semibold text-text mb-1" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              Record Meeting
            </h3>
            <p className="text-sm text-text-muted">
              {audioBlob ? 'Recording complete' : 'Record directly from your microphone'}
            </p>
          </button>
        </div>

        {/* Recording Controls */}
        {mode === 'record' && (
          <div className="bg-surface rounded-xl border border-border p-6">
            {micError && (
              <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
                <AlertCircle size={16} />
                <span>{micError}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {recording && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-text font-mono">{formatTime(recordingTime)}</span>
                  </div>
                )}
                {audioBlob && !recording && (
                  <span className="text-sm text-text-muted">
                    Recording saved ({(audioBlob.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                {!recording && !audioBlob && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-background rounded-full font-medium transition-colors flex items-center gap-2"
                  >
                    <Mic size={18} />
                    Start Recording
                  </button>
                )}
                {recording && (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors flex items-center gap-2"
                  >
                    <div className="w-3 h-3 bg-white rounded-full" />
                    Stop Recording
                  </button>
                )}
                {audioBlob && !recording && (
                  <button
                    type="button"
                    onClick={() => {
                      setAudioBlob(null);
                      setRecordingTime(0);
                    }}
                    className="px-4 py-2 bg-surface-light hover:bg-surface-light/80 text-text rounded-full font-medium transition-colors"
                  >
                    Record Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-surface-light rounded-xl border border-border p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-muted">
            AI processing typically requires 2-3 minutes depending on session length.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full px-6 py-3 bg-accent hover:bg-accent-hover text-background rounded-full font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            'Create Meeting'
          )}
        </button>
      </form>
    </div>
  );
}
