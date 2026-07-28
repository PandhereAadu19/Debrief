import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar showAuthButtons={true} />

      <main className="flex-1">
        {/* HERO + MOCKUP */}
        <section className="bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-10 sm:pb-14">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left: text */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-6 bg-surfaceLight">
                  <span className="text-xs sm:text-sm font-medium text-accent">
                    AI Meeting Assistant
                  </span>
                </div>
                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text mb-1"
                  style={{ fontFamily: 'var(--font-playfair)' }}
                >
                  Meetings,
                </h1>
                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold text-accent italic mb-5"
                  style={{ fontFamily: 'var(--font-playfair)' }}
                >
                  distilled.
                </h1>
                <p className="text-base sm:text-lg text-textMuted mb-8 max-w-md mx-auto lg:mx-0">
                  Debrief turns your meeting recordings into structured summaries, key decisions, and trackable action items — automatically.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Link
                    href="/sign-up"
                    className="px-6 py-3 bg-accent hover:bg-accentHover text-background rounded-full font-medium transition-colors text-base"
                  >
                    Try Debrief for Free
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="px-6 py-3 border-2 border-accent text-accent hover:bg-accent hover:text-background rounded-full font-medium transition-colors text-base"
                  >
                    See how it works
                  </Link>
                </div>
              </div>

              {/* Right: product mockup with glow */}
              <div className="relative py-6">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent opacity-25 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-16 w-48 h-48 rounded-full bg-accentHover opacity-15 blur-3xl pointer-events-none"></div>

                <div className="relative bg-surface rounded-2xl border border-surfaceLight overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl max-w-[520px] mx-auto">
                  {/* Card header: logo, not traffic-light dots */}
                  <div className="px-5 py-4 flex items-center gap-2.5 border-b border-surfaceLight bg-surfaceLight/40">
                    <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                      <span
                        className="text-background text-xs font-bold"
                        style={{ fontFamily: 'var(--font-space-grotesk)' }}
                      >
                        D
                      </span>
                    </div>
                    <span
                      className="text-sm font-semibold text-text"
                      style={{ fontFamily: 'var(--font-space-grotesk)' }}
                    >
                      Debrief
                    </span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <h3
                      className="text-lg font-semibold text-text mb-2"
                      style={{ fontFamily: 'var(--font-space-grotesk)' }}
                    >
                      Product Sync — Q3 Roadmap
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-textMuted mb-3">
                      <span className="px-2 py-1 bg-surfaceLight rounded text-xs">
                        Completed
                      </span>

                      <span>45 min</span>

                      <span className="ml-auto px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                        ✨ AI Generated
                      </span>
                    </div>

                    {/* Meeting Summary */}
                    <div className="flex items-center gap-2 mb-2">
                      <span>📝</span>
                      <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wide">
                        Meeting Summary
                      </p>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <p className="text-xs text-text">• Finalized Q3 roadmap priorities</p>
                      <p className="text-xs text-text">• Marketing launch scheduled for Aug 15</p>
                      <p className="text-xs text-text">• API performance improvements approved</p>
                    </div>

                    <hr className="my-4 border-surfaceLight" />

                    {/* Key Decisions */}
                    <div className="flex items-center gap-2 mb-2">
                      <span>🎯</span>
                      <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wide">
                        Key Decisions
                      </p>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-start gap-2">
                        <svg className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-xs text-text">Ship AI Summary v2 this sprint</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-xs text-text">Invite beta users next week</p>
                      </div>
                    </div>

                    <hr className="my-4 border-surfaceLight" />

                    {/* Action Items */}
                    <div className="flex items-center gap-2 mb-3">
                      <span>✅</span>
                      <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wide">
                        Action Items
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-accent flex-shrink-0 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-xs text-text flex-1">Update roadmap</p>
                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                            @sarah
                          </span>

                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Done
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border-2 border-surfaceLight flex-shrink-0"></div>
                        <p className="text-xs text-text flex-1">Share client feedback</p>
                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                            @alex
                          </span>

                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                            Tomorrow
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border-2 border-surfaceLight flex-shrink-0"></div>
                        <p className="text-xs text-text flex-1">Schedule design review</p>
                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                            @priya
                          </span>

                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            Review
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="bg-surface border-y border-surfaceLight">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-16 sm:pb-24">
            <div className="text-center mb-12 sm:mb-16">
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text mb-4"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                How it works
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              {[
                { n: 1, title: 'Record', desc: 'Upload a meeting recording or record directly in your browser.' },
                { n: 2, title: 'Process', desc: 'Our AI transcribes and distills it into a structured summary, decisions, and action items.' },
                { n: 3, title: 'Act', desc: "Review, edit if needed, and share with your team. Check off tasks as they're completed." },
              ].map((step) => (
                <div key={step.n} className="text-center">
                  <div
                    className="w-12 h-12 rounded-full bg-accent text-background flex items-center justify-center text-xl font-bold mx-auto mb-4"
                    style={{ fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    {step.n}
                  </div>
                  <h3 className="text-lg font-semibold text-text mb-2">{step.title}</h3>
                  <p className="text-textMuted text-sm sm:text-base">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE GRID */}
        <section className="bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-10 sm:pb-14">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-surface rounded-xl border border-surfaceLight p-6 sm:p-8">
                <h3
                  className="text-xl font-semibold text-text mb-3"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  Structured Summaries
                </h3>
                <p className="text-textMuted text-sm sm:text-base">
                  Key decisions, risks, and open questions extracted automatically.
                </p>
              </div>
              <div className="bg-surface rounded-xl border border-surfaceLight p-6 sm:p-8">
                <h3
                  className="text-xl font-semibold text-text mb-3"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  Private by Default
                </h3>
                <p className="text-textMuted text-sm sm:text-base">
                  Only invited participants can see a meeting.
                </p>
              </div>
              <div className="bg-surface rounded-xl border border-surfaceLight p-6 sm:p-8">
                <h3
                  className="text-xl font-semibold text-text mb-3"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  Action Item Tracking
                </h3>
                <p className="text-textMuted text-sm sm:text-base">
                  Assign, prioritize, and check off tasks.
                </p>
              </div>
              <div className="bg-accent rounded-xl border border-accent p-6 sm:p-8">
                <h3
                  className="text-xl font-semibold text-background mb-3"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  Built for Teams
                </h3>
                <p className="text-background text-sm sm:text-base opacity-90">
                  Invite participants, assign ownership, everyone stays aligned.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CLOSING CTA */}
        <section className="bg-surface border-t border-surfaceLight">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-16 sm:pb-24">
            <div className="bg-background rounded-xl border border-surfaceLight p-8 sm:p-12 text-center">
              <h2
                className="text-3xl sm:text-4xl font-bold text-text mb-4"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                Ready to get started?
              </h2>
              <p className="text-textMuted text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
                Turn your next meeting recording into a clear summary and action list.
              </p>
              <Link
                href="/sign-up"
                className="inline-block px-6 py-3 sm:px-8 sm:py-3 bg-accent hover:bg-accentHover text-background rounded-full font-medium transition-colors text-base sm:text-lg"
              >
                Get Started — It's Free
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}