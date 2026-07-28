'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, ChevronDown, ChevronUp, Check, RefreshCw, FileText, CheckCircle2, AlertTriangle, HelpCircle, ListChecks } from 'lucide-react';
import { get, post } from '@/lib/api';

interface ActionItem {
  id: string;
  task: string;
  ownerUserId: string | null;
  ownerName: string | null;
  priority: string;
  dueDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Meeting {
  id: string;
  creatorId: string;
  title: string;
  transcript: string | null;
  audioUrl: string | null;
  summary: string | null;
  keyDecisions: string | null;
  risks: string | null;
  openQuestions: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  role: string;
  actionItems: ActionItem[];
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, getToken } = useAuth();
  const meetingId = params.id as string;
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [updatingActionItem, setUpdatingActionItem] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const fetchMeeting = async () => {
    try {
      setError(null);
      const token = await getToken();
      
      const response = await get(`/api/meetings/${meetingId}`, token);
      const data = await response.json();
      setMeeting(data);
      
      // If still processing, continue polling
      if (data.status === 'uploading' || data.status === 'transcribing' || data.status === 'summarizing') {
        setTimeout(fetchMeeting, 5000);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error fetching meeting:', err);
      if (err.message?.includes('404') || err.message?.includes('403')) {
        setError('You don\'t have access to this meeting, or it doesn\'t exist.');
      } else {
        setError('Failed to load meeting. Please try again.');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    fetchMeeting();
  }, [isLoaded, meetingId]);

  const handleRetry = async () => {
    try {
      setRetrying(true);
      setError(null);
      
      const token = await getToken();
      
      await post(`/api/meetings/${meetingId}/retry`, null, token);
      
      // Reset to loading state and start polling
      setLoading(true);
      fetchMeeting();
    } catch (err) {
      console.error('Error retrying meeting:', err);
      setError('Failed to retry meeting. Please try again.');
      setRetrying(false);
    }
  };

  const handleToggleActionItem = async (itemId: string, currentStatus: string) => {
    try {
      setUpdatingActionItem(itemId);
      
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      
      // Optimistic update
      setMeeting(prev => prev ? {
        ...prev,
        actionItems: prev.actionItems.map(item =>
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      } : null);
      
      const token = await getToken();
      
      // Note: The backend route is PATCH /api/meetings/:id/action-items/:itemId
      // We need to add a patch function to lib/api.ts or use apiRequest directly
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}/action-items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update action item');
      }
      
      setUpdatingActionItem(null);
    } catch (err) {
      console.error('Error updating action item:', err);
      // Revert optimistic update
      setMeeting(prev => prev ? {
        ...prev,
        actionItems: prev.actionItems.map(item =>
          item.id === itemId ? { ...item, status: currentStatus } : item
        )
      } : null);
      setUpdatingActionItem(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 bg-dangerBg text-danger rounded text-xs font-medium">High</span>;
      case 'low':
        return <span className="px-2 py-0.5 bg-surfaceLight text-textMuted rounded text-xs font-medium">Low</span>;
      default:
        return <span className="px-2 py-0.5 bg-accent/10 text-accent rounded text-xs font-medium">Medium</span>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
            <p className="text-textMuted">
              {meeting?.status === 'uploading' && 'Uploading audio...'}
              {meeting?.status === 'transcribing' && 'Transcribing meeting...'}
              {meeting?.status === 'summarizing' && 'Generating summary...'}
              {!meeting?.status && 'Loading meeting...'}
            </p>
            <p className="text-sm text-textMuted mt-2">
              This usually takes 2-3 minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-surface rounded-xl border border-border p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text mb-2" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            {error}
          </h2>
          <Link
            href="/dashboard"
            className="inline-block mt-4 px-6 py-2 bg-accent hover:bg-accent-hover text-background rounded-full font-medium transition-colors"
          >
            Back to Meetings
          </Link>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  // Failed state
  if (meeting.status === 'failed') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-surface rounded-xl border border-border p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text mb-2" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            Processing Failed
          </h2>
          <p className="text-textMuted mb-6">
            Something went wrong while processing your meeting. You can try again.
          </p>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent-hover text-background rounded-full font-medium transition-colors disabled:opacity-50"
          >
            {retrying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Retry
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Completed state
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-textMuted hover:text-accent transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Meetings
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text mb-2" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
          {meeting.title}
        </h1>
        <p className="text-sm text-textMuted">
          {formatDate(meeting.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Executive Summary */}
          {meeting.summary && (
            <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-accent" />
                </div>
                Executive Summary
              </h2>
              <p className="text-text leading-relaxed whitespace-pre-line">
                {meeting.summary}
              </p>
            </div>
          )}

          {/* Key Decisions */}
          {meeting.keyDecisions && (
            <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={18} className="text-accent" />
                </div>
                Key Decisions
              </h2>
              <div className="text-text leading-relaxed whitespace-pre-line">
                {meeting.keyDecisions}
              </div>
            </div>
          )}

          {/* Risks */}
          {meeting.risks && (
            <div className="bg-danger/10 rounded-xl border border-danger/20 p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                <div className="w-8 h-8 rounded-lg bg-dangerBg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-danger" />
                </div>
                Risks
              </h2>
              <div className="text-text leading-relaxed whitespace-pre-line">
                {meeting.risks}
              </div>
            </div>
          )}

          {/* Open Questions */}
          {meeting.openQuestions && (
            <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                <div className="w-8 h-8 rounded-lg bg-surfaceLight flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={18} className="text-textMuted" />
                </div>
                Open Questions
              </h2>
              <div className="text-text leading-relaxed whitespace-pre-line">
                {meeting.openQuestions}
              </div>
            </div>
          )}

          {/* Transcript */}
          {meeting.transcript && (
            <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
              <button
                onClick={() => setTranscriptOpen(!transcriptOpen)}
                className="flex items-center justify-between w-full text-left"
              >
                <h2 className="text-lg font-semibold text-text" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  Transcript
                </h2>
                {transcriptOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {transcriptOpen && (
                <div className="mt-4 text-text leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {meeting.transcript}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Items Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-surface rounded-xl border border-border p-6 sticky top-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-4" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <ListChecks size={18} className="text-accent" />
              </div>
              Action Items
            </h2>
            
            {meeting.actionItems.length === 0 ? (
              <p className="text-sm text-textMuted">No action items</p>
            ) : (
              <div className="space-y-3">
                {meeting.actionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${
                      item.status === 'completed'
                        ? 'bg-surfaceLight border-border opacity-60'
                        : 'bg-background border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleActionItem(item.id, item.status)}
                        disabled={updatingActionItem === item.id}
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          item.status === 'completed'
                            ? 'bg-accent border-accent text-background'
                            : 'border-border hover:border-accent'
                        }`}
                      >
                        {item.status === 'completed' && (
                          <Check size={12} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${
                          item.status === 'completed' ? 'line-through text-textMuted' : 'text-text'
                        }`}>
                          {item.task}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {item.ownerName && (
                            <span className="text-xs text-textMuted">
                              {item.ownerName}
                            </span>
                          )}
                          {getPriorityBadge(item.priority)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
