'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { post } from '@/lib/api';
import { Search } from 'lucide-react';

interface ActionItem {
  task: string;
  owner: string | null;
  priority: string;
  status: string;
}

interface Source {
  meetingId: string;
  title: string;
  actionItems: ActionItem[];
}

interface AskDebriefProps {
  meetingId?: string;
}

export default function AskDebrief({ meetingId }: AskDebriefProps) {
  const { getToken } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);

    try {
      const token = await getToken();
      const response = await post('/api/ask', { question, meetingId }, token);
      const data = await response.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (err) {
      console.error('Error asking question:', err);
      setError('Something went wrong — try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4 sm:p-6 mb-8 sm:mb-12">
      <form onSubmit={handleAsk} className="flex items-center gap-3 bg-surfaceLight rounded-lg border border-border px-4 h-11">
        <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about any of your meetings — try 'what's blocking the launch'"
          className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-text-muted"
        />
      </form>

      {loading && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="animate-pulse h-4 bg-surfaceLight rounded w-3/4 mb-2"></div>
          <div className="animate-pulse h-4 bg-surfaceLight rounded w-1/2"></div>
        </div>
      )}

      {error && (
        <p className="mt-4 pt-4 border-t border-border text-sm text-red-500">{error}</p>
      )}

      {answer && !loading && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-text leading-relaxed mb-4">{answer}</p>

          {sources.length > 0 && (
            <>
              <p className="text-xs text-text-muted mb-2">Sources</p>
              <div className="flex flex-col gap-2">
                {sources.map((source) => (
                  <div
                    key={source.meetingId}
                    className="bg-surfaceLight border border-border rounded-lg p-3"
                  >
                    <Link
                      href={`/dashboard/meetings/${source.meetingId}`}
                      className="text-sm font-medium text-text hover:text-accent transition-colors"
                    >
                      {source.title}
                    </Link>
                    {source.actionItems.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-1">
                            {source.actionItems.map((item, i) => (
                            <li key={i}>
                                <Link
                                href="/dashboard/tasks"
                                className="text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-2"
                                >
                                <span
                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    item.status === 'completed' ? 'bg-green-500' : 'bg-accent'
                                    }`}
                                ></span>
                                {item.task}
                                {item.owner && ` — ${item.owner}`}
                                </Link>
                            </li>
                            ))}
                        </ul>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}