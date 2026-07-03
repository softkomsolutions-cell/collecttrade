import { useCallback, useMemo, useRef, useState } from "react";
import { enrichBrickAlphaCollectible } from "../brickAlphaModel";
import { formatCollectiblePrice } from "../appUtils";
import { AlphaSignalBadges } from "./workspaceCards";

const FLOW_STEPS = [
  { id: "upload", label: "Upload Evidence" },
  { id: "identify", label: "Identify Set" },
  { id: "evaluate", label: "Evaluate Investment" },
  { id: "portfolio", label: "Add to Portfolio" },
];

const CONDITION_OPTIONS = [
  { value: "sealed", label: "Sealed — mint box" },
  { value: "open-box", label: "Open box — complete" },
  { value: "used", label: "Used / built" },
];

const DEMO_SET_HINTS = {
  "75252": "lego-star-wars-75252",
  "10305": "lego-icons-10305",
  "76178": "lego-star-wars-75252",
  "10294": "lego-icons-10305",
};

function formatScore(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}/100` : "--";
}

function recommendationTone(recommendation) {
  if (recommendation === "Strong Buy" || recommendation === "Buy") {
    return "buy";
  }
  if (recommendation === "Sell" || recommendation === "Avoid") {
    return "sell";
  }
  return "hold";
}

function displayRecommendation(recommendation) {
  if (recommendation === "Watch") {
    return "Hold";
  }
  if (recommendation === "Avoid") {
    return "Reduce";
  }
  return recommendation;
}

function extractSetNumber(item) {
  if (item?.sku) {
    return item.sku;
  }
  const match = String(item?.id || "").match(/(\d{4,6})/);
  return match ? match[1] : "--";
}

function normalizeSetNumber(value) {
  return String(value || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

function findCatalogMatch(collectibles, setNumber, demoSeed = 0) {
  const legoItems = collectibles.filter((item) => item.brand === "LEGO");
  const pool = legoItems.length ? legoItems : collectibles;

  if (setNumber) {
    const hintId = DEMO_SET_HINTS[setNumber];
    if (hintId) {
      const hinted = pool.find((item) => item.id === hintId);
      if (hinted) {
        return hinted;
      }
    }
    const bySku = pool.find((item) => normalizeSetNumber(item.sku) === setNumber);
    if (bySku) {
      return bySku;
    }
    const byId = pool.find((item) => String(item.id || "").includes(setNumber));
    if (byId) {
      return byId;
    }
  }

  return pool[demoSeed % pool.length] || null;
}

function demoSeedFromFile(file) {
  if (!file?.name) {
    return 0;
  }
  return file.name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function buildEvaluation(item, form) {
  const purchasePrice = Number(form.purchasePrice) || Number(item.price) || 0;
  const quantity = Math.max(1, Number(form.quantity) || 1);
  const conditionRisk =
    form.condition === "used" ? 8 : form.condition === "open-box" ? 4 : 0;

  return enrichBrickAlphaCollectible({
    ...item,
    buyPrice: purchasePrice,
    price: item.price || purchasePrice,
    currentMarketValue: item.price || purchasePrice,
    quantityOwned: quantity,
    storeSource: form.store || item.venue || "Scan evaluation",
    riskScore: Math.min(100, (item.riskScore || 50) + conditionRisk),
    vatReclaim: form.vatReclaim,
    scanCondition: form.condition,
  });
}

function exportEvaluationJson(evaluation, form, imageName) {
  const payload = {
    exportedAt: new Date().toISOString(),
    mode: "demo",
    image: imageName || null,
    inputs: form,
    result: {
      setName: evaluation.name,
      setNumber: extractSetNumber(evaluation),
      theme: evaluation.legoTheme,
      retailPrice: evaluation.retailPrice,
      purchasePrice: evaluation.buyPrice,
      discountPercent: evaluation.discountPercentage,
      brickAlphaScore: evaluation.brickAlphaScore,
      investmentGrade: evaluation.investmentGrade,
      recommendation: evaluation.recommendation,
      retirementStatus: evaluation.retirementStatus,
      retirementProbability: evaluation.retirementProbability,
      minifigureScore: evaluation.minifigureQuality,
      riskScore: evaluation.riskScore,
      investmentThesis: evaluation.investmentThesis,
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `brick-alpha-evaluation-${extractSetNumber(evaluation)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function StepIndicator({ currentStep }) {
  const currentIndex = FLOW_STEPS.findIndex((step) => step.id === currentStep);

  return (
    <ol className="seStepper" aria-label="Evaluation flow">
      {FLOW_STEPS.map((step, index) => {
        const state =
          index < currentIndex ? "complete" : index === currentIndex ? "active" : "upcoming";
        return (
          <li key={step.id} className={`seStep seStep-${state}`}>
            <span className="seStepIndex">{index + 1}</span>
            <span className="seStepLabel">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ScanEvaluateWorkspace({
  collectibles = [],
  handleCollectibleSelect,
  jumpToPageSection,
  onAddToWatchlist,
  openCollectibleTicket,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [currentStep, setCurrentStep] = useState("upload");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageName, setImageName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [matchedItem, setMatchedItem] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [actionStatus, setActionStatus] = useState("");

  const [form, setForm] = useState({
    setNumber: "",
    purchasePrice: "",
    quantity: "1",
    condition: "sealed",
    vatReclaim: false,
    store: "",
  });

  const updateForm = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const runDemoScan = useCallback(
    async (file, setNumberOverride = "") => {
      setScanning(true);
      setScanMessage("Demo mode — matching against Brick Alpha catalog…");
      await new Promise((resolve) => window.setTimeout(resolve, 1400));

      const setNumber = normalizeSetNumber(setNumberOverride || form.setNumber);
      const match = findCatalogMatch(collectibles, setNumber, demoSeedFromFile(file));

      if (!match) {
        setScanMessage("No LEGO catalog match found. Enter a set number manually.");
        setScanning(false);
        setCurrentStep("identify");
        return;
      }

      setMatchedItem(match);
      updateForm("setNumber", extractSetNumber(match));
      if (!form.purchasePrice && match.price) {
        updateForm("purchasePrice", String(Math.round(match.price * 0.88)));
      }
      setScanMessage(
        `Demo recognition matched ${match.name} (${extractSetNumber(match)}) from catalog data.`,
      );
      setScanning(false);
      setCurrentStep("identify");
    },
    [collectibles, form.purchasePrice, form.setNumber, updateForm],
  );

  const handleFileSelect = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
        setImageName(file.name);
        setEvaluation(null);
        setActionStatus("");
        setCurrentStep("upload");
        runDemoScan(file);
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    },
    [runDemoScan],
  );

  const handleRunEvaluation = useCallback(() => {
    if (!matchedItem) {
      const setNumber = normalizeSetNumber(form.setNumber);
      const match = findCatalogMatch(collectibles, setNumber, 0);
      if (!match) {
        setActionStatus("Enter a valid set number or upload evidence to identify a set.");
        return;
      }
      setMatchedItem(match);
    }

    const item = matchedItem || findCatalogMatch(collectibles, normalizeSetNumber(form.setNumber), 0);
    const result = buildEvaluation(item, form);
    setEvaluation(result);
    setCurrentStep("evaluate");
    setActionStatus("Brick Alpha investment analysis complete.");
  }, [collectibles, form, matchedItem]);

  const handleIdentifySet = useCallback(() => {
    const setNumber = normalizeSetNumber(form.setNumber);
    const match = findCatalogMatch(collectibles, setNumber, 0);
    if (!match) {
      setActionStatus("Set number not found in demo catalog. Try 75252 or 10305.");
      return;
    }
    setMatchedItem(match);
    setActionStatus(`Identified ${match.name} from catalog.`);
    handleRunEvaluation();
  }, [collectibles, form.setNumber, handleRunEvaluation]);

  const handleAddToPortfolio = useCallback(() => {
    if (!evaluation) {
      return;
    }
    openCollectibleTicket(evaluation, "BUY");
    setCurrentStep("portfolio");
    setActionStatus("Portfolio ticket opened — confirm quantity and entry in the ticket.");
  }, [evaluation, openCollectibleTicket]);

  const handleAddToWatchlist = useCallback(() => {
    if (!evaluation) {
      return;
    }
    if (onAddToWatchlist) {
      onAddToWatchlist({
        ticker: extractSetNumber(evaluation),
        label: evaluation.name,
        desk: "collectible",
      });
      setActionStatus(`${evaluation.name} added to watchlist.`);
      return;
    }
    setActionStatus("Sign in to sync watchlist items.");
  }, [evaluation, onAddToWatchlist]);

  const handleOpenFullAnalysis = useCallback(() => {
    if (!evaluation) {
      return;
    }
    handleCollectibleSelect(evaluation);
    jumpToPageSection("collectibles", "investment-analysis");
  }, [evaluation, handleCollectibleSelect, jumpToPageSection]);

  const handleExport = useCallback(() => {
    if (!evaluation) {
      return;
    }
    exportEvaluationJson(evaluation, form, imageName);
    setActionStatus("Evaluation exported as JSON.");
  }, [evaluation, form, imageName]);

  const thesis = evaluation?.investmentThesis;
  const discountDisplay = evaluation
    ? `${evaluation.discountPercentage >= 0 ? "" : "+"}${Math.abs(evaluation.discountPercentage).toFixed(1)}%`
    : "--";

  const legoCatalogCount = useMemo(
    () => collectibles.filter((item) => item.brand === "LEGO").length,
    [collectibles],
  );

  return (
    <section className="seWorkspace" id="scan-evaluate">
      <div className="seDemoBanner" role="status">
        <span className="seDemoBadge">Demo mode</span>
        <p>
          Image recognition uses demo catalog matching — no live OCR yet. Upload any photo and Brick
          Alpha will match against {legoCatalogCount} LEGO sets in the catalog.
        </p>
      </div>

      <StepIndicator currentStep={currentStep} />

      {actionStatus ? <div className="statusBanner subtleBanner">{actionStatus}</div> : null}

      {(currentStep === "upload" || !imagePreview) && (
        <article className="seGlassCard seUploadPanel">
          <div className="seSectionHeader">
            <span className="executiveDashboardEyebrow">Step 1</span>
            <h2>Upload or capture evidence</h2>
            <p>Photo of a LEGO set, box, barcode, or receipt — we will identify the set in demo mode.</p>
          </div>

          <div
            className={`seUploadZone${imagePreview ? " seUploadZone-hasImage" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Uploaded evidence" className="seUploadPreview" />
            ) : (
              <div className="seUploadPlaceholder">
                <span className="seUploadIcon">📷</span>
                <strong>Drop a photo here or click to browse</strong>
                <small>PNG, JPG, or HEIC · box, barcode, or receipt</small>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="seHiddenInput"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="seHiddenInput"
            onChange={handleFileSelect}
          />

          <div className="seUploadActions">
            <button type="button" className="primaryButton" onClick={() => fileInputRef.current?.click()}>
              Upload Photo
            </button>
            <button type="button" className="ghostButton" onClick={() => cameraInputRef.current?.click()}>
              Take Photo
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => {
                setCurrentStep("identify");
                setScanMessage("Skipped image — enter set number manually.");
              }}
            >
              Skip to set number
            </button>
          </div>

          {scanning ? <p className="seScanStatus seScanStatus-busy">{scanMessage}</p> : null}
          {!scanning && scanMessage ? <p className="seScanStatus">{scanMessage}</p> : null}
        </article>
      )}

      {(currentStep === "identify" || currentStep === "evaluate" || currentStep === "portfolio") && (
        <div className="seTwoColumn">
          <article className="seGlassCard">
            <div className="seSectionHeader">
              <span className="executiveDashboardEyebrow">Step 2</span>
              <h2>Identify set &amp; purchase details</h2>
              <p>Confirm the matched set and optional purchase metadata.</p>
            </div>

            {imagePreview ? (
              <div className="seEvidenceThumb">
                <img src={imagePreview} alt="Evidence thumbnail" />
                <span>{imageName || "Uploaded evidence"}</span>
              </div>
            ) : null}

            {matchedItem ? (
              <div className="seMatchBanner">
                <span>Catalog match</span>
                <strong>{matchedItem.name}</strong>
                <small>Set {extractSetNumber(matchedItem)} · {matchedItem.category}</small>
              </div>
            ) : null}

            <div className="seFormGrid">
              <label className="seField">
                <span>Set number</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 75252"
                  value={form.setNumber}
                  onChange={(event) => updateForm("setNumber", event.target.value)}
                />
              </label>
              <label className="seField">
                <span>Purchase price (ZAR)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={form.purchasePrice}
                  onChange={(event) => updateForm("purchasePrice", event.target.value)}
                />
              </label>
              <label className="seField">
                <span>Quantity</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={(event) => updateForm("quantity", event.target.value)}
                />
              </label>
              <label className="seField">
                <span>Condition</span>
                <select
                  value={form.condition}
                  onChange={(event) => updateForm("condition", event.target.value)}
                >
                  {CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="seField">
                <span>Store / source</span>
                <input
                  type="text"
                  placeholder="e.g. LEGO.com, Takealot"
                  value={form.store}
                  onChange={(event) => updateForm("store", event.target.value)}
                />
              </label>
              <label className="seField seField-checkbox">
                <input
                  type="checkbox"
                  checked={form.vatReclaim}
                  onChange={(event) => updateForm("vatReclaim", event.target.checked)}
                />
                <span>VAT reclaim eligible (tourism / B2B)</span>
              </label>
            </div>

            <div className="seFormActions">
              <button type="button" className="primaryButton" onClick={handleIdentifySet}>
                Run Brick Alpha Evaluation
              </button>
              <button
                type="button"
                className="ghostButton"
                onClick={() => runDemoScan({ name: imageName }, form.setNumber)}
                disabled={scanning}
              >
                Re-scan evidence
              </button>
            </div>
          </article>

          {evaluation ? (
            <article className="seGlassCard seResultsCard">
              <div className="seSectionHeader">
                <span className="executiveDashboardEyebrow">Step 3</span>
                <h2>Investment evaluation</h2>
                <p>Brick Alpha score powered by the same model as Investment Analysis.</p>
              </div>

              <header className="seResultHero">
                <div>
                  <h3>{evaluation.name}</h3>
                  <div className="seResultMeta">
                    <span>Set {extractSetNumber(evaluation)}</span>
                    <span>{evaluation.legoTheme}</span>
                    <span className={`iaStatusBadge iaStatusBadge-${evaluation.retirementStatus === "Retired" ? "retired" : evaluation.retirementStatus === "Imminent" || evaluation.retirementStatus === "Overdue" ? "retiring-soon" : "available"}`}>
                      {evaluation.retirementStatus}
                    </span>
                  </div>
                  <AlphaSignalBadges signals={evaluation.alphaSignals || []} />
                </div>
                <div className="seScoreOrb">
                  <strong>{evaluation.brickAlphaScore}</strong>
                  <small>Brick Alpha Score</small>
                </div>
              </header>

              <div className="seMetricsGrid">
                <div className="seMetric">
                  <span>Retail price</span>
                  <strong>{formatCollectiblePrice(evaluation.retailPrice)}</strong>
                </div>
                <div className="seMetric">
                  <span>Purchase price</span>
                  <strong>{formatCollectiblePrice(evaluation.buyPrice)}</strong>
                </div>
                <div className="seMetric">
                  <span>Discount</span>
                  <strong className={evaluation.discountPercentage >= 8 ? "seMetric-positive" : ""}>
                    {discountDisplay}
                  </strong>
                </div>
                <div className="seMetric">
                  <span>Investment grade</span>
                  <strong>{evaluation.investmentGrade}</strong>
                </div>
                <div className="seMetric">
                  <span>Recommendation</span>
                  <strong className={`seRecommendation seRecommendation-${recommendationTone(evaluation.recommendation)}`}>
                    {displayRecommendation(evaluation.recommendation)}
                  </strong>
                </div>
                <div className="seMetric">
                  <span>Retirement status</span>
                  <strong>{evaluation.retirementStatus}</strong>
                </div>
                <div className="seMetric">
                  <span>Retirement probability</span>
                  <strong>{Math.round(evaluation.retirementProbability)}%</strong>
                </div>
                <div className="seMetric">
                  <span>Minifigure score</span>
                  <strong>{formatScore(evaluation.minifigureQuality)}</strong>
                </div>
                <div className="seMetric">
                  <span>Risk score</span>
                  <strong>{formatScore(evaluation.riskScore)}</strong>
                </div>
              </div>

              {thesis ? (
                <div className="seThesisBlock">
                  <span>Investment thesis</span>
                  <p>{thesis.attractive}</p>
                  <ul>
                    {thesis.upsideDrivers.slice(0, 3).map((driver) => (
                      <li key={driver}>{driver}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="seSectionHeader">
                <span className="executiveDashboardEyebrow">Step 4</span>
                <h2>Next actions</h2>
              </div>

              <div className="seActionRow">
                <button type="button" className="primaryButton" onClick={handleAddToPortfolio}>
                  Add to Portfolio
                </button>
                <button type="button" className="ghostButton" onClick={handleAddToWatchlist}>
                  Add to Watchlist
                </button>
                <button type="button" className="ghostButton" onClick={handleOpenFullAnalysis}>
                  Open Full Investment Analysis
                </button>
                <button type="button" className="ghostButton" onClick={handleExport}>
                  Export Evaluation
                </button>
              </div>
            </article>
          ) : (
            <article className="seGlassCard seResultsPlaceholder">
              <div className="seSectionHeader">
                <span className="executiveDashboardEyebrow">Step 3</span>
                <h2>Evaluation results</h2>
              </div>
              <p>Confirm set details and run the evaluation to see Brick Alpha investment analysis.</p>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
