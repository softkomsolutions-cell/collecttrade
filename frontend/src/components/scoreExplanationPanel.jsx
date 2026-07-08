import { useMemo } from "react";

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreTone(score) {
  const numeric = numberOrZero(score);
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

function qualifyAdjective(score) {
  const numeric = numberOrZero(score);
  if (numeric >= 82) {
    return "excellent";
  }
  if (numeric >= 68) {
    return "strong";
  }
  if (numeric >= 52) {
    return "solid";
  }
  if (numeric >= 38) {
    return "moderate";
  }
  return "weak";
}

function displayRecommendation(recommendation) {
  if (recommendation === "Watch") {
    return "Hold";
  }
  if (recommendation === "Avoid") {
    return "Reduce";
  }
  return recommendation || "Hold";
}

function exclusivityScore(item) {
  return clamp(
    numberOrZero(item.exclusivity ?? item.exclusiveMinifigures) * 8,
    0,
    100,
  );
}

function discountScore(item) {
  return clamp(50 + numberOrZero(item.discountPercentage), 0, 100);
}

function metricReason(metric) {
  const { key, score, item } = metric;

  switch (key) {
    case "retirementTimeline":
      if (item.actualRetirementDate) {
        return "Set is retired — supply dynamics favour scarcity-driven appreciation.";
      }
      if (item.retirementStatus === "Imminent" || item.retirementStatus === "Overdue") {
        return "Retirement is near-term, tightening future sealed supply.";
      }
      if (score >= 70) {
        return "Favourable retirement window supports pre-retirement accumulation.";
      }
      return "Retirement timing is still developing — monitor production status.";

    case "minifigureQuality":
      if (score >= 80) {
        return "Collector demand for the minifigure roster is a primary value driver.";
      }
      if (score >= 60) {
        return "Minifigures add meaningful aftermarket appeal.";
      }
      return "Minifigure premium is limited relative to comparable sets.";

    case "discount":
      if (numberOrZero(item.discountPercentage) >= 12) {
        return `${numberOrZero(item.discountPercentage).toFixed(0)}% below retail improves margin of safety.`;
      }
      if (numberOrZero(item.discountPercentage) > 0) {
        return "Modest discount to MSRP supports entry pricing.";
      }
      return "Trading at or above retail — upside depends on scarcity and demand.";

    case "themeStrength":
      return score >= 70
        ? `${item.legoTheme || "This theme"} shows durable collector loyalty and resale depth.`
        : "Theme demand is average — performance may lag category leaders.";

    case "exclusivity":
      if (numberOrZero(item.exclusiveMinifigures) >= 3) {
        return `${item.exclusiveMinifigures} exclusive minifigures create irreplaceable aftermarket demand.`;
      }
      if (numberOrZero(item.exclusiveMinifigures) >= 1) {
        return "Exclusive elements support a collector premium at exit.";
      }
      return "Limited exclusivity — value relies more on theme and display appeal.";

    case "supplyRisk":
      if (score >= 70) {
        return "Sealed supply is tightening — scarcity supports price appreciation.";
      }
      if (score >= 50) {
        return "Supply is balanced; monitor inventory levels on secondary markets.";
      }
      return "Supply may still be elevated — resale competition could cap near-term gains.";

    case "historicalPerformance":
      return score >= 65
        ? "Similar sets in this theme have delivered strong post-retirement returns."
        : "Historical comps suggest more modest appreciation potential.";

    case "displayAppeal":
      return score >= 70
        ? "Strong shelf presence drives display-oriented collector demand."
        : "Display appeal is average — figure and theme premiums matter more.";

    case "partOutValue":
      return score >= 65
        ? "Part-out floor value provides downside protection if sealed demand softens."
        : "Limited part-out premium — sealed-set appreciation is the main thesis.";

    case "liquidity":
      if (score >= 75) {
        return "Active secondary market makes entry and exit relatively efficient.";
      }
      if (score >= 55) {
        return "Liquidity is moderate — allow extra time when sizing exits.";
      }
      return "Thinner market depth may widen bid-ask spreads on exit.";

    case "portfolioFit":
      return score >= 65
        ? "Aligns well with current theme allocation and diversification targets."
        : "May overweight an existing theme exposure — consider portfolio balance.";

    case "retirementProbability":
      if (score >= 78) {
        return "Retirement probability is rising — supply pressure may build soon.";
      }
      if (score >= 55) {
        return "Retirement odds are developing; watch official production updates.";
      }
      return "Retirement timeline remains uncertain — avoid over-sizing pre-retirement.";

    case "retirementConfidence":
      return score >= 75
        ? "High confidence in the expected retirement window supports timing decisions."
        : "Retirement date estimates carry uncertainty — build in a timing buffer.";

    default:
      return "Contributing factor in the Brick Alpha composite score.";
  }
}

function buildMetrics(item) {
  return [
    {
      key: "retirementTimeline",
      label: "Retirement Timeline",
      weight: 12,
      score: numberOrZero(item.retirementTimeline),
      item,
    },
    {
      key: "minifigureQuality",
      label: "Minifigure Quality",
      weight: 10,
      score: numberOrZero(item.minifigureQuality),
      item,
    },
    {
      key: "discount",
      label: "Discount to Retail",
      weight: 10,
      score: discountScore(item),
      item,
    },
    {
      key: "themeStrength",
      label: "Theme Strength",
      weight: 12,
      score: numberOrZero(item.themeStrength),
      item,
    },
    {
      key: "exclusivity",
      label: "Exclusivity",
      weight: 8,
      score: exclusivityScore(item),
      item,
    },
    {
      key: "supplyRisk",
      label: "Supply Risk",
      weight: 10,
      score: numberOrZero(item.supplyScarcity),
      item,
    },
    {
      key: "historicalPerformance",
      label: "Historical Performance",
      weight: 5,
      score: numberOrZero(item.historicalPerformance),
      item,
    },
    {
      key: "displayAppeal",
      label: "Display Appeal",
      weight: 8,
      score: numberOrZero(item.displayAppeal),
      item,
    },
    {
      key: "partOutValue",
      label: "Part-Out Value",
      weight: 6,
      score: numberOrZero(item.partOutValue),
      item,
    },
    {
      key: "liquidity",
      label: "Liquidity",
      weight: 8,
      score: numberOrZero(item.liquidityScore),
      item,
    },
    {
      key: "portfolioFit",
      label: "Portfolio Fit",
      weight: 3,
      score: numberOrZero(item.portfolioFit),
      item,
    },
    {
      key: "retirementProbability",
      label: "Retirement Probability",
      weight: 0,
      score: numberOrZero(item.retirementProbability),
      item,
    },
    {
      key: "retirementConfidence",
      label: "Retirement Confidence",
      weight: 0,
      score: numberOrZero(item.retirementConfidence),
      item,
    },
  ].map((metric) => ({
    ...metric,
    contribution: Math.round((metric.weight / 100) * metric.score),
    reason: metricReason(metric),
  }));
}

function buildSummary(item, topDrivers) {
  const score = numberOrZero(item.brickAlphaScore);
  const recommendation = displayRecommendation(item.recommendation);
  const driverPhrases = topDrivers
    .slice(0, 3)
    .map((driver) => {
      const adj = qualifyAdjective(driver.score);
      if (driver.key === "discount") {
        return numberOrZero(item.discountPercentage) > 0
          ? "an attractive discount to retail"
          : "favourable pricing dynamics";
      }
      if (driver.key === "minifigureQuality") {
        return `${adj} minifigure value`;
      }
      if (driver.key === "retirementTimeline") {
        return `${adj} retirement timing`;
      }
      if (driver.key === "themeStrength") {
        return `${adj} theme performance`;
      }
      return `${adj} ${driver.label.toLowerCase()}`;
    });

  if (score >= 80) {
    const drivers =
      driverPhrases.length >= 2
        ? `${driverPhrases.slice(0, -1).join(", ")}, and ${driverPhrases[driverPhrases.length - 1]}`
        : driverPhrases[0] || "strong fundamentals across the model";
    return `Brick Alpha rates this set highly because it combines ${drivers}.`;
  }

  if (score >= 65) {
    return `Brick Alpha sees a constructive setup here — ${driverPhrases[0] || "balanced fundamentals"} support a ${recommendation} stance, though some factors warrant monitoring.`;
  }

  if (score >= 50) {
    return `Brick Alpha rates this set as mixed. ${driverPhrases[0] ? `Positives include ${driverPhrases[0]}, but` : "Several factors"} headwinds keep the overall score in ${recommendation} territory.`;
  }

  return `Brick Alpha is cautious on this set. Weakness across key drivers — particularly ${driverPhrases[driverPhrases.length - 1] || "valuation and demand"} — supports a ${recommendation} view.`;
}

function buildPositiveDrivers(item, metrics) {
  const drivers = [];

  const scoredMetrics = metrics.filter((metric) => metric.weight > 0);

  scoredMetrics
    .filter((metric) => metric.score >= 68)
    .sort((left, right) => right.score - left.score)
    .forEach((metric) => {
      const adj = qualifyAdjective(metric.score);
      drivers.push(`${adj.charAt(0).toUpperCase() + adj.slice(1)} ${metric.label.toLowerCase()}`);
    });

  if (numberOrZero(item.retirementProbability) >= 72 && !drivers.some((d) => d.includes("retirement probability"))) {
    drivers.push("Retirement probability is rising");
  }

  if (numberOrZero(item.portfolioFit) >= 65 && !drivers.some((d) => d.includes("portfolio"))) {
    drivers.push("Good portfolio fit");
  }

  if (numberOrZero(item.discountPercentage) >= 10 && !drivers.some((d) => d.includes("discount"))) {
    drivers.push("Attractive discount to retail");
  }

  if (numberOrZero(item.retirementConfidence) >= 75 && !drivers.some((d) => d.includes("confidence"))) {
    drivers.push("High retirement confidence");
  }

  if (!drivers.length) {
    drivers.push("No standout positive drivers — the set is balanced rather than exceptional");
  }

  return drivers.slice(0, 6);
}

function buildRiskFactors(item, metrics) {
  const risks = [];

  const supply = metrics.find((metric) => metric.key === "supplyRisk");
  if (supply && supply.score < 55) {
    risks.push("Supply may still be elevated");
  }

  if (numberOrZero(item.riskScore) >= 55) {
    risks.push("Remake risk should be monitored");
  }

  const liquidity = metrics.find((metric) => metric.key === "liquidity");
  if (liquidity && liquidity.score >= 45 && liquidity.score < 70) {
    risks.push("Liquidity is moderate");
  } else if (liquidity && liquidity.score < 45) {
    risks.push("Exit liquidity may be limited");
  }

  if (numberOrZero(item.discountPercentage) <= 0) {
    risks.push("Entry is at or above retail — less margin of safety");
  }

  if (numberOrZero(item.retirementConfidence) < 60) {
    risks.push("Retirement timing carries uncertainty");
  }

  const historical = metrics.find((metric) => metric.key === "historicalPerformance");
  if (historical && historical.score < 50) {
    risks.push("Historical theme performance has been uneven");
  }

  if (item.retirementStatus === "Available" && numberOrZero(item.retirementProbability) < 50) {
    risks.push("Long runway before retirement may delay appreciation");
  }

  if (!risks.length) {
    risks.push("No major risk flags — standard storage and exit timing considerations apply");
  }

  return risks.slice(0, 5);
}

function buildRecommendationExplanation(item, topDrivers) {
  const recommendation = displayRecommendation(item.recommendation);
  const score = Math.round(numberOrZero(item.brickAlphaScore));

  const timingDriver = topDrivers.find((driver) => driver.key === "retirementTimeline");
  const demandDriver = topDrivers.find(
    (driver) =>
      driver.key === "minifigureQuality" ||
      driver.key === "themeStrength" ||
      driver.key === "exclusivity",
  );

  if (recommendation === "Strong Buy") {
    return `Recommendation: Strong Buy because the set scores above ${score >= 90 ? 90 : 84}, has ${timingDriver && timingDriver.score >= 65 ? "strong retirement timing" : "favourable fundamentals"}, and shows ${demandDriver && demandDriver.score >= 70 ? "high collector demand" : "solid collector appeal"}.`;
  }

  if (recommendation === "Buy") {
    return `Recommendation: Buy because the score of ${score}/100 reflects ${timingDriver && timingDriver.score >= 60 ? "constructive retirement positioning" : "balanced upside drivers"} with acceptable risk for accumulation.`;
  }

  if (recommendation === "Hold") {
    return `Recommendation: Hold because the set scores ${score}/100 — fundamentals are adequate but not compelling enough to add aggressively at current pricing.`;
  }

  if (recommendation === "Reduce") {
    return `Recommendation: Reduce because the score of ${score}/100 and elevated risk factors suggest trimming exposure or waiting for a better entry.`;
  }

  if (recommendation === "Sell") {
    return `Recommendation: Sell because realized gains or weakening fundamentals — score ${score}/100 — favour redeploying capital into higher-conviction opportunities.`;
  }

  return `Recommendation: ${recommendation} based on a Brick Alpha score of ${score}/100 and the current balance of drivers and risks.`;
}

function ContributionCard({ metric, rank }) {
  const maxContribution = 12;
  const barWidth = Math.min(100, (metric.contribution / maxContribution) * 100);

  return (
    <article className={`wtsContributionCard wtsContributionCard-${scoreTone(metric.score)}`}>
      <div className="wtsContributionRank">#{rank}</div>
      <div className="wtsContributionBody">
        <div className="wtsContributionHeader">
          <h3>{metric.label}</h3>
          <div className="wtsContributionScores">
            <span className="wtsContributionScore">{Math.round(metric.score)}</span>
            <span className="wtsContributionWeight">{metric.weight}% weight</span>
          </div>
        </div>
        <div className="wtsContributionBarTrack">
          <div
            className={`wtsContributionBarFill wtsContributionBarFill-${scoreTone(metric.score)}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <p className="wtsContributionReason">{metric.reason}</p>
      </div>
    </article>
  );
}

export function ScoreExplanationPanel({ item, embedded = false }) {
  const explanation = useMemo(() => {
    if (!item) {
      return null;
    }

    const metrics = buildMetrics(item);
    const weightedMetrics = metrics.filter((metric) => metric.weight > 0);
    const topDrivers = [...weightedMetrics]
      .sort((left, right) => right.contribution - left.contribution || right.score - left.score)
      .slice(0, 5);

    return {
      summary: buildSummary(item, topDrivers),
      positiveDrivers: buildPositiveDrivers(item, metrics),
      riskFactors: buildRiskFactors(item, metrics),
      topDrivers,
      recommendationExplanation: buildRecommendationExplanation(item, topDrivers),
      score: Math.round(numberOrZero(item.brickAlphaScore)),
      recommendation: displayRecommendation(item.recommendation),
      grade: item.investmentGrade,
    };
  }, [item]);

  if (!explanation) {
    return null;
  }

  return (
    <article className="wtsPanel iaGlassCard" id="why-this-score">
      <div className="wtsPanelHeader">
        <div className="wtsPanelTitleGroup">
          <span className="executiveDashboardEyebrow">Premium Insight</span>
          <h2>Why This Score?</h2>
        </div>
        <div className="wtsPanelBadge">
          <span>Brick Alpha Score</span>
          <strong>{explanation.score}</strong>
          <em>{explanation.recommendation}</em>
        </div>
      </div>

      <p className="wtsSummary">{explanation.summary}</p>

      <div className="wtsInsightGrid">
        <section className="wtsInsightColumn wtsInsightColumn-positive">
          <h3>
            <span className="wtsInsightIcon wtsInsightIcon-positive" aria-hidden="true" />
            Positive drivers
          </h3>
          <ul className="wtsInsightList">
            {explanation.positiveDrivers.map((driver) => (
              <li key={driver}>{driver}</li>
            ))}
          </ul>
        </section>

        <section className="wtsInsightColumn wtsInsightColumn-risk">
          <h3>
            <span className="wtsInsightIcon wtsInsightIcon-risk" aria-hidden="true" />
            Risk factors
          </h3>
          <ul className="wtsInsightList">
            {explanation.riskFactors.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="wtsContributions">
        <div className="wtsContributionsHeader">
          <h3>Top score contributors</h3>
          <p>The five factors contributing most to the Brick Alpha composite.</p>
        </div>
        <div className="wtsContributionGrid">
          {explanation.topDrivers.map((metric, index) => (
            <ContributionCard key={metric.key} metric={metric} rank={index + 1} />
          ))}
        </div>
      </section>

      <footer className={`wtsVerdict${embedded ? " wtsVerdict-embedded" : ""}`}>
        <span className="wtsVerdictLabel">Analyst verdict</span>
        <p>{explanation.recommendationExplanation}</p>
        {embedded || !explanation.grade ? null : <small>{explanation.grade}</small>}
      </footer>
    </article>
  );
}
