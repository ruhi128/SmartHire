// src/pages/student/ResumeBuilder.jsx
import { useState } from 'react';
import { studentAPI } from '../../api/axios';
// import { uploadResume } from '../../supabaseClient';
import api from '../../api/axios'; // make sure this is imported

import { useAuth } from '../../context/AuthContext';
import GlowCard from '../../components/GlowCard';
import { jsPDF } from 'jspdf';
import { Download, Save, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
// Add this import at top of ResumeBuilder.jsx
import { supabase } from '../../supabaseClient';

const CYAN = '#00c8f0', GREEN = '#10c98a', VIOLET = '#7c5cfc', AMBER = '#f5a623';

const INIT = {
  name: '', email: '', phone: '', linkedin: '', github: '', location: '',
  college: '', degree: '', branch: '', cgpa: '', gradYear: '2025',
  skills: '', experience: '', projects: '', certifications: '', achievements: '', summary: ''
};

// ── 4 Resume Templates ──────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic Professional',
    accent: '#1a365d',
    preview: '🔵',
    desc: 'Traditional clean layout — ATS friendly',
  },
  {
    id: 'modern',
    name: 'Modern Sidebar',
    accent: '#7c5cfc',
    preview: '🟣',
    desc: 'Two-column with colored sidebar',
  },
  {
    id: 'minimal',
    name: 'Minimal Elegant',
    accent: '#2d3748',
    preview: '⚫',
    desc: 'Clean minimalist with accent lines',
  },
  {
    id: 'bold',
    name: 'Bold Impact',
    accent: '#00c8f0',
    preview: '🔷',
    desc: 'Strong header with modern typography',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
//  PDF GENERATORS — one per template
// ═══════════════════════════════════════════════════════════════════════════

// ── Template 1: Classic Professional ────────────────────────────────────────
function generateClassic(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 15, CW = W - M * 2;
  let y = 20;

  const checkPage = (needed = 10) => {
    if (y + needed > H - 15) { doc.addPage(); y = 20; }
  };

  const sectionHeader = (title) => {
    checkPage(14);
    y += 4;
    doc.setDrawColor(26, 54, 93);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 54, 93);
    doc.text(title, M, y);
    y += 6;
    doc.setTextColor(40, 40, 40);
  };

  const addWrappedText = (text, fontSize = 9.5, color = [60, 60, 60], indent = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CW - indent);
    lines.forEach(line => {
      checkPage(6);
      doc.text(line, M + indent, y);
      y += 5.5;
    });
  };

  // ── Header ──
  doc.setFillColor(26, 54, 93);
  doc.rect(0, 0, W, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(data.name || 'Your Name', W / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 220, 255);
  const contact = [data.email, data.phone, data.location, data.linkedin, data.github]
    .filter(Boolean).join('   |   ');
  doc.text(contact, W / 2, 24, { align: 'center', maxWidth: CW });

  if (data.degree || data.college) {
    doc.setTextColor(180, 210, 255);
    doc.setFontSize(9);
    doc.text(`${data.degree || ''} ${data.branch ? '• ' + data.branch : ''} ${data.college ? '• ' + data.college : ''}`, W / 2, 31, { align: 'center' });
  }
  y = 46;

  // ── Summary ──
  if (data.summary) {
    sectionHeader('PROFESSIONAL SUMMARY');
    addWrappedText(data.summary);
    y += 2;
  }

  // ── Education ──
  if (data.college) {
    sectionHeader('EDUCATION');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 54, 93);
    checkPage(8);
    doc.text(data.college, M, y);
    const gradText = data.gradYear ? `Graduating ${data.gradYear}` : '';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(gradText, W - M, y, { align: 'right' });
    y += 5.5;
    doc.setTextColor(60, 60, 60);
    const eduLine = [data.degree, data.branch, data.cgpa ? `CGPA: ${data.cgpa}` : ''].filter(Boolean).join(' • ');
    doc.text(eduLine, M, y);
    y += 8;
  }

  // ── Skills ──
  if (data.skills) {
    sectionHeader('TECHNICAL SKILLS');
    const skillList = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    const cols = 3;
    const colW = CW / cols;
    skillList.forEach((skill, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      if (col === 0 && i > 0) { y += 6; }
      if (col === 0) checkPage(6);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(`▸ ${skill}`, M + col * colW, y);
    });
    y += 10;
  }

  // ── Experience ──
  if (data.experience) {
    sectionHeader('EXPERIENCE');
    data.experience.split('\n').forEach(line => {
      if (!line.trim()) { y += 2; return; }
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      if (isBullet) {
        addWrappedText(line.replace(/^[-•]\s*/, '• '), 9.5, [60, 60, 60], 4);
      } else {
        checkPage(7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(26, 54, 93);
        doc.text(line.trim(), M, y);
        y += 5.5;
      }
    });
    y += 2;
  }

  // ── Projects ──
  if (data.projects) {
    sectionHeader('PROJECTS');
    data.projects.split('\n').forEach(line => {
      if (!line.trim()) { y += 2; return; }
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      if (isBullet) {
        addWrappedText(line.replace(/^[-•]\s*/, '• '), 9.5, [60, 60, 60], 4);
      } else {
        checkPage(7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(26, 54, 93);
        doc.text(line.trim(), M, y);
        y += 5.5;
      }
    });
    y += 2;
  }

  // ── Certifications ──
  if (data.certifications) {
    sectionHeader('CERTIFICATIONS');
    data.certifications.split('\n').filter(Boolean).forEach(line => {
      checkPage(6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      doc.text(`✓  ${line.trim()}`, M, y);
      y += 5.5;
    });
    y += 2;
  }

  // ── Achievements ──
  if (data.achievements) {
    sectionHeader('ACHIEVEMENTS');
    data.achievements.split('\n').filter(Boolean).forEach(line => {
      checkPage(6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      doc.text(`★  ${line.trim()}`, M, y);
      y += 5.5;
    });
  }

  return doc;
}

// ── Template 2: Modern Sidebar ───────────────────────────────────────────────
function generateModern(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  const SB = 68; // sidebar width
  const MB = SB + 8; // main content left
  const MW = W - MB - 10; // main content width

  // ── Sidebar background ──
  doc.setFillColor(30, 20, 60);
  doc.rect(0, 0, SB, H, 'F');

  // ── Header bar ──
  doc.setFillColor(124, 92, 252);
  doc.rect(0, 0, SB, 55, 'F');

  // ── Name ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const nameParts = (data.name || 'Your Name').split(' ');
  if (nameParts.length >= 2) {
    doc.text(nameParts.slice(0, -1).join(' '), SB / 2, 18, { align: 'center' });
    doc.text(nameParts[nameParts.length - 1], SB / 2, 26, { align: 'center' });
  } else {
    doc.text(data.name || 'Your Name', SB / 2, 22, { align: 'center' });
  }

  if (data.degree) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(200, 180, 255);
    doc.text(data.degree, SB / 2, 33, { align: 'center' });
    if (data.branch) doc.text(data.branch, SB / 2, 38, { align: 'center' });
  }

  // ── Sidebar sections ──
  let sy = 62;
  const sbSection = (title) => {
    sy += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(124, 92, 252);
    doc.text(title, 5, sy);
    sy += 2;
    doc.setDrawColor(124, 92, 252);
    doc.setLineWidth(0.3);
    doc.line(5, sy, SB - 5, sy);
    sy += 5;
    doc.setTextColor(200, 200, 220);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
  };

  // Contact
  sbSection('CONTACT');
  [
    data.email && `✉ ${data.email}`,
    data.phone && `✆ ${data.phone}`,
    data.location && `⌖ ${data.location}`,
    data.linkedin && `in ${data.linkedin}`,
    data.github && `⌥ ${data.github}`,
  ].filter(Boolean).forEach(line => {
    const wrapped = doc.splitTextToSize(line, SB - 10);
    wrapped.forEach(l => { doc.text(l, 5, sy); sy += 4.5; });
  });

  // Skills
  if (data.skills) {
    sbSection('SKILLS');
    data.skills.split(',').map(s => s.trim()).filter(Boolean).forEach(skill => {
      doc.setFillColor(124, 92, 252, 0.3);
      doc.setDrawColor(124, 92, 252);
      doc.setLineWidth(0.2);
      doc.roundedRect(5, sy - 3.5, SB - 10, 5.5, 1, 1, 'S');
      doc.setTextColor(180, 180, 220);
      doc.setFontSize(7.5);
      doc.text(skill, SB / 2, sy, { align: 'center' });
      sy += 7;
    });
  }

  // Education in sidebar
  if (data.college) {
    sbSection('EDUCATION');
    doc.setTextColor(200, 200, 220);
    doc.setFontSize(8);
    const collegeLines = doc.splitTextToSize(data.college, SB - 10);
    collegeLines.forEach(l => { doc.text(l, 5, sy); sy += 4.5; });
    if (data.cgpa) { doc.text(`CGPA: ${data.cgpa}`, 5, sy); sy += 4.5; }
    if (data.gradYear) { doc.text(`Grad: ${data.gradYear}`, 5, sy); sy += 4.5; }
  }

  // Certifications in sidebar
  if (data.certifications) {
    sbSection('CERTIFICATIONS');
    data.certifications.split('\n').filter(Boolean).forEach(cert => {
      const lines = doc.splitTextToSize(`• ${cert.trim()}`, SB - 10);
      lines.forEach(l => { doc.text(l, 5, sy); sy += 4.5; });
    });
  }

  // ── Main content ──
  let my = 18;
  const checkPageMain = (needed = 10) => {
    if (my + needed > H - 15) { doc.addPage(); my = 20; }
  };

  const mainSection = (title) => {
    checkPageMain(14);
    my += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(124, 92, 252);
    doc.text(title, MB, my);
    my += 2;
    doc.setDrawColor(124, 92, 252);
    doc.setLineWidth(0.4);
    doc.line(MB, my, W - 10, my);
    my += 5;
    doc.setTextColor(40, 40, 40);
  };

  const addMainText = (text, fontSize = 9.5, color = [50, 50, 50], indent = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, MW - indent);
    lines.forEach(line => {
      checkPageMain(6);
      doc.text(line, MB + indent, my);
      my += 5.2;
    });
  };

  // Summary
  if (data.summary) {
    mainSection('ABOUT ME');
    addMainText(data.summary, 9.5, [60, 60, 60]);
    my += 2;
  }

  // Experience
  if (data.experience) {
    mainSection('EXPERIENCE');
    data.experience.split('\n').forEach(line => {
      if (!line.trim()) { my += 2; return; }
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      if (isBullet) {
        addMainText(line.replace(/^[-•]\s*/, ''), 9.5, [60, 60, 60], 5);
      } else {
        checkPageMain(7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 20, 60);
        doc.text(line.trim(), MB, my);
        my += 5.5;
      }
    });
    my += 2;
  }

  // Projects
  if (data.projects) {
    mainSection('PROJECTS');
    data.projects.split('\n').forEach(line => {
      if (!line.trim()) { my += 2; return; }
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      if (isBullet) {
        addMainText(line.replace(/^[-•]\s*/, ''), 9.5, [60, 60, 60], 5);
      } else {
        checkPageMain(7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 20, 60);
        doc.text(line.trim(), MB, my);
        my += 5.5;
      }
    });
    my += 2;
  }

  // Achievements
  if (data.achievements) {
    mainSection('ACHIEVEMENTS');
    data.achievements.split('\n').filter(Boolean).forEach(line => {
      checkPageMain(6);
      addMainText(`★  ${line.trim()}`, 9.5, [60, 60, 60]);
    });
  }

  return doc;
}

// ── Template 3: Minimal Elegant ──────────────────────────────────────────────
function generateMinimal(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 20, CW = W - M * 2;
  let y = 25;

  const checkPage = (needed = 10) => {
    if (y + needed > H - 15) { doc.addPage(); y = 20; }
  };

  // ── Name ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(30, 30, 30);
  doc.text((data.name || 'Your Name').toUpperCase(), M, y);
  y += 9;

  // Thin accent line
  doc.setDrawColor(45, 55, 72);
  doc.setLineWidth(1.5);
  doc.line(M, y, M + 40, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(180, 180, 180);
  doc.line(M + 41, y, W - M, y);
  y += 6;

  // Contact row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  const contactItems = [data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean);
  doc.text(contactItems.join('   ·   '), M, y);
  y += 10;

  const sectionTitle = (title) => {
    checkPage(14);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(45, 55, 72);
    doc.text(title, M, y);
    y += 3;
    doc.setDrawColor(45, 55, 72);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 5;
  };

  const addText = (text, size = 9.5, bold = false, color = [50, 50, 50], indent = 0) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CW - indent);
    lines.forEach(l => {
      checkPage(6);
      doc.text(l, M + indent, y);
      y += 5;
    });
  };

  // Summary
  if (data.summary) {
    sectionTitle('SUMMARY');
    addText(data.summary, 9.5, false, [80, 80, 80]);
    y += 2;
  }

  // Education
  if (data.college) {
    sectionTitle('EDUCATION');
    addText(data.college, 10, true, [30, 30, 30]);
    const eduDetails = [
      data.degree && data.branch ? `${data.degree} in ${data.branch}` : data.degree || data.branch,
      data.cgpa ? `CGPA: ${data.cgpa}` : '',
      data.gradYear ? `Class of ${data.gradYear}` : '',
    ].filter(Boolean).join('   ·   ');
    if (eduDetails) addText(eduDetails, 9, false, [100, 100, 100]);
    y += 2;
  }

  // Skills — tag style
  if (data.skills) {
    sectionTitle('SKILLS');
    const skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    let sx = M;
    const tagH = 6, tagPad = 4, tagGap = 3;
    skills.forEach(skill => {
      const tw = doc.getStringUnitWidth(skill) * 9 * (1 / doc.internal.scaleFactor) + tagPad * 2;
      if (sx + tw > W - M) { sx = M; y += tagH + tagGap; }
      checkPage(tagH + 3);
      doc.setDrawColor(45, 55, 72);
      doc.setLineWidth(0.3);
      doc.roundedRect(sx, y - tagH + 1, tw, tagH, 1.5, 1.5, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(45, 55, 72);
      doc.text(skill, sx + tagPad, y - 1);
      sx += tw + tagGap;
    });
    y += 10;
  }

  // Experience
  if (data.experience) {
    sectionTitle('EXPERIENCE');
    data.experience.split('\n').forEach(line => {
      if (!line.trim()) { y += 2; return; }
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      if (isBullet) {
        addText(line.replace(/^[-•]\s*/, '─  '), 9.5, false, [70, 70, 70], 5);
      } else {
        y += 2;
        addText(line.trim(), 10.5, true, [30, 30, 30]);
      }
    });
    y += 2;
  }

  // Projects
  if (data.projects) {
    sectionTitle('PROJECTS');
    data.projects.split('\n').forEach(line => {
      if (!line.trim()) { y += 2; return; }
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      if (isBullet) {
        addText(line.replace(/^[-•]\s*/, '─  '), 9.5, false, [70, 70, 70], 5);
      } else {
        y += 2;
        addText(line.trim(), 10.5, true, [30, 30, 30]);
      }
    });
    y += 2;
  }

  // Certifications
  if (data.certifications) {
    sectionTitle('CERTIFICATIONS');
    data.certifications.split('\n').filter(Boolean).forEach(line => {
      addText(`◆  ${line.trim()}`, 9.5, false, [70, 70, 70]);
    });
    y += 2;
  }

  // Achievements
  if (data.achievements) {
    sectionTitle('ACHIEVEMENTS');
    data.achievements.split('\n').filter(Boolean).forEach(line => {
      addText(`◆  ${line.trim()}`, 9.5, false, [70, 70, 70]);
    });
  }

  return doc;
}

// ── Template 4: Bold Impact ───────────────────────────────────────────────────
function generateBold(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 14, CW = W - M * 2;
  let y = 0;

  const checkPage = (needed = 10) => {
    if (y + needed > H - 15) { doc.addPage(); y = 20; }
  };

  // ── Full-width header ──
  doc.setFillColor(0, 18, 36);
  doc.rect(0, 0, W, 50, 'F');

  // Accent stripe
  doc.setFillColor(0, 200, 240);
  doc.rect(0, 50, W, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text((data.name || 'YOUR NAME').toUpperCase(), W / 2, 20, { align: 'center' });

  if (data.degree || data.branch) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 200, 240);
    doc.text(`${data.degree || ''} ${data.branch ? '| ' + data.branch : ''}`.trim(), W / 2, 30, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(160, 200, 230);
  const contact = [data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean).join('   |   ');
  doc.text(contact, W / 2, 42, { align: 'center', maxWidth: CW });

  y = 62;

  const sectionHeader = (title) => {
    checkPage(14);
    y += 5;
    // Left accent bar
    doc.setFillColor(0, 200, 240);
    doc.rect(M, y - 4, 3, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 18, 36);
    doc.text(title, M + 7, y);
    y += 4;
    doc.setDrawColor(200, 230, 255);
    doc.setLineWidth(0.3);
    doc.line(M + 7, y, W - M, y);
    y += 5;
  };

  const addText = (text, size = 9.5, bold = false, color = [40, 40, 40], indent = 0) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CW - indent - 10);
    lines.forEach(l => {
      checkPage(6);
      doc.text(l, M + 10 + indent, y);
      y += 5.2;
    });
  };

  // Summary
  if (data.summary) {
    sectionHeader('PROFESSIONAL SUMMARY');
    addText(data.summary, 9.5, false, [60, 60, 60]);
    y += 2;
  }

  // Education
  if (data.college) {
    sectionHeader('EDUCATION');
    checkPage(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 18, 36);
    doc.text(data.college, M + 10, y);
    if (data.gradYear) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(data.gradYear, W - M, y, { align: 'right' });
    }
    y += 5.5;
    const ed = [data.degree, data.branch, data.cgpa ? `CGPA: ${data.cgpa}` : ''].filter(Boolean).join(' • ');
    addText(ed, 9, false, [80, 80, 80]);
    y += 3;
  }

  // Skills — two columns
  if (data.skills) {
    sectionHeader('TECHNICAL SKILLS');
    const skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    const half   = Math.ceil(skills.length / 2);
    const col1   = skills.slice(0, half);
    const col2   = skills.slice(half);
    const maxRows= Math.max(col1.length, col2.length);
    for (let i = 0; i < maxRows; i++) {
      checkPage(6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 50);
      if (col1[i]) {
        doc.setFillColor(0, 200, 240);
        doc.circle(M + 12, y - 1.5, 1, 'F');
        doc.text(col1[i], M + 16, y);
      }
      if (col2[i]) {
        doc.setFillColor(0, 200, 240);
        doc.circle(W / 2 + 4, y - 1.5, 1, 'F');
        doc.text(col2[i], W / 2 + 8, y);
      }
      y += 6;
    }
    y += 3;
  }

  // Experience
  if (data.experience) {
    sectionHeader('EXPERIENCE');
    data.experience.split('\n').forEach(line => {
      if (!line.trim()) { y += 2; return; }
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      if (isBullet) {
        checkPage(6);
        doc.setFillColor(0, 200, 240);
        doc.circle(M + 13, y - 1.5, 1, 'F');
        addText(line.replace(/^[-•]\s*/, ''), 9.5, false, [60, 60, 60], 5);
      } else {
        checkPage(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(0, 18, 36);
        doc.text(line.trim(), M + 10, y);
        y += 6;
      }
    });
    y += 2;
  }

  // Projects
  if (data.projects) {
    sectionHeader('PROJECTS');
    data.projects.split('\n').forEach(line => {
      if (!line.trim()) { y += 2; return; }
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      if (isBullet) {
        checkPage(6);
        doc.setFillColor(0, 200, 240);
        doc.circle(M + 13, y - 1.5, 1, 'F');
        addText(line.replace(/^[-•]\s*/, ''), 9.5, false, [60, 60, 60], 5);
      } else {
        checkPage(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(0, 18, 36);
        doc.text(line.trim(), M + 10, y);
        y += 6;
      }
    });
    y += 2;
  }

  // Certifications + Achievements — two columns
  if (data.certifications || data.achievements) {
    const hasBoth = data.certifications && data.achievements;
    if (hasBoth) {
      checkPage(14);
      const halfW = (CW - 5) / 2;

      // Left: Certifications
      const startY = y;
      let leftY    = y;

      sectionHeader('CERTIFICATIONS');
      data.certifications.split('\n').filter(Boolean).forEach(line => {
        checkPage(6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const ls = doc.splitTextToSize(`✓  ${line.trim()}`, halfW - 5);
        ls.forEach(l => { doc.text(l, M + 10, y); y += 5; });
      });
    } else {
      if (data.certifications) {
        sectionHeader('CERTIFICATIONS');
        data.certifications.split('\n').filter(Boolean).forEach(line => {
          addText(`✓  ${line.trim()}`, 9.5, false, [60, 60, 60]);
        });
      }
      if (data.achievements) {
        sectionHeader('ACHIEVEMENTS');
        data.achievements.split('\n').filter(Boolean).forEach(line => {
          addText(`★  ${line.trim()}`, 9.5, false, [60, 60, 60]);
        });
      }
    }
  }

  return doc;
}

const GENERATORS = {
  classic: generateClassic,
  modern:  generateModern,
  minimal: generateMinimal,
  bold:    generateBold,
};

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE PREVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function ResumePreview({ data, template }) {
  const t = TEMPLATES.find(t => t.id === template);
  const ac = t?.accent || '#1a365d';

  const skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);

  if (template === 'classic') return (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#222', background: '#fff', padding: 0, lineHeight: 1.5 }}>
      {/* Header */}
      <div style={{ background: '#1a365d', padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>{data.name || 'Your Name'}</div>
        <div style={{ fontSize: 9, color: '#c8d8ff', marginTop: 4 }}>
          {[data.email, data.phone, data.location, data.linkedin].filter(Boolean).join('   |   ')}
        </div>
        {(data.degree || data.college) && (
          <div style={{ fontSize: 9, color: '#b0c4ee', marginTop: 2 }}>
            {[data.degree, data.branch, data.college].filter(Boolean).join(' • ')}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 16px' }}>
        {data.summary && <PreviewSection title="PROFESSIONAL SUMMARY" color={ac}><p style={{ margin: 0, fontSize: 10, color: '#444' }}>{data.summary}</p></PreviewSection>}
        {data.college && <PreviewSection title="EDUCATION" color={ac}><div style={{ fontSize: 10 }}><strong>{data.college}</strong> — {data.degree} {data.branch} {data.cgpa && `• CGPA: ${data.cgpa}`} {data.gradYear && `• ${data.gradYear}`}</div></PreviewSection>}
        {skills.length > 0 && <PreviewSection title="SKILLS" color={ac}><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{skills.map((s, i) => <span key={i} style={{ fontSize: 9, background: '#eef2ff', border: '1px solid #c7d2fe', padding: '1px 7px', borderRadius: 4, color: '#3730a3' }}>▸ {s}</span>)}</div></PreviewSection>}
        {data.experience && <PreviewSection title="EXPERIENCE" color={ac}><PreviewLines text={data.experience} ac={ac} /></PreviewSection>}
        {data.projects && <PreviewSection title="PROJECTS" color={ac}><PreviewLines text={data.projects} ac={ac} /></PreviewSection>}
        {data.certifications && <PreviewSection title="CERTIFICATIONS" color={ac}><PreviewBullets text={data.certifications} prefix="✓" /></PreviewSection>}
        {data.achievements && <PreviewSection title="ACHIEVEMENTS" color={ac}><PreviewBullets text={data.achievements} prefix="★" /></PreviewSection>}
      </div>
    </div>
  );

  if (template === 'modern') return (
    <div style={{ fontFamily: 'Arial, sans-serif', display: 'flex', background: '#fff', minHeight: 400 }}>
      {/* Sidebar */}
      <div style={{ width: 140, background: '#1e143c', padding: '14px 10px', flexShrink: 0 }}>
        <div style={{ background: '#7c5cfc', margin: '-14px -10px 10px', padding: '14px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>{data.name || 'Your Name'}</div>
          {data.degree && <div style={{ fontSize: 8, color: '#c4b5fd', marginTop: 3 }}>{data.degree}</div>}
          {data.branch && <div style={{ fontSize: 8, color: '#c4b5fd' }}>{data.branch}</div>}
        </div>
        <SBSection title="CONTACT" color="#7c5cfc">
          {[data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean).map((c, i) => (
            <div key={i} style={{ fontSize: 7.5, color: '#c0b8e0', marginBottom: 3, wordBreak: 'break-all' }}>{c}</div>
          ))}
        </SBSection>
        {skills.length > 0 && (
          <SBSection title="SKILLS" color="#7c5cfc">
            {skills.map((s, i) => (
              <div key={i} style={{ fontSize: 7.5, color: '#c0b8e0', border: '1px solid #7c5cfc', borderRadius: 3, padding: '1px 5px', marginBottom: 3, textAlign: 'center' }}>{s}</div>
            ))}
          </SBSection>
        )}
        {data.college && (
          <SBSection title="EDUCATION" color="#7c5cfc">
            <div style={{ fontSize: 7.5, color: '#c0b8e0' }}>{data.college}</div>
            {data.cgpa && <div style={{ fontSize: 7.5, color: '#c0b8e0' }}>CGPA: {data.cgpa}</div>}
            {data.gradYear && <div style={{ fontSize: 7.5, color: '#c0b8e0' }}>{data.gradYear}</div>}
          </SBSection>
        )}
      </div>
      {/* Main */}
      <div style={{ flex: 1, padding: '14px 14px' }}>
        {data.summary && <PreviewSection title="ABOUT ME" color="#7c5cfc"><p style={{ margin: 0, fontSize: 9.5, color: '#444' }}>{data.summary}</p></PreviewSection>}
        {data.experience && <PreviewSection title="EXPERIENCE" color="#7c5cfc"><PreviewLines text={data.experience} ac="#7c5cfc" /></PreviewSection>}
        {data.projects && <PreviewSection title="PROJECTS" color="#7c5cfc"><PreviewLines text={data.projects} ac="#7c5cfc" /></PreviewSection>}
        {data.achievements && <PreviewSection title="ACHIEVEMENTS" color="#7c5cfc"><PreviewBullets text={data.achievements} prefix="★" /></PreviewSection>}
      </div>
    </div>
  );

  if (template === 'minimal') return (
    <div style={{ fontFamily: "'Helvetica Neue', sans-serif", padding: '16px 20px', background: '#fff', color: '#222' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', letterSpacing: 2, textTransform: 'uppercase' }}>{data.name || 'Your Name'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 8px' }}>
        <div style={{ width: 40, height: 2, background: '#2d3748' }} />
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>
      <div style={{ fontSize: 8.5, color: '#888', marginBottom: 10 }}>
        {[data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean).join('   ·   ')}
      </div>
      {data.summary && <MinSection title="SUMMARY"><p style={{ margin: 0, fontSize: 9.5, color: '#555' }}>{data.summary}</p></MinSection>}
      {data.college && <MinSection title="EDUCATION"><strong style={{ fontSize: 10 }}>{data.college}</strong><div style={{ fontSize: 9, color: '#777' }}>{[data.degree, data.branch, data.cgpa && `CGPA: ${data.cgpa}`, data.gradYear && `Class of ${data.gradYear}`].filter(Boolean).join(' · ')}</div></MinSection>}
      {skills.length > 0 && <MinSection title="SKILLS"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{skills.map((s, i) => <span key={i} style={{ fontSize: 8.5, border: '1px solid #2d3748', color: '#2d3748', padding: '1px 7px', borderRadius: 10 }}>{s}</span>)}</div></MinSection>}
      {data.experience && <MinSection title="EXPERIENCE"><PreviewLines text={data.experience} ac="#2d3748" /></MinSection>}
      {data.projects && <MinSection title="PROJECTS"><PreviewLines text={data.projects} ac="#2d3748" /></MinSection>}
      {data.certifications && <MinSection title="CERTIFICATIONS"><PreviewBullets text={data.certifications} prefix="◆" /></MinSection>}
      {data.achievements && <MinSection title="ACHIEVEMENTS"><PreviewBullets text={data.achievements} prefix="◆" /></MinSection>}
    </div>
  );

  if (template === 'bold') return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', color: '#111' }}>
      <div style={{ background: '#001224', padding: '16px 20px', textAlign: 'center', borderBottom: '3px solid #00c8f0' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 3, textTransform: 'uppercase' }}>{data.name || 'YOUR NAME'}</div>
        {(data.degree || data.branch) && <div style={{ fontSize: 10, color: '#00c8f0', marginTop: 4 }}>{[data.degree, data.branch].filter(Boolean).join(' | ')}</div>}
        <div style={{ fontSize: 8, color: '#a0c4e0', marginTop: 5 }}>{[data.email, data.phone, data.location].filter(Boolean).join('   |   ')}</div>
      </div>
      <div style={{ padding: '12px 16px' }}>
        {data.summary && <BoldSection title="PROFESSIONAL SUMMARY"><p style={{ margin: 0, fontSize: 9.5, color: '#444' }}>{data.summary}</p></BoldSection>}
        {data.college && <BoldSection title="EDUCATION"><div style={{ fontSize: 10 }}><strong>{data.college}</strong> {data.gradYear && <span style={{ color: '#888', float: 'right' }}>{data.gradYear}</span>}</div><div style={{ fontSize: 9, color: '#666' }}>{[data.degree, data.branch, data.cgpa && `CGPA: ${data.cgpa}`].filter(Boolean).join(' • ')}</div></BoldSection>}
        {skills.length > 0 && <BoldSection title="TECHNICAL SKILLS"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 20px' }}>{skills.map((s, i) => <div key={i} style={{ fontSize: 9.5, color: '#333', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00c8f0', display: 'inline-block', flexShrink: 0 }} />{s}</div>)}</div></BoldSection>}
        {data.experience && <BoldSection title="EXPERIENCE"><PreviewLines text={data.experience} ac="#00c8f0" /></BoldSection>}
        {data.projects && <BoldSection title="PROJECTS"><PreviewLines text={data.projects} ac="#00c8f0" /></BoldSection>}
        {data.certifications && <BoldSection title="CERTIFICATIONS"><PreviewBullets text={data.certifications} prefix="✓" /></BoldSection>}
        {data.achievements && <BoldSection title="ACHIEVEMENTS"><PreviewBullets text={data.achievements} prefix="★" /></BoldSection>}
      </div>
    </div>
  );

  return null;
}

// ── Preview sub-components ───────────────────────────────────────────────────
function PreviewSection({ title, color, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ borderBottom: `2px solid ${color}`, marginBottom: 5, paddingBottom: 2 }}>
        <span style={{ fontSize: 9, fontWeight: 800, color, letterSpacing: 1 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function SBSection({ title, color, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 8, fontWeight: 800, color, letterSpacing: 1, marginBottom: 4, borderBottom: `1px solid ${color}44`, paddingBottom: 2 }}>{title}</div>
      {children}
    </div>
  );
}

function MinSection({ title, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, color: '#2d3748', letterSpacing: 1.5, marginBottom: 4 }}>{title}</div>
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 5 }}>{children}</div>
    </div>
  );
}

function BoldSection({ title, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <div style={{ width: 3, height: 14, background: '#00c8f0', borderRadius: 2 }} />
        <span style={{ fontSize: 9.5, fontWeight: 800, color: '#001224', letterSpacing: 1 }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>
      {children}
    </div>
  );
}

function PreviewLines({ text, ac }) {
  return (
    <div>
      {text.split('\n').filter(Boolean).map((line, i) => {
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        return isBullet
          ? <div key={i} style={{ fontSize: 9.5, color: '#555', paddingLeft: 12, marginBottom: 2 }}>{line.replace(/^[-•]\s*/, '• ')}</div>
          : <div key={i} style={{ fontSize: 10, fontWeight: 700, color: ac, marginTop: 5, marginBottom: 2 }}>{line}</div>;
      })}
    </div>
  );
}

function PreviewBullets({ text, prefix }) {
  return (
    <div>
      {text.split('\n').filter(Boolean).map((line, i) => (
        <div key={i} style={{ fontSize: 9.5, color: '#555', marginBottom: 3 }}>{prefix} {line.trim()}</div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ResumeBuilder() {
  const { user }                          = useAuth();
  const [data, setData]                   = useState(INIT);
  const [saving, setSaving]               = useState(false);
  const [template, setTemplate]           = useState('classic');
  const [showPreview, setShowPreview]     = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  const set = (k, v) => setData(p => ({ ...p, [k]: v }));

  const Field = ({ label, name, multiline = false, rows = 3, placeholder = '', half = false }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: half ? 'span 1' : 'span 2' }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {multiline
        ? <textarea value={data[name]} onChange={e => set(name, e.target.value)} rows={rows} placeholder={placeholder} style={INP} />
        : <input value={data[name]} onChange={e => set(name, e.target.value)} placeholder={placeholder} style={{ ...INP, resize: 'none' }} />}
    </div>
  );

  const generate = () => {
    if (!data.name || !data.email) { toast.error('Please fill name and email at minimum'); return; }
    try {
      const doc = GENERATORS[template](data);
      doc.save(`${(data.name || 'Resume').replace(/ /g, '_')}_${template}_Resume.pdf`);
      toast.success('Resume downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('PDF generation failed');
    }
  };

   
const saveToProfile = async () => {
  setSaving(true);
  try {
    if (!data.name) {
      toast.error('Please enter your name before saving');
      setSaving(false);
      return;
    }

    const doc  = GENERATORS[template](data);
    const blob = doc.output('blob');

    console.log('PDF size:', blob.size, 'bytes'); // check size

    const formData = new FormData();
    formData.append(
      'file', 
      blob, 
      `${data.name.replace(/\s+/g, '_')}_resume.pdf`
    );

    const token = localStorage.getItem('token');

    // ✅ Use fetch instead of axios — no timeout issue
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/upload/resume`,
      {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        // ❌ Don't set Content-Type — fetch sets it automatically with boundary for FormData
        body: formData,
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Upload failed');
    }

    const result = await response.json();

    if (!result.url) throw new Error('No URL returned');

    await studentAPI.updateProfile({ resume_url: result.url });
    toast.success('Resume saved to profile!');

  } catch (err) {
    console.error('Save error:', err);
    toast.error(err.message || 'Save failed');
  } finally {
    setSaving(false);
  }
};
  // ← NOTHING after this closing }; until SECTIONS array
 
  const SECTIONS = [
    { id: 'personal',  label: '👤 Personal' },
    { id: 'education', label: '🎓 Education' },
    { id: 'skills',    label: '💻 Skills' },
    { id: 'experience',label: '💼 Experience' },
    { id: 'projects',  label: '🚀 Projects' },
    { id: 'extras',    label: '🏆 Extras' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f0f6ff', fontFamily: "'Sora',sans-serif" }}>Resume Builder</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569' }}>Build a professional ATS-friendly resume with 4 templates</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={BTN2} onClick={() => setShowPreview(p => !p)}>
            <Eye size={14} />{showPreview ? 'Hide Preview' : 'Live Preview'}
          </button>
          <button style={BTN2} onClick={saveToProfile} disabled={saving}>
            <Save size={14} />{saving ? 'Saving...' : 'Save to Profile'}
          </button>
          <button style={{ ...BTN2, background: CYAN, color: '#040c18', border: 'none' }} onClick={generate}>
            <Download size={14} />Download PDF
          </button>
        </div>
      </div>

      {/* Template Selector */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Choose Template</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setTemplate(t.id)} style={{
              padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              background: template === t.id ? `${t.accent}18` : 'rgba(255,255,255,0.02)',
              border: `2px solid ${template === t.id ? t.accent : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{t.preview}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: template === t.id ? t.accent : '#e2e8f0', marginBottom: 3 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{t.desc}</div>
              {template === t.id && (
                <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: t.accent }}>✓ Selected</div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: 20 }}>

        {/* Left: Form */}
        <div>
          {/* Section tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', border: 'none', fontFamily: "'Sora',sans-serif",
                background: activeSection === s.id ? CYAN : 'rgba(255,255,255,0.05)',
                color: activeSection === s.id ? '#040c18' : '#64748b',
              }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Personal */}
          {activeSection === 'personal' && (
            <GlowCard title="Personal Information" accent={CYAN}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Full Name"    name="name"     half placeholder="Aarav Kumar" />
                <Field label="Email"        name="email"    half placeholder="you@email.com" />
                <Field label="Phone"        name="phone"    half placeholder="+91 98765 43210" />
                <Field label="Location"     name="location" half placeholder="Mumbai, India" />
                <Field label="LinkedIn URL" name="linkedin" half placeholder="linkedin.com/in/you" />
                <Field label="GitHub URL"   name="github"   half placeholder="github.com/you" />
                <div style={{ gridColumn: 'span 2' }}>
                  <Field label="Professional Summary" name="summary" multiline rows={3}
                    placeholder="Passionate B.Tech CSE student with expertise in full-stack development, seeking opportunities to contribute to innovative products..." />
                </div>
              </div>
            </GlowCard>
          )}

          {/* Education */}
          {activeSection === 'education' && (
            <GlowCard title="Education" accent={CYAN}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <Field label="College / University" name="college" placeholder="XYZ Institute of Technology, Mumbai" />
                </div>
                <Field label="Degree"         name="degree"   half placeholder="B.Tech" />
                <Field label="Branch / Major" name="branch"   half placeholder="Computer Science Engineering" />
                <Field label="CGPA"           name="cgpa"     half placeholder="8.5" />
                <Field label="Graduation Year"name="gradYear" half placeholder="2025" />
              </div>
            </GlowCard>
          )}

          {/* Skills */}
          {activeSection === 'skills' && (
            <GlowCard title="Technical Skills" accent={CYAN}>
              <Field label="Skills (comma separated — each becomes a tag)"
                name="skills" multiline rows={4}
                placeholder="Python, Java, React.js, Node.js, Express, PostgreSQL, MongoDB, Docker, AWS, Git, DSA, System Design, REST APIs, TypeScript..." />
              {data.skills && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Preview Tags</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {data.skills.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                      <span key={i} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, background: 'rgba(0,200,240,0.1)', border: '1px solid rgba(0,200,240,0.25)', color: CYAN }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </GlowCard>
          )}

          {/* Experience */}
          {activeSection === 'experience' && (
            <GlowCard title="Work Experience" accent={CYAN}>
              <div style={{ padding: '10px 14px', marginBottom: 14, background: 'rgba(0,200,240,0.05)', border: '1px solid rgba(0,200,240,0.15)', borderRadius: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                  <strong style={{ color: CYAN }}>Format tip:</strong> Add company/role on its own line, then bullet points starting with • or -<br />
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    Software Intern @ Google (Jun–Aug 2024)<br />
                    • Built REST APIs serving 10K+ daily users<br />
                    • Reduced DB query time by 40%
                  </span>
                </p>
              </div>
              <Field label="Internships & Work Experience" name="experience" multiline rows={8}
                placeholder={'Software Intern @ TechCorp (Jun–Aug 2024)\n• Built REST APIs using Node.js serving 10K+ users\n• Reduced query time by 40% using DB indexing\n• Collaborated in agile team of 8 engineers\n\nResearch Intern @ IIT Mumbai (Dec 2023)\n• Implemented ML model with 92% accuracy\n• Published findings in college symposium'} />
            </GlowCard>
          )}

          {/* Projects */}
          {activeSection === 'projects' && (
            <GlowCard title="Projects" accent={CYAN}>
              <div style={{ padding: '10px 14px', marginBottom: 14, background: 'rgba(0,200,240,0.05)', border: '1px solid rgba(0,200,240,0.15)', borderRadius: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                  <strong style={{ color: CYAN }}>Format tip:</strong> Project name | Tech stack on own line, then bullets<br />
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    CampusReady | React, Node.js, Supabase<br />
                    • Full-stack placement portal for 500+ students<br />
                    • Features: mock interview, DSA judge, resume AI
                  </span>
                </p>
              </div>
              <Field label="Projects" name="projects" multiline rows={8}
                placeholder={'CampusReady | React, Node.js, Supabase\n• Full-stack placement system for 500+ students\n• Built AI mock interview with face detection\n• Integrated online code judge with 10 languages\n\nE-Commerce App | Flutter, Firebase\n• Cross-platform mobile app with 1K+ downloads\n• Real-time order tracking with Google Maps API'} />
            </GlowCard>
          )}

          {/* Extras */}
          {activeSection === 'extras' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <GlowCard title="Certifications" accent={CYAN}>
                <Field label="Certifications (one per line)" name="certifications" multiline rows={4}
                  placeholder={'AWS Certified Cloud Practitioner — Amazon (2024)\nData Structures & Algorithms — Coursera (2023)\nGoogle Analytics Certification (2024)'} />
              </GlowCard>
              <GlowCard title="Achievements & Extras" accent={CYAN}>
                <Field label="Achievements, Awards & Activities (one per line)" name="achievements" multiline rows={4}
                  placeholder={'Smart India Hackathon 2024 — National Finalist\nCodeChef 3-star (Rating: 1750)\nGFG Problem of the Day streak: 120 days\nNSS Volunteer — organized blood donation camp for 200+'} />
              </GlowCard>
            </div>
          )}
        </div>

        {/* Right: Live Preview */}
        {showPreview && (
          <div>
            <div style={{ position: 'sticky', top: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Live Preview — {TEMPLATES.find(t => t.id === template)?.name}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setTemplate(t.id)} title={t.name} style={{
                      width: 24, height: 24, borderRadius: 6, border: `2px solid ${template === t.id ? t.accent : 'rgba(255,255,255,0.1)'}`,
                      background: template === t.id ? `${t.accent}22` : 'transparent', cursor: 'pointer', fontSize: 12,
                    }}>{t.preview}</button>
                  ))}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '80vh', overflowY: 'auto', transform: 'scale(1)', transformOrigin: 'top center' }}>
                <ResumePreview data={data} template={template} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#334155', textAlign: 'center' }}>
                ↑ Live preview (actual PDF may vary slightly in spacing)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const INP = {
  background: '#071525',
  border: '1px solid rgba(0,200,240,0.15)',
  borderRadius: 9,
  padding: '10px 12px',
  fontSize: 13,
  color: '#e2e8f0',
  outline: 'none',
  width: '100%',
  fontFamily: "'Sora',sans-serif",
  boxSizing: 'border-box',
  resize: 'vertical',
};

const BTN2 = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '10px 16px',
  background: 'rgba(0,200,240,0.1)',
  border: '1px solid rgba(0,200,240,0.25)',
  borderRadius: 9,
  color: CYAN,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'Sora',sans-serif",
};