import { jsPDF } from "jspdf";
import type { CompanyDetail, PostingGuide, FutureStepItem } from "./api";

const FONT_SIZE = 11;
const HEADING_SIZE = 14;
const TITLE_SIZE = 18;
const MARGIN = 20;
const LINE_HEIGHT = 6;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = LINE_HEIGHT
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(HEADING_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text(title, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZE);
  return y + LINE_HEIGHT * 1.5;
}

export function exportCompanyReportPdf(
  detail: CompanyDetail,
  postingGuide: PostingGuide | null,
  futureSteps: FutureStepItem[]
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const company = detail.company;
  doc.setFontSize(TITLE_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text(`${company.name} — Analysis Report`, MARGIN, y);
  y += LINE_HEIGHT * 1.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZE);
  doc.text(`Market: ${company.market || "N/A"}  |  Location: ${company.location || "N/A"}  |  Generated: ${new Date().toLocaleDateString()}`, MARGIN, y);
  y += LINE_HEIGHT * 2;

  // Company overview
  y = addSectionTitle(doc, "1. Company overview", y);
  y = addWrappedText(doc, `${company.name} operates in ${company.market || "N/A"}. Competitors analyzed: ${detail.competitors.length}.`, MARGIN, y, CONTENT_WIDTH) + LINE_HEIGHT;

  // Rankings
  if (detail.rankings.length > 0) {
    y = addSectionTitle(doc, "2. Competitor rankings", y);
    const tableStart = y;
    doc.setFont("helvetica", "bold");
    doc.text("Rank", MARGIN, y);
    doc.text("Competitor", MARGIN + 15, y);
    doc.text("Avg rating", PAGE_WIDTH - MARGIN - 25, y);
    doc.setFont("helvetica", "normal");
    y += LINE_HEIGHT;
    for (const r of detail.rankings.slice(0, 15)) {
      if (y > PAGE_HEIGHT - 25) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(String(r.rank), MARGIN, y);
      doc.text((r.name || r.url || "").slice(0, 35), MARGIN + 15, y);
      doc.text(String(r.average_rating?.toFixed(1) ?? "—"), PAGE_WIDTH - MARGIN - 25, y);
      y += LINE_HEIGHT;
    }
    y += LINE_HEIGHT;
  }

  // Aggregated feedback
  if (detail.aggregated_feedback.length > 0) {
    if (y > PAGE_HEIGHT - 50) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, "3. Site feedback (pros & cons)", y);
    for (const f of detail.aggregated_feedback.slice(0, 8)) {
      if (y > PAGE_HEIGHT - 30) {
        doc.addPage();
        y = MARGIN;
      }
      const name = f.competitor_name || f.url || "Competitor";
      doc.setFont("helvetica", "bold");
      y = addWrappedText(doc, name.slice(0, 60), MARGIN, y, CONTENT_WIDTH) + 1;
      doc.setFont("helvetica", "normal");
      const pros = (f.pros || []).slice(0, 3).join("; ");
      const cons = (f.cons || []).slice(0, 3).join("; ");
      if (pros) y = addWrappedText(doc, `Pros: ${pros}`, MARGIN + 3, y, CONTENT_WIDTH - 3) + 1;
      if (cons) y = addWrappedText(doc, `Cons: ${cons}`, MARGIN + 3, y, CONTENT_WIDTH - 3) + 1;
      y += LINE_HEIGHT;
    }
    y += LINE_HEIGHT;
  }

  // Reviews summary
  if (detail.review_items.length > 0) {
    if (y > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, "4. Reviews summary", y);
    const bySource: Record<string, number> = {};
    for (const r of detail.review_items) {
      const s = r.source || "other";
      bySource[s] = (bySource[s] || 0) + 1;
    }
    y = addWrappedText(doc, `Total review items: ${detail.review_items.length}. By source: ${Object.entries(bySource).map(([k, v]) => `${k} (${v})`).join(", ")}.`, MARGIN, y, CONTENT_WIDTH) + LINE_HEIGHT;
  }

  // Social summary
  if (detail.social_items.length > 0) {
    if (y > PAGE_HEIGHT - 25) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, "5. Social media", y);
    y = addWrappedText(doc, `${detail.social_items.length} posts from X, Instagram, Facebook.`, MARGIN, y, CONTENT_WIDTH) + LINE_HEIGHT;
  }

  // Posting guide
  if (postingGuide && postingGuide.total_posts_analyzed > 0) {
    if (y > PAGE_HEIGHT - 60) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, "6. Posting guide (your market)", y);
    y = addWrappedText(doc, `Based on ${postingGuide.total_posts_analyzed} analyzed posts. Average score: ${postingGuide.average_score.toFixed(1)}/10.`, MARGIN, y, CONTENT_WIDTH) + 2;
    if (postingGuide.best_times) y = addWrappedText(doc, `Best times: ${postingGuide.best_times}`, MARGIN, y, CONTENT_WIDTH) + 1;
    if (postingGuide.best_post_types?.length) y = addWrappedText(doc, `Best post types: ${postingGuide.best_post_types.join(", ")}`, MARGIN, y, CONTENT_WIDTH) + 1;
    if (postingGuide.rubric_tips?.length) {
      doc.text("Tips:", MARGIN, y);
      y += LINE_HEIGHT;
      for (const tip of postingGuide.rubric_tips.slice(0, 5)) {
        y = addWrappedText(doc, `• ${tip}`, MARGIN + 3, y, CONTENT_WIDTH - 3) + 1;
      }
    }
    y += LINE_HEIGHT;
  }

  // Future steps
  if (futureSteps.length > 0) {
    if (y > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, "7. Future steps (recommendations)", y);
    for (let i = 0; i < futureSteps.length; i++) {
      if (y > PAGE_HEIGHT - 35) {
        doc.addPage();
        y = MARGIN;
      }
      const step = futureSteps[i];
      doc.setFont("helvetica", "bold");
      y = addWrappedText(doc, `Step ${i + 1}: ${step.title}`, MARGIN, y, CONTENT_WIDTH) + 1;
      doc.setFont("helvetica", "normal");
      y = addWrappedText(doc, step.description, MARGIN, y, CONTENT_WIDTH) + 1;
      if (step.evidence?.length) {
        doc.setFontSize(10);
        for (const ev of step.evidence.slice(0, 3)) {
          y = addWrappedText(doc, `Evidence: ${ev}`, MARGIN + 3, y, CONTENT_WIDTH - 3, 5) + 1;
        }
        doc.setFontSize(FONT_SIZE);
      }
      y += LINE_HEIGHT;
    }
  }

  doc.save(`${company.name.replace(/[^a-z0-9-_]/gi, "_")}_report.pdf`);
}
