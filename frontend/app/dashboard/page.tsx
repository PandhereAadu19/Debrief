'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { get } from '@/lib/api';

interface Meeting {
  id: string;
  title: string;
  status: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MeetingWithActionItems extends Meeting {
  actionItems?: Array<{
    id: string;
    task: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithActionItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchMeetings();
    }
  }, [isLoaded, isSignedIn]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await get('/api/meetings', token);
      const data = await response.json();
      setMeetings(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const retryMeeting = async (meetingId: string) => {
    try {
      const token = await getToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/meetings/${meetingId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      fetchMeetings(); // Refresh the list
    } catch (err) {
      console.error('Error retrying meeting:', err);
    }
  };

  // Compute stats from real data
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const meetingsThisMonth = meetings.filter(m => new Date(m.createdAt) >= startOfMonth).length;
  
  const openActionItems = meetings.reduce((count, meeting) => {
    if (meeting.actionItems) {
      return count + meeting.actionItems.filter(item => item.status !== 'completed').length;
    }
    return count;
  }, 0);

  const completedThisWeek = meetings.reduce((count, meeting) => {
    if (meeting.actionItems) {
      return count + meeting.actionItems.filter(
        item => item.status === 'completed' && new Date(item.updatedAt) >= oneWeekAgo
      ).length;
    }
    return count;
  }, 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            Completed
          </span>
        );
      case 'processing':
      case 'transcribing':
      case 'summarizing':
      case 'uploading':
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchMeetings}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const firstName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text mb-2" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            Welcome back, {firstName}
          </h1>
          <p className="text-sm sm:text-base text-text-muted">
            Here's an overview of your meetings.
          </p>
        </div>
        <Link
          href="/dashboard/meetings/new"
          className="mt-4 sm:mt-0 px-4 py-2 sm:px-6 sm:py-2.5 bg-accent hover:bg-accent-hover text-background rounded-full font-medium transition-colors text-sm sm:text-base inline-flex items-center justify-center"
        >
          + New Meeting
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
        <div className="bg-surface rounded-xl border border-border p-4 sm:p-6">
          <div className="text-2xl sm:text-3xl font-bold text-accent mb-1" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            {meetingsThisMonth}
          </div>
          <div className="text-xs sm:text-sm text-text-muted">
            Meetings this month
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 sm:p-6">
          <div className="text-2xl sm:text-3xl font-bold text-accent mb-1" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            {openActionItems}
          </div>
          <div className="text-xs sm:text-sm text-text-muted">
            Open action items
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 sm:p-6">
          <div className="text-2xl sm:text-3xl font-bold text-accent mb-1" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            {completedThisWeek}
          </div>
          <div className="text-xs sm:text-sm text-text-muted">
            Completed this week
          </div>
        </div>
      </div>

      {/* Recent Meetings */}
      <div className="mb-8 sm:mb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-text mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
          Recent meetings
        </h2>

        {meetings.length === 0 ? (
          /* Empty State */
          <div className="bg-surface rounded-xl border border-border p-8 sm:p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="text-lg sm:text-xl font-semibold text-text mb-2" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              No meetings yet
            </h3>
            <p className="text-sm sm:text-base text-text-muted mb-6">
              Upload your first recording to get started.
            </p>
            <Link
              href="/dashboard/meetings/new"
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-background rounded-full font-medium transition-colors text-sm sm:text-base inline-flex items-center justify-center"
            >
              + New Meeting
            </Link>
          </div>
        ) : (
          /* Meetings Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {meetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/dashboard/meetings/${meeting.id}`}
                className="bg-surface rounded-xl border border-border p-4 sm:p-6 hover:border-accent transition-colors block"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base sm:text-lg font-semibold text-text line-clamp-2" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                    {meeting.title}
                  </h3>
                </div>
                <div className="flex items-center justify-between mb-3">
                  {getStatusBadge(meeting.status)}
                </div>
                <div className="text-xs sm:text-sm text-text-muted">
                  {formatDate(meeting.createdAt)}
                </div>
                {meeting.status === 'failed' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      retryMeeting(meeting.id);
                    }}
                    className="mt-3 text-xs sm:text-sm text-accent hover:text-accent-hover font-medium"
                  >
                    Retry
                  </button>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
