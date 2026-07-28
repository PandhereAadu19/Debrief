'use client';

import { SignIn } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function SignInPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = resolvedTheme || theme || 'dark';
  const isDark = currentTheme === 'dark';

  const appearance = {
    elements: {
      rootBox: 'mx-auto',
      card: {
        background: isDark ? '#202722' : '#FFFFFF',
        boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
      },
      headerTitle: {
        color: isDark ? '#f5f5f5' : '#1a1a1a',
      },
      headerSubtitle: {
        color: isDark ? '#a3a3a3' : '#6b6a63',
      },
      socialButtonsBlockButton: {
        background: isDark ? '#3d3d3d' : '#f5f4f0',
        color: isDark ? '#f5f5f5' : '#1a1a1a',
        border: isDark ? '1px solid #4d4d4d' : '1px solid #e5e3dc',
      },
      socialButtonsBlockButtonHover: {
        background: isDark ? '#4d4d4d' : '#e5e3dc',
      },
      dividerLine: {
        borderColor: isDark ? '#4d4d4d' : '#e5e3dc',
      },
      dividerText: {
        color: isDark ? '#a3a3a3' : '#6b6a63',
      },
      formFieldLabel: {
        color: isDark ? '#f5f5f5' : '#1a1a1a',
      },
      formFieldInput: {
        background: isDark ? '#161C18' : '#FFFFFF',
        color: isDark ? '#f5f5f5' : '#1a1a1a',
        borderColor: isDark ? '#334239' : '#DDD6C9',
      },
      formFieldInputFocus: {
        borderColor: isDark ? '#5F8D6E' : '#4F765B',
        boxShadow: isDark ? '0 0 0 2px rgba(245, 158, 11, 0.2)' : '0 0 0 2px rgba(217, 119, 6, 0.2)',
      },
      formFieldHintText: {
        color: isDark ? '#a3a3a3' : '#6b6a63',
      },
      formFieldWarningText: {
        color: isDark ? '#5F8D6E' : '#4F765B',
      },
      formFieldErrorText: {
        color: '#ef4444',
      },
      footerActionText: {
        color: isDark ? '#a3a3a3' : '#6b6a63',
      },
      footerActionLink: {
        color: isDark ? '#5F8D6E' : '#4F765B',
      },
      footerActionLinkHover: {
        color: isDark ? '#4F765B' : '#3E6048',
      },
      identityPreviewEditButton: {
        background: isDark ? '#3d3d3d' : '#f5f4f0',
        color: isDark ? '#f5f5f5' : '#1a1a1a',
      },
      identityPreviewEditButtonHover: {
        background: isDark ? '#4d4d4d' : '#e5e3dc',
      },
      identityPreviewText: {
        color: isDark ? '#f5f5f5' : '#1a1a1a',
      },
      identityPreviewVerifiedBadge: {
        color: isDark ? '#5F8D6E' : '#4F765B',
      },
      otpCodeFieldInput: {
        background: isDark ? '#161C18' : '#FFFFFF',
        color: isDark ? '#f5f5f5' : '#1a1a1a',
        borderColor: isDark ? '#334239' : '#DDD6C9',
      },
      otpCodeFieldInputFocus: {
        borderColor: isDark ? '#5F8D6E' : '#4F765B',
      },
      button: {
        background: isDark ? '#5F8D6E' : '#4F765B',
        color: isDark ? '#1a1a1a' : '#ffffff',
        fontWeight: '600',
      },
      buttonHover: {
        background: isDark ? '#4F765B' : '#3E6048',
      },
      buttonPrimary: {
        background: '#5F8D6E',
        color: '#FFFFFF',
      },
      buttonPrimaryHover: {
        background: isDark ? '#4F765B' : '#3E6048',
      },
      buttonText: {
        color: isDark ? '#1a1a1a' : '#ffffff',
      },
      text: {
        color: isDark ? '#f5f5f5' : '#1a1a1a',
      },
    },
    variables: {
      colorPrimary: '#5F8D6E',

      colorText: isDark ? '#F4F1EA' : '#2B2B2B',

      colorTextSecondary: isDark ? '#A7A7A7' : '#6E6A63',

      colorBackground: isDark ? '#161C18' : '#F7F4ED',

      colorInputBackground: isDark ? '#1E2520' : '#FFFFFF',

      colorInputText: isDark ? '#F4F1EA' : '#2B2B2B',

      borderRadius: '14px',
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar showAuthButtons={false} />
      
      <div className="flex-1 flex items-center justify-center px-4 py-4 sm:py-6 overflow-y-auto">
        <div className="w-full max-w-md p-4 sm:p-6 md:p-8">
          <SignIn
            appearance={appearance}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    </div>
  );
}
