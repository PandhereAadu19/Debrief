import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  showAuthButtons?: boolean;
}

export default function Navbar({ showAuthButtons = true }: NavbarProps) {
  return (
    <nav className="border-b-2 border-surfaceLight">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <Logo size={32} />
            <span
              className="text-xl sm:text-2xl font-bold text-accent tracking-tight"
              style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em' }}
            >
              Debrief
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {showAuthButtons && (
              <>
                <SignedOut>
                  <Link
                    href="/sign-in"
                    className="px-3 py-2 text-sm sm:text-base text-textMuted hover:text-text transition-colors hidden sm:block"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-accent hover:bg-accentHover text-background rounded-full font-medium transition-colors text-sm sm:text-base"
                  >
                    Get Started
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-accent hover:bg-accentHover text-background rounded-full font-medium transition-colors text-sm sm:text-base"
                  >
                    Dashboard
                  </Link>
                  <UserButton afterSignOutUrl="/sign-in" />
                </SignedIn>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}