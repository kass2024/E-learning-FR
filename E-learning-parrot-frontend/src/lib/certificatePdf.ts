import type { jsPDF } from "jspdf";
import { logoUrl, LOGO } from "./brandLogo";

export type CertificatePdfInput = {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  verifyUrl: string;
  issuer?: string;
};

const NAVY = [56, 118, 29] as const;
const NAVY_DARK = [42, 95, 23] as const;
const GOLD = [224, 28, 33] as const;
const SLATE = [71, 85, 105] as const;
const EMERALD = [22, 101, 52] as const;

const FRAME_OUTER = 8;
const FRAME_INNER = 13;
const FOOTER_HEIGHT = 42;

function formatIssueDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

async function loadLogoDataUrl(): Promise<{ dataUrl: string; width: number; height: number }> {
  const logoPath = logoUrl(`${window.location.origin}${LOGO.src}`);
  const response = await fetch(logoPath);
  if (!response.ok) throw new Error("Logo not found");
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });

  return { dataUrl, ...dimensions };
}

function drawCornerAccent(doc: jsPDF, x: number, y: number, flipX: boolean, flipY: boolean) {
  const len = 14;
  const dx = flipX ? -1 : 1;
  const dy = flipY ? -1 : 1;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + dx * len, y);
  doc.line(x, y, x, y + dy * len);
}

function fitCenteredText(
  doc: jsPDF,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  startSize: number,
  minSize: number,
  lineHeight: number
): number {
  let size = startSize;
  let lines: string[] = [text];

  while (size >= minSize) {
    doc.setFontSize(size);
    lines = doc.splitTextToSize(text, maxWidth);
    const blockHeight = lines.length * lineHeight;
    if (lines.length <= 2 || size === minSize) {
      doc.text(lines, centerX, startY, { align: "center" });
      return startY + blockHeight;
    }
    size -= 0.5;
  }

  doc.text(lines, centerX, startY, { align: "center" });
  return startY + lines.length * lineHeight;
}

function addLogo(
  doc: jsPDF,
  dataUrl: string,
  imgW: number,
  imgH: number,
  centerX: number,
  centerY: number,
  maxHeight: number,
  maxWidth: number
) {
  const ratio = imgW / imgH;
  let height = maxHeight;
  let width = height * ratio;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / ratio;
  }
  doc.addImage(dataUrl, "PNG", centerX - width / 2, centerY - height / 2, width, height);
}

/**
 * Generates a landscape A4 certificate PDF with QR verification.
 */
export async function downloadCertificatePdf(input: CertificatePdfInput): Promise<void> {
  const [{ default: jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const issuer = input.issuer ?? "F&R Rwanda Ltd";

  const contentLeft = FRAME_INNER + 4;
  const contentRight = w - FRAME_INNER - 4;
  const contentWidth = contentRight - contentLeft;
  const contentBottom = h - FRAME_INNER - 4;
  const footerTop = contentBottom - FOOTER_HEIGHT;
  const bodyBottom = footerTop - 6;

  const logo = await loadLogoDataUrl();

  // Background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, w, h, "F");

  // Borders
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.1);
  doc.rect(FRAME_OUTER, FRAME_OUTER, w - FRAME_OUTER * 2, h - FRAME_OUTER * 2);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.35);
  doc.rect(FRAME_INNER, FRAME_INNER, w - FRAME_INNER * 2, h - FRAME_INNER * 2);

  drawCornerAccent(doc, FRAME_INNER + 2, FRAME_INNER + 2, false, false);
  drawCornerAccent(doc, w - FRAME_INNER - 2, FRAME_INNER + 2, true, false);
  drawCornerAccent(doc, FRAME_INNER + 2, h - FRAME_INNER - 2, false, true);
  drawCornerAccent(doc, w - FRAME_INNER - 2, h - FRAME_INNER - 2, true, true);

  // Header — centered Xander logo + title
  const headerBottom = FRAME_INNER + 28;
  doc.setFillColor(...NAVY);
  doc.rect(FRAME_INNER, FRAME_INNER, w - FRAME_INNER * 2, 28, "F");
  doc.setFillColor(...NAVY_DARK);
  doc.rect(FRAME_INNER, headerBottom - 3, w - FRAME_INNER * 2, 3, "F");

  addLogo(doc, logo.dataUrl, logo.width, logo.height, FRAME_INNER + 15, FRAME_INNER + 14, 18, 22);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(issuer, FRAME_INNER + 30, FRAME_INNER + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text("Study. Learn. Succeed Globally.", FRAME_INNER + 30, FRAME_INNER + 19);

  // Body band
  doc.setFillColor(241, 245, 249);
  doc.rect(contentLeft, headerBottom + 8, contentWidth, bodyBottom - headerBottom - 8, "F");

  let y = headerBottom + 18;
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CERTIFICATE OF COMPLETION", w / 2, y, { align: "center" });

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE);
  doc.text("This is to certify that", w / 2, y, { align: "center" });

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  y = fitCenteredText(
    doc,
    input.studentName.toUpperCase(),
    w / 2,
    y,
    contentWidth - 20,
    22,
    14,
    8
  );

  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE);
  doc.text("has successfully completed all requirements for", w / 2, y, { align: "center" });

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY_DARK);
  y = fitCenteredText(doc, input.courseTitle, w / 2, y, contentWidth - 24, 14, 10, 6);

  // Center logo seal (kept inside body, above footer)
  const sealY = Math.min(y + 8, footerTop - 14);
  addLogo(doc, logo.dataUrl, logo.width, logo.height, w / 2, sealY, 12, 12);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(w / 2 - 42, sealY, w / 2 - 16, sealY);
  doc.line(w / 2 + 16, sealY, w / 2 + 42, sealY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...EMERALD);
  doc.text("DIGITALLY VERIFIED", w / 2, sealY + 10, { align: "center" });

  // Footer panel — all meta + QR stay inside bordered area
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(contentLeft, footerTop, contentWidth, FOOTER_HEIGHT - 2, 2, 2, "FD");

  const qrSize = 26;
  const qrPad = 6;
  const qrBoxW = qrSize + qrPad * 2;
  const qrBoxH = qrSize + 16;
  const qrBoxX = contentRight - qrBoxW;
  const qrBoxY = footerTop + (FOOTER_HEIGHT - qrBoxH) / 2 - 1;

  const metaRight = qrBoxX - 8;
  const metaLeft = contentLeft + 6;
  const metaMaxW = metaRight - metaLeft;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);

  let metaY = footerTop + 9;
  const metaLines = [
    `Certificate ID: ${input.certificateId}`,
    `Date of issue: ${formatIssueDate(input.issuedAt)}`,
    "Platform: F&R Rwanda",
  ];

  metaLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, metaMaxW);
    doc.text(wrapped, metaLeft, metaY);
    metaY += wrapped.length * 4.2 + 1;
  });

  doc.setDrawColor(...SLATE);
  doc.setLineWidth(0.2);
  const sigLineY = footerTop + FOOTER_HEIGHT - 12;
  doc.line(metaLeft, sigLineY, metaLeft + 48, sigLineY);
  doc.setFontSize(7);
  doc.text("Authorized by F&R Rwanda Ltd", metaLeft, sigLineY + 4);

  const qrDataUrl = await QRCode.toDataURL(input.verifyUrl, {
    width: 280,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 2, 2, "F");
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.25);
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 2, 2, "S");

  doc.addImage(qrDataUrl, "PNG", qrBoxX + qrPad, qrBoxY + 3, qrSize, qrSize);
  doc.setFontSize(6.5);
  doc.setTextColor(...NAVY);
  doc.text("Scan to verify", qrBoxX + qrBoxW / 2, qrBoxY + qrSize + 7, { align: "center" });

  const verifyLabel = input.verifyUrl.replace(/^https?:\/\//, "");
  doc.setFontSize(5.5);
  doc.setTextColor(...SLATE);
  const verifyLines = doc.splitTextToSize(verifyLabel, qrBoxW - 4);
  doc.text(verifyLines, qrBoxX + qrBoxW / 2, qrBoxY + qrSize + 11, { align: "center" });

  const safeName = input.certificateId.replace(/[^a-zA-Z0-9-]/g, "");
  doc.save(`Xander-Certificate-${safeName}.pdf`);
}

export function buildVerifyPath(courseId: number, studentId: number): string {
  return `/verify/certificate/${courseId}/${studentId}`;
}

export function buildVerifyUrl(courseId: number, studentId: number): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${buildVerifyPath(courseId, studentId)}`;
  }
  return buildVerifyPath(courseId, studentId);
}
