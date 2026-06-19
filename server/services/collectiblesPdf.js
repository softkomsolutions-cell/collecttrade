const PDFDocument = require("pdfkit");

const COLORS = {
  ink: "#171810",
  muted: "#66685f",
  brass: "#9b7437",
  line: "#ded8ca",
  paper: "#fbfaf6",
  positive: "#2d6b4f",
};

function formatZar(value) {
  const numeric = Number(value || 0);
  return `R${numeric.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function formatDate(value = new Date()) {
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function filenamePart(value) {
  return String(value || "report")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function createDocument(res, filename) {
  const doc = new PDFDocument({ margin: 42, size: "A4", bufferPages: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.paper);
  return doc;
}

function drawHeader(doc, eyebrow, title, detail) {
  doc
    .fillColor(COLORS.brass)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(eyebrow.toUpperCase(), { characterSpacing: 1.4 });
  doc.moveDown(0.45);
  doc.fillColor(COLORS.ink).font("Times-Bold").fontSize(24).text(title);
  doc.moveDown(0.25);
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text(detail);
  doc.moveDown(0.8);
  doc.strokeColor(COLORS.line).moveTo(42, doc.y).lineTo(553, doc.y).stroke();
  doc.moveDown(0.8);
}

function drawMetricRow(doc, metrics) {
  const width = 511 / metrics.length;
  const top = doc.y;
  metrics.forEach((metric, index) => {
    const x = 42 + index * width;
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(metric.label.toUpperCase(), x, top, { width: width - 10 });
    doc
      .fillColor(metric.tone === "positive" ? COLORS.positive : COLORS.ink)
      .font("Times-Bold")
      .fontSize(15)
      .text(String(metric.value), x, top + 13, { width: width - 10 });
  });
  doc.y = top + 42;
  doc.strokeColor(COLORS.line).moveTo(42, doc.y).lineTo(553, doc.y).stroke();
  doc.moveDown(0.75);
}

function drawSectionTitle(doc, title) {
  doc.fillColor(COLORS.brass).font("Helvetica-Bold").fontSize(9).text(title.toUpperCase());
  doc.moveDown(0.45);
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc
      .strokeColor(COLORS.line)
      .moveTo(42, 792)
      .lineTo(553, 792)
      .stroke();
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(7)
      .text("BUILD ALPHA | Private LEGO collection intelligence", 42, 802)
      .text(`Page ${index + 1} of ${range.count}`, 490, 802, { align: "right", width: 63 });
  }
}

function streamValuationPdf(res, valuation) {
  const identifier = valuation.setNum || valuation.identifier || "lego";
  const doc = createDocument(res, `build-alpha-lego-valuation-${filenamePart(identifier)}.pdf`);
  drawHeader(
    doc,
    "LEGO investment valuation",
    valuation.name || `LEGO ${identifier}`,
    `Set ${identifier} | Generated ${formatDate()} | Investment score ${valuation.score}/10`,
  );
  drawMetricRow(doc, [
    { label: "Purchase price", value: formatZar(valuation.purchasePriceZAR) },
    { label: "Current estimate", value: formatZar(valuation.currentValueZAR) },
    { label: "Current gain", value: formatZar(valuation.profitZAR), tone: "positive" },
    { label: "Cost multiple", value: `${valuation.multiplier}x`, tone: "positive" },
  ]);
  drawMetricRow(doc, [
    { label: "Risk", value: valuation.riskRating || "Review" },
    { label: "Confidence", value: valuation.confidenceLabel || valuation.confidence || "Review" },
    { label: "Gain ratio", value: `${valuation.roiPercent || 0}%`, tone: "positive" },
    { label: "Discount to market", value: `${valuation.discountPercent || 0}%`, tone: "positive" },
  ]);

  drawSectionTitle(doc, "Investment view");
  doc
    .fillColor(COLORS.ink)
    .font("Times-Bold")
    .fontSize(18)
    .text(valuation.investmentGrade || valuation.recommendation || "Review");
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(9)
    .text(valuation.investmentGradeDetail || "Review the supporting evidence before making a purchase decision.");
  doc.moveDown(0.9);

  drawSectionTitle(doc, "Investor snapshot");
  doc
    .fillColor(COLORS.ink)
    .font("Helvetica")
    .fontSize(9)
    .text(`Purchase date: ${valuation.purchaseDate || "Not supplied"}`)
    .text(`Risk: ${valuation.riskRating || "Review"}`)
    .text(`Confidence: ${valuation.confidenceLabel || valuation.confidence || "Review"}`);
  if (valuation.certificationNotes) {
    doc.text(`Certification / evidence: ${valuation.certificationNotes}`);
  }
  doc.moveDown(0.7);

  drawSectionTitle(doc, "Future value scenarios");
  drawMetricRow(doc, [
    { label: "1 year", value: formatZar(valuation.projections?.oneYear) },
    { label: "5 years", value: formatZar(valuation.projections?.fiveYears) },
    { label: "10 years", value: formatZar(valuation.projections?.tenYears) },
  ]);

  drawSectionTitle(doc, "Investment notes");
  (valuation.notes || []).forEach((note) => {
    doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9).text(`- ${note}`, { paragraphGap: 3 });
  });
  doc.moveDown(0.6);

  if (valuation.minifigures?.length) {
    drawSectionTitle(doc, "Minifigure estimates");
    valuation.minifigures.forEach((item) => {
      doc
        .fillColor(COLORS.ink)
        .font("Helvetica")
        .fontSize(9)
        .text(`${item.name}${item.exclusive ? " | Exclusive" : ""}`, { continued: true })
        .fillColor(COLORS.brass)
        .font("Helvetica-Bold")
        .text(`  ${formatZar(item.estimatedValueZAR)}`);
    });
    doc.moveDown(0.6);
  }

  drawSectionTitle(doc, "Pricing sources");
  (valuation.sources || []).forEach((source) => {
    doc
      .fillColor(COLORS.ink)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(source.label, { continued: true })
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .text(` | ${source.status}`);
  });
  doc.moveDown(0.8);
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica-Oblique")
    .fontSize(8)
    .text(
      `Projection scenario: ${valuation.projections?.annualGrowthPercent || 0}% annual growth. Estimates are not guaranteed returns.`,
    );
  drawFooter(doc);
  doc.end();
}

function streamInventoryPdf(res, { items, summary, ownerName }) {
  const doc = createDocument(res, `build-alpha-lego-inventory-${filenamePart(formatDate())}.pdf`);
  drawHeader(
    doc,
    "Private LEGO inventory register",
    "Owned LEGO Collection",
    `${ownerName || "Collection owner"} | Generated ${formatDate()} | ${summary.itemCount || 0} items`,
  );
  drawMetricRow(doc, [
    { label: "Items", value: summary.itemCount || 0 },
    { label: "Cost basis", value: formatZar(summary.purchaseValueZAR) },
    { label: "Current estimate", value: formatZar(summary.currentValueZAR) },
    { label: "Unrealized gain", value: formatZar(summary.unrealizedPnlZAR), tone: "positive" },
  ]);
  drawMetricRow(doc, [
    { label: "1 year scenario", value: formatZar(summary.projectedOneYearZAR) },
    { label: "5 year scenario", value: formatZar(summary.projectedFiveYearsZAR) },
    { label: "10 year scenario", value: formatZar(summary.projectedTenYearsZAR) },
  ]);

  drawSectionTitle(doc, "Inventory positions");
  const columns = [
    ["Set", 42, 58],
    ["Item", 100, 180],
    ["Qty", 284, 30],
    ["Cost", 318, 70],
    ["Estimate", 392, 72],
    ["Score", 470, 42],
  ];
  columns.forEach(([label, x, width]) => {
    doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(7).text(label.toUpperCase(), x, doc.y, { width });
  });
  doc.moveDown(0.8);
  doc.strokeColor(COLORS.line).moveTo(42, doc.y).lineTo(553, doc.y).stroke();
  doc.moveDown(0.45);

  items.forEach((item) => {
    if (doc.y > 755) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.paper);
      doc.y = 42;
    }
    const rowY = doc.y;
    const quantity = Number(item.quantity || 1);
    const values = [
      [item.identifier, 42, 58],
      [item.name, 100, 180],
      [quantity, 284, 30],
      [formatZar(item.purchasePriceZAR * quantity), 318, 70],
      [formatZar(item.currentValueZAR * quantity), 392, 72],
      [`${item.score}/10`, 470, 42],
    ];
    values.forEach(([value, x, width]) => {
      doc.fillColor(COLORS.ink).font("Helvetica").fontSize(8).text(String(value || "--"), x, rowY, { width });
    });
    doc.y = Math.max(rowY + 19, doc.y);
    doc.strokeColor(COLORS.line).moveTo(42, doc.y).lineTo(553, doc.y).stroke();
    doc.moveDown(0.35);
  });

  doc.moveDown(0.5);
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica-Oblique")
    .fontSize(8)
    .text("Collection estimates are evidence-led scenarios for review, resale planning, and documentation.");
  drawFooter(doc);
  doc.end();
}

module.exports = {
  streamInventoryPdf,
  streamValuationPdf,
};
