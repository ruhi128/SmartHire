const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const baseDir = 'C:/Users/viraj/.gemini/antigravity/scratch/PLACEMENT-QUESTIONS';

const COMPANY_META = {
  'Amazon': { name: 'Amazon', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
  'Apple': { name: 'Apple', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
  'AthenaHealth': { name: 'AthenaHealth', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Athenahealth_logo.svg' },
  'Citi_India': { name: 'Citi Bank', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Citi.svg' },
  'Goldman_Sachs': { name: 'Goldman Sachs', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Goldman_Sachs.svg' },
  'IDFC': { name: 'IDFC FIRST Bank', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/52/IDFC_First_Bank_logo.svg' },
  'NCR Voyix': { name: 'NCR Voyix', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/57/NCR_Voyix_logo.svg' },
  'Netradyne': { name: 'Netradyne', logo: 'https://www.netradyne.com/wp-content/themes/netradyne/assets/images/logo.svg' },
  'NVIDIA': { name: 'NVIDIA', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg' },
  'Optum': { name: 'Optum', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Optum_logo.svg' },
  'Oracle': { name: 'Oracle', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg' },
  'Samsung': { name: 'Samsung', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
  'SAP_Labs': { name: 'SAP Labs', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/59/SAP_2011_logo.svg' },
  'Tekion': { name: 'Tekion', logo: 'https://tekion.com/assets/images/tekion-logo.svg' },
  'Verizon': { name: 'Verizon', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Verizon_2024.svg' },
  'Versa_network': { name: 'Versa Networks', logo: 'https://versa-networks.com/wp-content/uploads/2021/04/versa-networks-logo.svg' },
  'VISA': { name: 'VISA', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg' },
  'Wells_Fargo': { name: 'Wells Fargo', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Wells_Fargo_Bank.svg' },
  'WEX_FinTech': { name: 'WEX', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/07/WEX_Inc._logo.svg' },
};

function parseBlog(companyFolder, fileName, rawContent) {
  const content = rawContent.replace(/\r\n/g, '\n');
  const meta = COMPANY_META[companyFolder] || { name: companyFolder.replace(/_/g, ' '), logo: null };

  const yearMatch = content.match(/\*\*Year:\*\*\s*(\d+)/i);
  const typeMatch = content.match(/\*\*Type:\*\*\s*([^\n*]+)/i);
  const roleMatch = content.match(/\*\*Role:\*\*\s*([^\n*]+)/i);

  const year = yearMatch ? yearMatch[1].trim() : '2025';
  const role = roleMatch ? roleMatch[1].replace(/[\*_]/g, '').trim() : 'SDE';
  const testCategory = (typeMatch && /aptitude/i.test(typeMatch[1])) ? 'aptitude' : 'technical';

  // Duration
  let duration = 60;
  const durationMatch = content.match(/(\d+(?:\.\d+)?)\s*(hrs?|hours?|mins?|minutes?)/i);
  if (durationMatch) {
    const val = parseFloat(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith('hr') || unit.startsWith('hour')) {
      duration = Math.round(val * 60);
    } else {
      duration = Math.round(val);
    }
  }

  let blogNum = '';
  const bMatch = fileName.match(/(\d+)/);
  if (bMatch) blogNum = ` — Set ${bMatch[1]}`;
  const cleanTitle = `${meta.name} ${year} ${role} OA${blogNum}`;

  // Global Solution / Thought process
  let globalSolution = '';
  const solMatch = content.match(/(?:###?\s*(?:Thought Process|Solution[s]?)|---\s*###?\s*Solution)[\s\S]*$/i);
  if (solMatch) {
    globalSolution = solMatch[0].trim();
  }

  // Parse questions directly as is
  const qRegex = /#{2,3}\s+Question\s*(\d+)?[\s:–—\-]*([^\n]*)\n([\s\S]*?)(?=\n#{2,3}\s+Question|\n#{2,3}\s+Thought Process|\n#{2,3}\s+Solution|\n---\s*#{2,3}\s+Thought Process|\n---\s*#{2,3}\s+Solution|$)/gi;

  const questions = [];
  let match;
  let qIndex = 0;

  while ((match = qRegex.exec(content)) !== null) {
    qIndex++;
    const qNum = match[1] || String(qIndex);
    let title = (match[2] || '').replace(/[\*_:–-]/g, '').trim();
    const body = match[3].trim();

    if (!title || title.toLowerCase().includes('question title') || title.length < 2) {
      title = `${meta.name} Problem ${qNum}`;
    }

    // Try finding specific solution for this question
    let specificSolution = '';
    if (globalSolution) {
      const qSolRegex = new RegExp(`(?:For\\s+(?:the\\s+)?(?:question|q)\\s*${qNum}|Question\\s*${qNum})[\\s\\S]*?(?=(?:For\\s+(?:the\\s+)?(?:question|q)\\s*\\d+|Question\\s*\\d+)|$)`, 'i');
      const qSolMatch = globalSolution.match(qSolRegex);
      if (qSolMatch) {
        specificSolution = qSolMatch[0].trim();
      } else {
        specificSolution = globalSolution;
      }
    }

    questions.push({
      ordering: qIndex - 1,
      title: `Question ${qNum}: ${title}`,
      description: body, // copied directly as it is
      explanation: specificSolution || 'No solution provided in source blog.',
      marks: 25,
      type: 'text',
      section: 'Coding & Assessment'
    });
  }

  return {
    meta,
    cleanTitle,
    duration,
    type: testCategory,
    sections: ['Coding & Assessment'],
    totalMarks: questions.length * 25 || 100,
    questions
  };
}

async function getOrCreateCompany(companyMeta) {
  const { data: existing } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', companyMeta.name);

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  const { data: inserted, error } = await supabase
    .from('companies')
    .insert({
      name: companyMeta.name,
      logo_url: companyMeta.logo
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error inserting company:', companyMeta.name, error);
    throw error;
  }
  return inserted.id;
}

const crypto = require('crypto');

async function seed() {
  console.log('--- Starting Extraction and Seeding to Supabase ---');
  if (!fs.existsSync(baseDir)) {
    console.error('Base dir not found:', baseDir);
    process.exit(1);
  }

  const companies = fs.readdirSync(baseDir).filter(f => !f.startsWith('.') && fs.statSync(path.join(baseDir, f)).isDirectory());
  const allTests = [];

  for (const comp of companies) {
    const compDir = path.join(baseDir, comp);
    const files = fs.readdirSync(compDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(compDir, f), 'utf8');
      const test = parseBlog(comp, f, content);
      if (test.questions.length > 0) {
        allTests.push(test);
      }
    }
  }

  console.log(`Parsed ${allTests.length} tests with ${allTests.reduce((s, t) => s + t.questions.length, 0)} questions directly as is.`);

  for (const t of allTests) {
    try {
      const companyId = await getOrCreateCompany(t.meta);

      // Check if test already exists with this title
      const { data: existingTests } = await supabase
        .from('mock_oa_tests')
        .select('id')
        .eq('title', t.cleanTitle);

      let testId;
      if (existingTests && existingTests.length > 0) {
        testId = existingTests[0].id;
        console.log(`Updating existing test: ${t.cleanTitle} (${testId})`);
        await supabase
          .from('mock_oa_tests')
          .update({
            company_id: companyId,
            type: t.type,
            duration: t.duration,
            total_marks: t.totalMarks,
            sections: t.sections,
            status: 'approved'
          })
          .eq('id', testId);

        // Delete old questions to re-seed fresh directly as is
        await supabase
          .from('mock_oa_questions')
          .delete()
          .eq('test_id', testId);
      } else {
        const { data: newTest, error: tErr } = await supabase
          .from('mock_oa_tests')
          .insert({
            company_id: companyId,
            title: t.cleanTitle,
            type: t.type,
            duration: t.duration,
            total_marks: t.totalMarks,
            sections: t.sections,
            status: 'approved'
          })
          .select('id')
          .single();

        if (tErr) throw tErr;
        testId = newTest.id;
        console.log(`Created new test: ${t.cleanTitle} (${testId})`);
      }

      // Insert questions directly as is
      const qRows = t.questions.map(q => ({
        id: crypto.randomUUID(),
        test_id: testId,
        question_text: q.title,
        description: q.description,
        explanation: q.explanation,
        marks: q.marks,
        ordering: q.ordering,
        type: q.type,
        section: q.section,
        options: []
      }));

      const { error: qErr } = await supabase
        .from('mock_oa_questions')
        .insert(qRows);

      if (qErr) {
        console.error(`Error inserting questions for ${t.cleanTitle}:`, qErr);
      } else {
        console.log(`  ✓ Inserted ${qRows.length} questions for ${t.cleanTitle}`);
      }
    } catch (err) {
      console.error(`Failed to process test ${t.cleanTitle}:`, err.message);
    }
  }

  console.log('\n--- Seeding Completed Successfully! ---');
}

seed();
