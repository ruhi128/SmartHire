const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const baseDir = 'C:/Users/viraj/.gemini/antigravity/scratch/placement-resources';

const COMPANY_META = {
  'Adobe': { name: 'Adobe', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Adobe_Systems_logo_and_wordmark.svg' },
  'AiDash': { name: 'AiDash', logo: 'https://images.crunchbase.com/image/upload/c_pad,h_170,w_170,f_auto,b_white,q_auto:eco,dpr_1/v1614246830/cv837fquvvh9e3nylfce.png' },
  'American Express': { name: 'American Express', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg' },
  'Atlassian': { name: 'Atlassian', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Atlassian-Logo.svg' },
  'CodeNation': { name: 'CodeNation', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/CodeNation_Logo.png' },
  'Confluent': { name: 'Confluent', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Confluent_logo.svg' },
  'Cult.fit': { name: 'Cult.fit', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Cultfit_logo.svg' },
  'DE Shaw': { name: 'DE Shaw', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/D._E._Shaw_%26_Co._logo.svg' },
  'Dream 11': { name: 'Dream11', logo: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Dream11_Logo.svg' },
  'Eightfold.ai': { name: 'Eightfold.ai', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Eightfold.ai_logo.svg' },
  'Goldman Sachs': { name: 'Goldman Sachs', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Goldman_Sachs.svg' },
  'Google': { name: 'Google', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
  'Graviton': { name: 'Graviton Research Capital', logo: 'https://gravitonresearch.com/wp-content/themes/graviton/assets/images/logo.svg' },
  'Indeed': { name: 'Indeed', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Indeed_logo.svg' },
  'InMobi': { name: 'InMobi', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/07/InMobi_Logo.svg' },
  'ION Group': { name: 'ION Group', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/ION_Trading_logo.svg' },
  'Lambdatest': { name: 'LambdaTest', logo: 'https://www.lambdatest.com/resources/images/logos/logo.svg' },
  'Microsoft': { name: 'Microsoft', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg' },
  'MindTickle': { name: 'MindTickle', logo: 'https://www.mindtickle.com/wp-content/themes/mindtickle/assets/images/mindtickle-logo.svg' },
  'Navi': { name: 'Navi', logo: 'https://navi.com/assets/images/navi-logo.svg' },
  'Observe.ai': { name: 'Observe.ai', logo: 'https://assets-global.website-files.com/5f8ef7a15104d493a77d12f6/5f949c81b5c46d3e34b9cf4f_observe-ai-logo.svg' },
  'Ola Cabs': { name: 'Ola Cabs', logo: 'https://upload.wikimedia.org/wikipedia/en/0/0f/Ola_Cabs_logo.svg' },
  'Rippling': { name: 'Rippling', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Rippling_logo.svg' },
  'Slice': { name: 'Slice', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Slice_Fintech_logo.svg' },
  'Swiggy': { name: 'Swiggy', logo: 'https://upload.wikimedia.org/wikipedia/en/1/12/Swiggy_logo.svg' },
  'ThoughtSpot': { name: 'ThoughtSpot', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Thoughtspot_logo.svg' },
  'Uber': { name: 'Uber', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png' },
  'UI Path': { name: 'UiPath', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/UiPath_Logo.svg' },
  'Visa': { name: 'VISA', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg' },
  'VMware': { name: 'VMware', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Vmware.svg' },
  'Zeta': { name: 'Zeta', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Zeta_Logo.svg' },
  'Zomato': { name: 'Zomato', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Zomato_Logo.svg' }
};

function parseCompanyReadme(companyFolder, rawContent) {
  const content = rawContent.replace(/\r\n/g, '\n');
  const meta = COMPANY_META[companyFolder] || { name: companyFolder.replace(/_/g, ' '), logo: null };

  const qHeaderRegex = /^#{2,3}\s+(\d+)\.\s+([^\n]+)/gm;
  const matches = [...content.matchAll(qHeaderRegex)];
  const questions = [];

  for (let i = 0; i < matches.length; i++) {
    const curMatch = matches[i];
    const qNum = curMatch[1];
    let qTitle = curMatch[2].trim().replace(/\[.*?\]/g, '').trim();
    if (!qTitle || qTitle.length < 2) {
      qTitle = `${meta.name} Problem ${qNum}`;
    }

    const startIndex = curMatch.index + curMatch[0].length;
    const nextStartIndex = (i + 1 < matches.length) ? matches[i + 1].index : content.length;

    let rawBody = content.substring(startIndex, nextStartIndex).trim();
    rawBody = rawBody.replace(/\n\s*---\s*$/, '').trim();

    // Convert github blob image links to raw links for seamless web browser rendering
    rawBody = rawBody.replace(/https:\/\/github\.com\/mrsac7\/placement-resources\/blob\/main\//g, 'https://raw.githubusercontent.com/mrsac7/placement-resources/main/');

    // Check for explicit solution block
    let description = rawBody;
    let explanation = '';

    const solRegex = /(?:#{2,4}\s*Solution[\s\S]*|<details>[\s\S]*<\/details>)/i;
    const solMatch = rawBody.match(solRegex);
    if (solMatch) {
      explanation = solMatch[0].trim();
      description = rawBody.substring(0, solMatch.index).trim();
    } else {
      explanation = `Official OA problem from ${meta.name} campus recruitment drive. Key concepts: optimal time & space complexity, edge-case analysis, and algorithmic correctness.`;
    }

    questions.push({
      ordering: i,
      title: `Question ${qNum}: ${qTitle}`,
      description: description, // Copied directly as it is
      explanation: explanation, // Official solution code and editorial
      marks: 25,
      type: 'text',
      section: 'Coding & Problem Solving'
    });
  }

  const duration = questions.length <= 2 ? 60 : questions.length === 3 ? 90 : 100;
  const cleanTitle = `${meta.name} Campus OA`;

  return {
    meta,
    cleanTitle,
    duration,
    type: 'technical',
    sections: ['Coding & Problem Solving'],
    totalMarks: questions.length * 25,
    questions
  };
}

async function getOrCreateCompany(companyMeta) {
  const { data: existing } = await supabase
    .from('companies')
    .select('id, name, logo_url')
    .ilike('name', companyMeta.name);

  if (existing && existing.length > 0) {
    if (!existing[0].logo_url && companyMeta.logo) {
      await supabase
        .from('companies')
        .update({ logo_url: companyMeta.logo })
        .eq('id', existing[0].id);
    }
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

async function seed() {
  console.log('--- Starting Extraction and Seeding from mrsac7/placement-resources ---');
  if (!fs.existsSync(baseDir)) {
    console.error('Base dir not found:', baseDir);
    process.exit(1);
  }

  const companyFolders = fs.readdirSync(baseDir).filter(f => !f.startsWith('.') && fs.statSync(path.join(baseDir, f)).isDirectory());
  const allTests = [];

  for (const comp of companyFolders) {
    const readmePath = path.join(baseDir, comp, 'README.md');
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, 'utf8');
      const test = parseCompanyReadme(comp, content);
      if (test.questions.length > 0) {
        allTests.push(test);
      }
    }
  }

  const totalQuestions = allTests.reduce((s, t) => s + t.questions.length, 0);
  console.log(`Parsed ${allTests.length} tests with ${totalQuestions} questions directly as is.\n`);

  let testsInserted = 0;
  let questionsInserted = 0;

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
        console.log(`Updating test: ${t.cleanTitle} (${testId})`);
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
        console.log(`Created test: ${t.cleanTitle} (${testId})`);
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
        console.error(`  ✗ Error inserting questions for ${t.cleanTitle}:`, qErr);
      } else {
        console.log(`  ✓ Inserted ${qRows.length} questions for ${t.cleanTitle}`);
        testsInserted++;
        questionsInserted += qRows.length;
      }
    } catch (err) {
      console.error(`Failed to process test ${t.cleanTitle}:`, err.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`Seeding Summary:`);
  console.log(`Tests Seeded/Updated: ${testsInserted}`);
  console.log(`Questions Seeded: ${questionsInserted}`);
  console.log(`========================================\n`);
}

seed();
