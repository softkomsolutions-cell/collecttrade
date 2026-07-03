const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 88,
  hero: 120,
};

function BrickAlphaIcon({ size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill="#12141a" />
      <rect x="7" y="19" width="34" height="23" rx="4" fill="#1a1d26" stroke="#c9a962" strokeWidth="1.5" />
      <rect x="11" y="9" width="11" height="11" rx="2.5" fill="#c9a962" />
      <rect x="26" y="9" width="11" height="11" rx="2.5" fill="#c9a962" />
      <path
        d="M17.5 30.5 24 24l6.5 6.5"
        stroke="#f4f5f7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 24v10" stroke="#c9a962" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLogo({
  variant = "icon",
  size = "md",
  className = "",
  showWordmark = false,
}) {
  const dimension = SIZE_MAP[size] || SIZE_MAP.md;

  if (variant === "full" || showWordmark) {
    const height = dimension;
    const width = Math.round(dimension * 4.6);

    return (
      <div className={`brandLogoLockup ${className}`.trim()} aria-label="Brick Alpha">
        <BrickAlphaIcon size={height} />
        <div className="brandLogoWordmark" style={{ fontSize: Math.max(13, height * 0.28) }}>
          <span className="brandLogoName">BRICK</span>
          <span className="brandLogoName brandLogoNameAccent">ALPHA</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`brandLogoIcon ${className}`.trim()}
      style={{ width: dimension, height: dimension }}
      aria-label="Brick Alpha"
      role="img"
    >
      <BrickAlphaIcon size={dimension} />
    </div>
  );
}

export function AuthDashboardPreview() {
  return (
    <div className="authDashboardPreview" aria-hidden="true">
      <div className="authDashboardPreviewChrome">
        <span />
        <span />
        <span />
      </div>
      <div className="authDashboardPreviewBody">
        <div className="authDashboardPreviewHeader">
          <div className="authDashboardPreviewEyebrow" />
          <div className="authDashboardPreviewTitle" />
        </div>
        <div className="authDashboardPreviewKpis">
          <div className="authDashboardPreviewKpi">
            <span />
            <strong />
          </div>
          <div className="authDashboardPreviewKpi">
            <span />
            <strong />
          </div>
          <div className="authDashboardPreviewKpi">
            <span />
            <strong />
          </div>
          <div className="authDashboardPreviewKpi">
            <span />
            <strong />
          </div>
        </div>
        <div className="authDashboardPreviewChart">
          <div className="authDashboardPreviewChartLine" />
        </div>
        <div className="authDashboardPreviewRows">
          <div className="authDashboardPreviewRow" />
          <div className="authDashboardPreviewRow" />
          <div className="authDashboardPreviewRow short" />
        </div>
      </div>
      <div className="authDashboardPreviewGlow" />
    </div>
  );
}

export const AUTH_FEATURE_CARDS = [
  { id: "portfolio", label: "Portfolio Intelligence" },
  { id: "scores", label: "AI Investment Scores" },
  { id: "retirement", label: "Retirement Forecasting" },
  { id: "market", label: "Market Intelligence" },
];
