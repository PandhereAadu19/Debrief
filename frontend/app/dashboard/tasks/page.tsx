'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { ListChecks, CheckCircle2, Loader2, AlertCircle, Circle, ArrowRight, Calendar, Plus } from 'lucide-react';

interface ActionItem {
  id: string;
  meetingId: string;
  meetingTitle: string;
  task: string;
  ownerName: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
}

export default function TasksPage() {
  const { isLoaded, getToken } = useAuth();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await apiRequest('/api/meetings/action-items', token, { method: 'GET' });
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    fetchItems();
  }, [isLoaded, fetchItems]);

  const toggleStatus = async (item: ActionItem) => {
    const statusCycle: Record<ActionItem['status'], ActionItem['status']> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending',
    };
    const newStatus = statusCycle[item.status];
    setUpdatingId(item.id);

    // optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );

    try {
      const token = await getToken();
      await apiRequest(
        `/api/meetings/${item.meetingId}/action-items/${item.id}`,
        token,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        }
      );
    } catch (err) {
      console.error('Failed to update task:', err);
      // revert on failure
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const priorityColor = (priority: string) => {
    if (priority === 'high') return 'bg-dangerBg text-danger';
    if (priority === 'medium') return 'bg-surfaceLight text-text';
    return 'bg-surfaceLight text-textMuted';
  };

  const getFilteredItems = () => {
    if (tab === 'all') return items;
    return items.filter((i) => i.status === tab);
  };

  const getTabCounts = () => {
    return {
      all: items.length,
      pending: items.filter((i) => i.status === 'pending').length,
      in_progress: items.filter((i) => i.status === 'in_progress').length,
      completed: items.filter((i) => i.status === 'completed').length,
    };
  };

  const groupByPriority = (items: ActionItem[]) => {
    const groups: Record<string, ActionItem[]> = {
      high: [],
      medium: [],
      low: [],
    };
    items.forEach((item) => {
      groups[item.priority].push(item);
    });
    // Sort within each group by createdAt (newest first)
    Object.keys(groups).forEach((priority) => {
      groups[priority].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
    return groups;
  };

  const visibleItems = getFilteredItems();
  const tabCounts = getTabCounts();
  const groupedItems = groupByPriority(visibleItems);

  // Compute summary banner data
  const highPriorityOpenTasks = items.filter(
    (i) => i.priority === 'high' && (i.status === 'pending' || i.status === 'in_progress')
  );
  const summaryData = highPriorityOpenTasks.length > 0
    ? {
        count: highPriorityOpenTasks.length,
        mostRecentMeeting: highPriorityOpenTasks.reduce((latest, current) =>
          new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
        ).meetingTitle,
      }
    : null;

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-16 p-8 bg-surface border border-surfaceLight rounded-xl shadow-sm text-center">
        <AlertCircle className="mx-auto mb-4 text-danger" size={32} />
        <p className="text-text mb-4">{error}</p>
        <button
          onClick={fetchItems}
          className="px-4 py-2 rounded-full bg-accent text-white hover:bg-accentHover transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            <ListChecks className="text-accent" size={18} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            Tasks
        </h1>
    </div>
      <p className="text-textMuted mb-8">
        Everything assigned across your meetings, in one place.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === 'all'
              ? 'bg-accent text-white shadow-sm'
              : 'bg-surfaceLight text-textMuted hover:text-text'
          }`}
        >
          <Circle size={14}/>
          All ({tabCounts.all})
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === 'pending'
              ? 'bg-accent text-white shadow-sm'
              : 'bg-surfaceLight text-textMuted hover:text-text'
          }`}
        >
          <Circle size={14}/>
          Pending ({tabCounts.pending})
        </button>
        <button
          onClick={() => setTab('in_progress')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === 'in_progress'
              ? 'bg-accent text-white shadow-sm'
              : 'bg-surfaceLight text-textMuted hover:text-text'
          }`}
        >
          <Circle size={14}/>
          In Progress ({tabCounts.in_progress})
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === 'completed'
              ? 'bg-accent text-white shadow-sm'
              : 'bg-surfaceLight text-textMuted hover:text-text'
          }`}
        >
          <Circle size={14}/>
          Completed ({tabCounts.completed})
        </button>
      </div>

      {visibleItems.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-surfaceLight rounded-xl shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 text-accent" size={32} />
          <p className="text-text font-medium">
            {tab === 'all' ? "No tasks yet." : tab === 'completed' ? 'No completed tasks yet.' : `No ${tab.replace('_', ' ')} tasks.`}
          </p>
        </div>
      ) : (
        <>
          {(['high', 'medium', 'low'] as const).map((priority) => {
            const priorityItems = groupedItems[priority];
            if (priorityItems.length === 0) return null;

            return (
              <div key={priority} className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-2 rounded-full ${
                    priority === 'high' ? 'bg-danger' :
                    priority === 'medium' ? 'bg-text' :
                    'bg-textMuted'
                  }`} />
                  <h2 className="text-lg font-semibold text-text capitalize">
                    {priority} Priority
                  </h2>
                  <span className="text-sm text-textMuted">
                    ({priorityItems.length} task{priorityItems.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="space-y-3">
                  {priorityItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-4 bg-surface border border-surfaceLight rounded-xl shadow-sm hover:border-accent/30 transition-colors"
                    >
                      <button
                        onClick={() => toggleStatus(item)}
                        disabled={updatingId === item.id}
                        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          item.status === 'completed'
                            ? 'bg-accent border-accent'
                            : item.status === 'in_progress'
                            ? 'bg-accent/20 border-accent'
                            : 'border-textMuted hover:border-accent'
                        }`}
                      >
                        {item.status === 'completed' && (
                          <CheckCircle2 size={16} className="text-white" />
                        )}
                        {item.status === 'in_progress' && (
                          <div className="w-2 h-2 rounded-full bg-accent" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-text font-medium ${
                            item.status === 'completed' ? 'line-through text-textMuted' : ''
                          }`}
                        >
                          {item.task}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {item.dueDate && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surfaceLight text-textMuted">
                              <Calendar size={11} />
                              {new Date(item.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <Link
                            href={`/dashboard/meetings/${item.meetingId}`}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                          >
                            {item.meetingTitle}
                            <ArrowRight size={11} />
                          </Link>
                          {item.ownerName && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-surfaceLight text-textMuted">{item.ownerName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {summaryData && (
        <div className="mt-8 p-4 bg-accent/5 border border-accent/20 rounded-xl">
          <p className="text-text text-sm">
            You have <span className="font-semibold text-accent">{summaryData.count}</span> high-priority task{summaryData.count !== 1 ? 's' : ''} open, most recently from <span className="font-medium">{summaryData.mostRecentMeeting}</span>.
          </p>
        </div>
      )}

      <Link
        href="/dashboard/meetings/new"
        className="fixed bottom-6 right-6 w-14 h-14 bg-accent hover:bg-accentHover text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}