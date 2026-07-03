export function scoreTone(score) {
  const numeric = Number(score) || 0;
  if (numeric >= 80) {
    return "excellent";
  }
  if (numeric >= 65) {
    return "good";
  }
  if (numeric >= 50) {
    return "fair";
  }
  return "weak";
}

export function ScoreRing({ score, label = "Score", size = "default" }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(100, Math.max(0, Number(score) || 0)) / 100) * circumference;

  return (
    <div
      className={`iaScoreRing iaScoreRing-${scoreTone(score)}${size === "large" ? " iaScoreRing-large" : ""}`}
    >
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle className="iaScoreRingTrack" cx="64" cy="64" r={radius} />
        <circle
          className="iaScoreRingProgress"
          cx="64"
          cy="64"
          r={radius}
          strokeDasharray={`${progress} ${circumference}`}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="iaScoreRingLabel">
        <strong>{Math.round(Number(score) || 0)}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function ScoreBar({ factor }) {
  return (
    <div className="iaScoreBar" title={factor.explanation}>
      <div className="iaScoreBarHeader">
        <span>{factor.label}</span>
        <div className="iaScoreBarMeta">
          <small>{factor.weight}%</small>
          <strong>{Math.round(factor.score)}</strong>
          <em>+{factor.contribution}</em>
        </div>
      </div>
      <div className="iaScoreBarTrack">
        <div
          className={`iaScoreBarFill iaScoreBarFill-${scoreTone(factor.score)}`}
          style={{ width: `${Math.min(100, Math.max(0, factor.score))}%` }}
        />
      </div>
    </div>
  );
}
