'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { get } from '@/lib/api';
import { ChevronDown, Circle } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  status: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  participants?: string[];
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
  const [allActionItems, setAllActionItems] = useState<Array<{ status: string; updatedAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [filterOpen, setFilterOpen] = useState(false);       // ← add this
  const filterRef = useRef<HTMLDivElement>(null);

  

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchMeetings();
      fetchActionItems();
    }
  }, [isLoaded, isSignedIn]);

  // ← add the new one directly below, as its own separate useEffect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const fetchActionItems = async () => {
    try {
      const token = await getToken();
      const response = await get('/api/meetings/action-items', token);
      const data = await response.json();
      setAllActionItems(data);
    } catch (err) {
      console.error('Error fetching action items:', err);
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
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalMeetings = meetings.length;
  
  const openActionItems = allActionItems.filter(item => item.status !== 'completed').length;

  const completedThisWeek = allActionItems.filter(
    item => item.status === 'completed' && new Date(item.updatedAt) >= oneWeekAgo
  ).length;

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

  const getFilteredMeetings = () => {
    if (statusFilter === 'all') return meetings;
    if (statusFilter === 'processing') {
      return meetings.filter(m => ['processing', 'transcribing', 'summarizing', 'uploading'].includes(m.status));
    }
    return meetings.filter(m => m.status === statusFilter);
  };

  const getStatusCounts = () => {
    return {
      all: meetings.length,
      completed: meetings.filter(m => m.status === 'completed').length,
      processing: meetings.filter(m => ['processing', 'transcribing', 'summarizing', 'uploading'].includes(m.status)).length,
      failed: meetings.filter(m => m.status === 'failed').length,
    };
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getAvatarColor = (email: string) => {
    // Use a consistent theme-based color scheme that works in both light and dark mode
    const colors = [
      'bg-accent/10 text-accent',
      'bg-surfaceLight text-text',
      'bg-surfaceLight text-textMuted',
      'bg-surfaceLight text-accent',
    ];
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Calculate filtered meetings and counts using useMemo for performance
  const filteredMeetings = useMemo(() => getFilteredMeetings(), [meetings, statusFilter]);
  const statusCounts = useMemo(() => getStatusCounts(), [meetings]);

  // ← add here, right after statusCounts since it depends on that value existing
  const filterLabels = {
    all: `All (${statusCounts.all})`,
    completed: `Completed (${statusCounts.completed})`,
    processing: `Processing (${statusCounts.processing})`,
    failed: `Failed (${statusCounts.failed})`,
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
            {totalMeetings}
          </div>
          <div className="text-xs sm:text-sm text-text-muted">
            Total meetings
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-text" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            Recent meetings
          </h2>

          {/* Custom Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((prev) => !prev)}
              className="flex items-center justify-between gap-3 w-full sm:w-48 px-4 py-2.5 rounded-full text-sm font-medium bg-surfaceLight text-text border border-surfaceLight hover:border-accent/40 transition-colors"
            >
              <span>{filterLabels[statusFilter]}</span>
              <ChevronDown
                size={16}
                className={`text-textMuted transition-transform ${filterOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {filterOpen && (
              <div className="absolute right-0 mt-2 w-full sm:w-48 bg-surface border border-surfaceLight rounded-xl shadow-lg overflow-hidden z-10">
                {(['all', 'completed', 'processing', 'failed'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setStatusFilter(option);
                      setFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      statusFilter === option
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-text hover:bg-surfaceLight'
                    }`}
                  >
                    {filterLabels[option]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {filteredMeetings.length === 0 ? (
          /* Empty State */
          <div className="bg-surface rounded-xl border border-border p-8 sm:p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="text-lg sm:text-xl font-semibold text-text mb-2" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              {statusFilter === 'all' ? 'No meetings yet' : `No ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} meetings`}
            </h3>
            <p className="text-sm sm:text-base text-text-muted mb-6">
              {statusFilter === 'all' ? 'Upload your first recording to get started.' : 'Try selecting a different filter.'}
            </p>
            {statusFilter === 'all' && (
              <Link
                href="/dashboard/meetings/new"
                className="px-6 py-3 bg-accent hover:bg-accent-hover text-background rounded-full font-medium transition-colors text-sm sm:text-base inline-flex items-center justify-center"
              >
                + New Meeting
              </Link>
            )}
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="px-6 py-3 bg-surfaceLight hover:bg-surfaceLight/80 text-text rounded-full font-medium transition-colors text-sm sm:text-base inline-flex items-center justify-center"
              >
                View All Meetings
              </button>
            )}
          </div>
        ) : (
          /* Meetings Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredMeetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/dashboard/meetings/${meeting.id}`}
                className="bg-surface rounded-xl border border-border p-4 sm:p-5 hover:border-accent transition-colors block relative"
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {getStatusBadge(meeting.status)}
                </div>

                {/* Meeting Title */}
                <h3 className="text-base sm:text-lg font-semibold text-text line-clamp-2 pr-16 mb-3" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  {meeting.title}
                </h3>

                {/* Date */}
                <div className="text-xs sm:text-sm text-text-muted mb-4">
                  {formatDate(meeting.createdAt)}
                </div>

                {/* Participant Avatars */}
                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-center mb-4">
                    <div className="flex -space-x-2">
                      {meeting.participants.slice(0, 3).map((email, index) => (
                        <div
                          key={index}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 border-surface ${getAvatarColor(email)}`}
                          title={email}
                        >
                          {getInitials(email)}
                        </div>
                      ))}
                      {meeting.participants.length > 3 && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surfaceLight text-text flex items-center justify-center text-xs font-medium border-2 border-surface">
                          +{meeting.participants.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Link / Retry Button */}
                <div className="flex items-center justify-between mt-auto">
                  {meeting.status === 'failed' ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        retryMeeting(meeting.id);
                      }}
                      className="text-xs sm:text-sm text-accent hover:text-accent-hover font-medium"
                    >
                      Retry
                    </button>
                  ) : (
                    <span className="text-xs sm:text-sm text-text-muted hover:text-accent transition-colors">
                      View
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
  );
}
