import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="border-t border-surfaceLight">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo size={20} />
          <span
            className="text-sm font-bold text-text"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            Debrief
          </span>
        </div>
        <div className="text-xs text-textMuted text-center sm:text-right space-y-1">
          <p>© 2026 Debrief. All rights reserved.</p>
          <p>
            Designed & Built by <span className="text-accent font-medium">Aaditi Pandhere</span>
          </p>
        </div>
      </div>
    </footer>
  );
}