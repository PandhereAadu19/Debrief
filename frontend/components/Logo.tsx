export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* corner dots */}
      <circle cx="50" cy="10" r="3" fill="var(--accent)" />
      <circle cx="50" cy="90" r="3" fill="var(--accent)" />
      <circle cx="10" cy="50" r="3" fill="var(--accent)" />
      <circle cx="90" cy="50" r="3" fill="var(--accent)" />

      {/* diagonal seats */}
      <rect x="62" y="22" width="14" height="18" rx="7" fill="var(--accent)" transform="rotate(45 69 31)" opacity="0.55" />
      <rect x="62" y="60" width="14" height="18" rx="7" fill="var(--accent)" transform="rotate(135 69 69)" opacity="0.55" />
      <rect x="24" y="60" width="14" height="18" rx="7" fill="var(--accent)" transform="rotate(-135 31 69)" opacity="0.55" />
      <rect x="24" y="22" width="14" height="18" rx="7" fill="var(--accent)" transform="rotate(-45 31 31)" opacity="0.55" />

      {/* cardinal seats */}
      <rect x="43" y="14" width="14" height="20" rx="7" fill="var(--accent)" />
      <rect x="43" y="66" width="14" height="20" rx="7" fill="var(--accent)" />
      <rect x="14" y="43" width="20" height="14" rx="7" fill="var(--accent)" />
      <rect x="66" y="43" width="20" height="14" rx="7" fill="var(--accent)" />

      {/* center circle with D */}
      <circle cx="50" cy="50" r="18" fill="var(--accent)" />
      <text
        x="50"
        y="58"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="var(--background)"
        textAnchor="middle"
      >
        D
      </text>
    </svg>
  );
}