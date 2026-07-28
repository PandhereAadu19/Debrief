'use client';

import { SignUp } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function SignUpPage() {
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
        background: isDark ? '#2d2d2d' : '#ffffff',
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
        background: isDark ? '#1a1a1a' : '#ffffff',
        color: isDark ? '#f5f5f5' : '#1a1a1a',
        borderColor: isDark ? '#3d3d3d' : '#e5e3dc',
      },
      formFieldInputFocus: {
        borderColor: isDark ? '#5D876A' : '#4E7258',
        boxShadow: isDark
          ? '0 0 0 2px rgba(93, 135, 106, 0.2)'
          : '0 0 0 2px rgba(78, 114, 88, 0.2)',
      },
      formFieldHintText: {
        color: isDark ? '#a3a3a3' : '#6b6a63',
      },
      formFieldWarningText: {
        color: isDark ? '#5D876A' : '#4E7258',
      },
      formFieldErrorText: {
        color: '#ef4444',
      },
      footerActionText: {
        color: isDark ? '#a3a3a3' : '#6b6a63',
      },
      footerActionLink: {
        color: isDark ? '#5D876A' : '#4E7258',
      },
      footerActionLinkHover: {
        color: isDark ? '#4E7258' : '#3F5D48',
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
        color: isDark ? '#5D876A' : '#4E7258',
      },
      otpCodeFieldInput: {
        background: isDark ? '#1a1a1a' : '#ffffff',
        color: isDark ? '#f5f5f5' : '#1a1a1a',
        borderColor: isDark ? '#3d3d3d' : '#e5e3dc',
      },
      otpCodeFieldInputFocus: {
        borderColor: isDark ? '#5D876A' : '#4E7258',
      },
      button: {
        background: isDark ? '#5D876A' : '#4E7258',
        color: '#ffffff',
        fontWeight: '600',
      },
      buttonHover: {
        background: isDark ? '#4E7258' : '#3F5D48',
      },
      buttonPrimary: {
        background: isDark ? '#5D876A' : '#4E7258',
        color: '#ffffff',
      },
      buttonPrimaryHover: {
        background: isDark ? '#4E7258' : '#3F5D48',
      },
      buttonText: {
        color: isDark ? '#1a1a1a' : '#ffffff',
      },
      text: {
        color: isDark ? '#f5f5f5' : '#1a1a1a',
      },
    },
    variables: {
      colorPrimary: isDark ? '#5D876A' : '#4E7258',
      colorText: isDark ? '#f5f5f5' : '#1a1a1a',
      colorTextSecondary: isDark ? '#a3a3a3' : '#6b6a63',
      colorBackground: isDark ? '#2d2d2d' : '#ffffff',
      colorInputBackground: isDark ? '#1a1a1a' : '#ffffff',
      colorInputText: isDark ? '#f5f5f5' : '#1a1a1a',
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar showAuthButtons={false} />
      
      <div className="flex-1 flex items-center justify-center px-4 py-4 sm:py-6 overflow-y-auto">
        <div className="w-full max-w-md p-4 sm:p-6 md:p-8">
          <SignUp
            appearance={appearance}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
          />
        </div>
      </div>
    </div>
  );
}
