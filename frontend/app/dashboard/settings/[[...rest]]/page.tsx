'use client';

import { UserProfile } from '@clerk/nextjs';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1
        className="text-2xl sm:text-3xl font-bold text-text mb-2"
        style={{ fontFamily: 'var(--font-space-grotesk)' }}
      >
        Settings
      </h1>
      <p className="text-textMuted mb-8">
        Manage your account details and security.
      </p>

      <div className="w-full overflow-x-auto">
        <UserProfile
          appearance={{
            variables: {
              colorPrimary: 'var(--accent)',
              colorBackground: 'var(--surface)',
              colorInputBackground: 'var(--surface-light)',
              colorInputText: 'var(--text)',
              colorText: 'var(--text)',
              colorTextSecondary: 'var(--text-muted)',
              colorTextOnPrimaryBackground: '#ffffff',
              colorDanger: '#dc2626',
              colorSuccess: 'var(--accent)',
              colorNeutral: 'var(--text-muted)',
              colorShimmer: 'var(--surface-light)',
              borderRadius: '0.75rem',
              fontFamily: 'inherit',
              spacingUnit: '1rem',
            },
            elements: {
              rootBox: 'w-full max-w-full',
              cardBox: 'w-full max-w-full shadow-none border border-surfaceLight rounded-xl',
              card: 'bg-surface w-full max-w-full',
              navbar: 'bg-surface',
              navbarMobileMenuButton: 'text-text',
              navbarButton: 'text-textMuted hover:text-text hover:bg-surfaceLight rounded-lg',
              navbarButton__active: 'text-accent bg-accent/10',
              scrollBox: 'bg-surface',
              pageScrollBox: 'bg-surface p-4 sm:p-6',
              header: 'hidden',
              profileSectionTitleText: 'text-text',
              profileSectionContent: 'text-textMuted',
              profileSectionPrimaryButton: 'text-accent hover:text-accentHover',
              formButtonPrimary:
                'bg-accent hover:bg-accentHover text-white normal-case shadow-none text-sm',
              formButtonReset: 'text-textMuted hover:text-text',
              formFieldInput: 'bg-surfaceLight border-surfaceLight text-text rounded-lg',
              formFieldLabel: 'text-textMuted',
              badge: 'bg-accent/10 text-accent',
              avatarBox: 'border border-surfaceLight',
              accordionTriggerButton: 'text-text hover:bg-surfaceLight rounded-lg',
              menuButton: 'text-textMuted hover:text-text',
              menuList: 'bg-surface border border-surfaceLight shadow-lg',
              menuItem: 'text-text hover:bg-surfaceLight',
              footer: 'hidden',
              footerAction: 'hidden',
              badgeSecondary: 'bg-surfaceLight text-textMuted',
            },
          }}
        />
      </div>
    </div>
  );
}