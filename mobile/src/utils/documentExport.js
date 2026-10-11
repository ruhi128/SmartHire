import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const resumeThemes = {
  classic: { accent: '#1E3A5F', soft: '#EEF4FA', name: 'Classic' },
  modern: { accent: '#4F46E5', soft: '#EEF2FF', name: 'Modern' },
  minimal: { accent: '#334155', soft: '#F1F5F9', name: 'Minimal' },
  bold: { accent: '#0F766E', soft: '#ECFDF5', name: 'Bold' },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function linesHtml(value) {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return '';
  return lines.map((line) => {
    const isBullet = /^[•*\-]\s*/.test(line);
    const text = escapeHtml(line.replace(/^[•*\-]\s*/, ''));
    return `<div class="${isBullet ? 'bullet' : 'entry'}">${isBullet ? '<span class="dot">•</span>' : ''}${text}</div>`;
  }).join('');
}

function section(title, content) {
  if (!content) return '';
  return `<section><h2>${escapeHtml(title)}</h2>${content}</section>`;
}

function toCommaList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function contactLine(data) {
  return [data.email, data.phone, data.location, data.linkedin, data.github]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join('<span class="separator">•</span>');
}

function educationHtml(data) {
  const college = String(data.college || '').trim();
  const degree = [data.degree, data.branch].filter(Boolean).map(String).map((item) => item.trim()).filter(Boolean).join(' · ');
  const detail = [data.cgpa ? `CGPA: ${data.cgpa}` : '', data.gradYear ? `Graduating ${data.gradYear}` : ''].filter(Boolean).map(escapeHtml).join(' · ');
  if (!college && !degree && !detail) return '';
  return `<div class="education"><div class="education-top"><strong>${escapeHtml(college || degree || 'Education')}</strong>${data.gradYear ? `<span>${escapeHtml(data.gradYear)}</span>` : ''}</div>${degree && college ? `<div class="subline">${escapeHtml(degree)}</div>` : ''}${detail ? `<div class="subline">${detail}</div>` : ''}</div>`;
}

export function buildResumeHtml(data = {}, templateId = 'classic') {
  const theme = resumeThemes[templateId] || resumeThemes.classic;
  const skills = toCommaList(data.skills);
  const contact = contactLine(data);
  const summary = String(data.summary || '').trim();
  const experience = linesHtml(data.experience);
  const projects = linesHtml(data.projects);
  const certifications = linesHtml(data.certifications);
  const achievements = linesHtml(data.achievements);
  const education = educationHtml(data);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 10.2pt; line-height: 1.42; }
  .page { min-height: 297mm; padding: 0 16mm 15mm; }
  .header { margin: 0 -16mm 13mm; padding: 14mm 16mm 11mm; background: ${theme.accent}; color: #fff; }
  .name { margin: 0; font-size: 25pt; line-height: 1.1; letter-spacing: .2px; }
  .contact { color: #E6EFF9; font-size: 8.6pt; margin-top: 4.5mm; overflow-wrap: anywhere; }
  .separator { padding: 0 5px; color: rgba(255,255,255,.58); }
  section { margin-top: 7.2mm; page-break-inside: avoid; }
  h2 { color: ${theme.accent}; border-bottom: 1.4px solid ${theme.accent}; font-size: 10.2pt; letter-spacing: .9px; margin: 0 0 3.4mm; padding-bottom: 1.4mm; text-transform: uppercase; }
  .summary { color: #334155; }
  .education { margin-bottom: 1mm; }
  .education-top { display: flex; justify-content: space-between; gap: 12px; color: #172033; }
  .education-top span { color: #64748B; white-space: nowrap; font-size: 9.2pt; }
  .subline { color: #475569; margin-top: 1px; }
  .skills { display: flex; flex-wrap: wrap; gap: 5px; }
  .skill { background: ${theme.soft}; border: 1px solid ${theme.accent}33; border-radius: 99px; color: ${theme.accent}; font-size: 8.8pt; padding: 3px 7px; }
  .entry { color: #172033; font-weight: 700; margin: 2.4mm 0 1.3mm; white-space: pre-wrap; }
  .bullet { color: #334155; display: flex; gap: 6px; margin: 1.1mm 0; }
  .dot { color: ${theme.accent}; font-weight: bold; }
  .template-minimal .header { background: #fff; color: #172033; border-bottom: 4px solid ${theme.accent}; padding-bottom: 8mm; }
  .template-minimal .contact { color: #64748B; }
  .template-minimal .separator { color: #94A3B8; }
  .template-modern .page { border-left: 8mm solid ${theme.accent}; padding-left: 13mm; }
  .template-modern .header { margin-left: -13mm; padding-left: 13mm; }
  .template-bold .header { padding-top: 17mm; padding-bottom: 14mm; }
  .template-bold h2 { background: ${theme.accent}; color: #fff; border: 0; padding: 2mm 3mm; }
</style></head><body>
  <main class="template-${escapeHtml(templateId)}"><div class="page">
    <header class="header">
      <h1 class="name">${escapeHtml(data.name || 'Your Name')}</h1>
      ${contact ? `<div class="contact">${contact}</div>` : ''}
    </header>
    ${section('Professional summary', summary ? `<div class="summary">${escapeHtml(summary)}</div>` : '')}
    ${section('Education', education)}
    ${section('Skills', skills.length ? `<div class="skills">${skills.map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`).join('')}</div>` : '')}
    ${section('Experience', experience)}
    ${section('Projects', projects)}
    ${section('Certifications', certifications)}
    ${section('Achievements', achievements)}
  </div></main>
</body></html>`;
}

// ATS guidance works with user-pasted plain text rather than a structured
// Resume Builder draft. Preserve that text faithfully in a mobile-native PDF
// so an edited analysis can still be taken to the device share sheet.
export function buildAtsResumeHtml(resumeText = '', templateId = 'classic') {
  const theme = resumeThemes[templateId] || resumeThemes.classic;
  const lines = String(resumeText || '')
    .split(/\r?\n/)
    .map((line) => line.trim());
  const headingPattern = /^(?:professional\s+)?(?:summary|profile|objective|technical\s+skills|skills|work\s+experience|experience|employment|projects|featured\s+projects|education|certifications|achievements|awards|contact)[\s:]*$/i;
  const content = lines.map((line) => {
    if (!line) return '<div class="spacer"></div>';
    const safe = escapeHtml(line.replace(/^[•*\-]\s*/, ''));
    if (headingPattern.test(line.replace(/[:#*-]/g, '').trim()) && line.length < 52) return `<h2>${safe}</h2>`;
    if (/^[•*\-]\s*/.test(line)) return `<div class="bullet"><span>•</span><div>${safe}</div></div>`;
    return `<div class="line">${safe}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 10.3pt; line-height: 1.43; }
  header { border-bottom: 4px solid ${theme.accent}; margin-bottom: 8mm; padding-bottom: 4mm; }
  h1 { color: ${theme.accent}; font-size: 20pt; margin: 0; }
  .meta { color: #64748B; font-size: 8.7pt; margin-top: 3px; }
  h2 { color: ${theme.accent}; border-bottom: 1px solid ${theme.accent}55; font-size: 10.3pt; letter-spacing: .7px; margin: 7mm 0 2.5mm; padding-bottom: 1.3mm; text-transform: uppercase; }
  .line { color: #334155; margin: 1.2mm 0; white-space: pre-wrap; }
  .bullet { color: #334155; display: flex; gap: 6px; margin: 1.2mm 0; }
  .bullet span { color: ${theme.accent}; font-weight: 700; }
  .spacer { height: 2.5mm; }
  .template-modern header { background: ${theme.accent}; color: #fff; margin: -15mm -15mm 8mm; padding: 15mm 15mm 8mm; border: 0; }
  .template-modern h1, .template-modern .meta { color: #fff; }
  .template-minimal header { border-width: 2px; }
  .template-bold h2 { background: ${theme.accent}; color: #fff; border: 0; padding: 2.2mm 3mm; }
</style></head><body><main class="template-${escapeHtml(templateId)}">
  <header><h1>ATS-tailored resume</h1><div class="meta">SmartHire mobile export · Review every suggested edit for accuracy before sharing.</div></header>
  ${content || '<div class="line">No resume text was provided.</div>'}
</main></body></html>`;
}

export function buildPlacementReportHtml(report = []) {
  const rows = report.map((item) => `
    <tr>
      <td>${escapeHtml(item.name || '—')}</td>
      <td>${escapeHtml(item.rollNumber || '—')}</td>
      <td>${escapeHtml(item.branch || '—')}</td>
      <td>${escapeHtml(item.cgpa ?? '—')}</td>
      <td>${escapeHtml(item.placementStatus || 'unplaced')}</td>
      <td>${escapeHtml(item.company || '—')}</td>
      <td>${escapeHtml(item.role || '—')}</td>
      <td>${escapeHtml(item.package || '—')}</td>
    </tr>`).join('');
  const createdAt = new Date().toLocaleDateString();
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 11mm; }
  * { box-sizing: border-box; }
  body { color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 8.4pt; }
  h1 { color: #172554; font-size: 19pt; margin: 0; }
  .meta { color: #64748B; margin: 5px 0 15px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #172554; color: #fff; font-size: 7.6pt; letter-spacing: .2px; text-align: left; }
  th, td { border: 1px solid #DCE3EE; padding: 6px; vertical-align: top; overflow-wrap: anywhere; }
  tr:nth-child(even) td { background: #F8FAFC; }
  .empty { color: #64748B; padding: 18px 0; }
</style></head><body>
  <h1>SmartHire Placement Report</h1>
  <div class="meta">Generated ${escapeHtml(createdAt)} · ${report.length} student${report.length === 1 ? '' : 's'}</div>
  ${report.length ? `<table><thead><tr><th>Name</th><th>Roll no.</th><th>Branch</th><th>CGPA</th><th>Status</th><th>Company</th><th>Role</th><th>Package</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">No student records are available for this report.</div>'}
</body></html>`;
}

export function buildApplicantsReportHtml(job = {}, applicants = []) {
  const rows = applicants.map((item) => {
    const profile = item.student_profiles || {};
    const stage = item.stage || item.status || 'applied';
    return `<tr>
      <td>${escapeHtml(profile.full_name || '—')}</td>
      <td>${escapeHtml(profile.roll_number || '—')}</td>
      <td>${escapeHtml(profile.branch || '—')}</td>
      <td>${escapeHtml(profile.cgpa ?? '—')}</td>
      <td>${escapeHtml(profile.users?.email || item.users?.email || '—')}</td>
      <td>${escapeHtml(stage)}</td>
    </tr>`;
  }).join('');
  const createdAt = new Date().toLocaleDateString('en-IN');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 11mm; }
  * { box-sizing: border-box; }
  body { color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; }
  h1 { color: #172554; font-size: 19pt; margin: 0; }
  .meta { color: #64748B; margin: 5px 0 15px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #172554; color: #fff; font-size: 7.6pt; letter-spacing: .2px; text-align: left; }
  th, td { border: 1px solid #DCE3EE; padding: 6px; vertical-align: top; overflow-wrap: anywhere; }
  tr:nth-child(even) td { background: #F8FAFC; }
  .empty { color: #64748B; padding: 18px 0; }
</style></head><body>
  <h1>SmartHire Applicant Report</h1>
  <div class="meta">${escapeHtml(job.title || 'Job posting')}${job.package_lpa ? ` · ${escapeHtml(job.package_lpa)} LPA` : ''} · Generated ${escapeHtml(createdAt)} · ${applicants.length} candidate${applicants.length === 1 ? '' : 's'}</div>
  ${applicants.length ? `<table><thead><tr><th>Name</th><th>Roll no.</th><th>Branch</th><th>CGPA</th><th>Email</th><th>Stage</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">No applicants match the selected filters.</div>'}
</body></html>`;
}

function assertNativeExport() {
  if (Platform.OS === 'web') {
    throw new Error('PDF export is available in the Android or iOS app.');
  }
}

export async function createPdfFromHtml(html) {
  assertNativeExport();
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function sharePdf(uri, dialogTitle = 'Share PDF') {
  assertNativeExport();
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, {
    dialogTitle,
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}

export async function createAndSharePdf(html, dialogTitle) {
  const uri = await createPdfFromHtml(html);
  await sharePdf(uri, dialogTitle);
  return uri;
}

export { resumeThemes };
