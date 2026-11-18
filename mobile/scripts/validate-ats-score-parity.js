#!/usr/bin/env node
// Run the existing website ATS scoring function (read-only, no UI build) and
// compare its score/skills/keywords to the app on identical extracted text.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function main() {
  const web = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/pages/student/ATSScoring.jsx'), 'utf8');
  const start = web.indexOf('const CYAN ');
  const end = web.indexOf('//  PDF TEXT EXTRACTOR', start);
  assert(start >= 0 && end > start, 'Website ATS engine could not be isolated for comparison.');
  const sandbox = { module: { exports: null } };
  vm.runInNewContext(`${web.slice(start, end)}\nmodule.exports = analyzeATS;`, sandbox);
  const analyzeWebsite = sandbox.module.exports;
  const appSource = fs.readFileSync(path.resolve(__dirname, '../src/utils/atsAnalysis.js'), 'utf8');
  const { analyzeAts, SAMPLE_JD } = await import(`data:text/javascript;base64,${Buffer.from(appSource).toString('base64')}`);

  const cases = [
    [
      `NAME A B\nEmail: a@b.com\nSUMMARY\nI developed React and Node.js projects with SQL and Python, Docker and Git.\nEDUCATION university B.Tech\nEXPERIENCE internship led a migration that improved throughput by 20% for 100 users.\nTECHNICAL SKILLS JavaScript, TypeScript, CI/CD\nPROJECTS API integration REST API and microservices\nCERTIFICATIONS AWS Certified`,
      SAMPLE_JD,
    ],
    ['B.Tech student with Python skills and a data science project. 12 months internship.', 'Python, SQL, JavaScript, R, and machine learning for entry-level engineer.'],
    ['Jane Doe\nEmail jane@example.com\nEducation college 2025\nExperience responsible for managed tasks on 42 users\nSkills JavaScript, React, Docker\nProjects data pipeline', 'JavaScript developer. React, R, AWS, Docker and database. Good software development experience.'],
  ];
  for (const [resume, jd] of cases) {
    const browser = analyzeWebsite(resume, jd);
    const phone = analyzeAts(resume, jd);
    assert.equal(phone.score, browser.score);
    assert.equal(phone.grade, browser.grade);
    assert.equal(phone.wordCount, browser.wordCount);
    assert.deepEqual(phone.breakdown.map((item) => item.score), Array.from(browser.breakdown, (item) => item.score));
    assert.deepEqual(phone.matchedSkills, Array.from(browser.matchedSkillsList));
    assert.deepEqual(phone.missingSkills, Array.from(browser.missingSkillsList));
    assert.deepEqual(phone.missingKeywords, Array.from(browser.missingKeywords));
  }
  console.log('App ATS score/skill/keyword calculations match the website on shared text: PASS');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
