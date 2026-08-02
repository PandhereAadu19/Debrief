'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { Calendar, CheckSquare, Settings, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/dashboard', label: 'Meetings', icon: Calendar },
    { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard/meetings');
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Bar */}
      <nav className="border-b border-surfaceLight flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile hamburger toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-surfaceLight text-textMuted hover:text-text transition-colors"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <Logo size={24} />
              <h1
                className="text-xl sm:text-2xl font-bold text-accent tracking-tight"
                style={{
                  fontFamily: "var(--font-space-grotesk)",
                  letterSpacing: "-0.02em",
                }}
              >
                Debrief
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop: sticky, Mobile: overlay */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 bg-surface border-r border-surfaceLight transform transition-all duration-300 ease-in-out
            lg:sticky lg:top-0 lg:h-full lg:transform-none lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            ${sidebarCollapsed ? 'w-16' : 'w-64'}
            pt-16 lg:pt-0
          `}
        >
          <div className="flex flex-col h-full p-4">
            {/* Collapse Toggle (Desktop only) */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex absolute top-4 right-2 z-20 p-1.5 rounded-lg hover:bg-surfaceLight text-textMuted hover:text-text transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} className='flex-shrink-0' /> : <ChevronLeft size={16} className='flex-shrink-0'/>}
            </button>

            {/* Navigation Links */}
            <nav className="flex-1 space-y-1 mt-10">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group
                      ${isActive(link.href)
                        ? 'bg-accent/10 text-accent'
                        : 'text-textMuted hover:text-text hover:bg-surfaceLight'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                    title={sidebarCollapsed ? link.label : undefined}
                  >
                    <Icon size={20} className='flex-shrink-0'/>
                    {!sidebarCollapsed && <span>{link.label}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* UserButton at Bottom */}
            <div className="pt-4 border-t border-surfaceLight flex-shrink-0">
              <div className={`flex items-center flex-shrink-0 ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2`}>
                <UserButton 
                  afterSignOutUrl="/sign-in"
                  appearance={{
                    elements: {
                      avatarBox: 'w-8 h-8',
                    },
                  }}
                />
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                      {user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
