const STOP_WORDS = new Set('the a an in on at for with and or to of is are was were be been have has will would should can this that they you we it as by from but not our your their its also more than about into through during before after above below between each such when while including across under within without per via able must shall etc using used use plus well both all'.split(' '));
const SKILLS = [
  'python','java','javascript','typescript','c++','c#','golang','rust','ruby','php','swift','kotlin','sql','html','css','scala','dart','bash','shell',
  'react','angular','vue','next.js','node.js','express','spring boot','spring','django','flask','fastapi','tailwind','bootstrap','redux','pytorch','tensorflow','pandas','numpy','scikit','graphql',
  'aws','azure','gcp','docker','kubernetes','jenkins','git','github','gitlab','linux','ci/cd','terraform','postgresql','mongodb','redis','mysql','sqlite','kafka','firebase','supabase',
  'system design','microservices','rest api','restful api','data structures','algorithms','agile','scrum','unit testing','test driven development','cloud computing','machine learning','deep learning','object oriented programming','full stack','devops','api integration','database management'
];
const TECH_PHRASES = ['machine learning','data structures','system design','rest api','restful api','node.js','react.js','spring boot','deep learning','natural language processing','version control','agile methodology','ci/cd','microservices','cloud computing','object oriented programming','artificial intelligence','data analysis','full stack','front end','back end','devops','unit testing','test driven development','continuous integration','continuous deployment','software development','web development','mobile development','database management','api integration','problem solving','distributed systems','performance optimization'];
const VERBS = ['developed','engineered','architected','built','designed','implemented','created','managed','led','improved','optimized','reduced','increased','deployed','collaborated','delivered','automated','integrated','scaled','refactored','launched','spearheaded','orchestrated','mentored','resolved'];
const WEAK = ['responsible for','helped with','worked on','assisted in','handled','participated in','tasked with'];
export const SAMPLE_JD = `Job Title: Full Stack Software Engineer\nExperience Level: Fresher to 2 years\n\nRequired Skills: JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, MongoDB, Docker, Git, REST API, Microservices, System Design, Unit Testing, AWS, CI/CD.\n\nResponsibilities: Develop responsive web applications, scalable RESTful APIs, automated CI/CD pipelines, and comprehensive test suites in an Agile environment.`;
function found(value, text) { const escaped = value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); const boundary = /[+#/.]/.test(value) ? '(^|[^a-zA-Z0-9])' + escaped + '([^a-zA-Z0-9]|$)' : '\\b' + escaped + '\\b'; return new RegExp(boundary, 'i').test(text); }
function tokens(text) { return text.toLowerCase().replace(/[^\w\s+#.-]/g, ' ').split(/\s+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word)); }
export function analyzeAts(resumeText, jobDescription) {
  const resume = resumeText || ''; const jd = jobDescription || ''; const lowResume = resume.toLowerCase(); const lowJd = jd.toLowerCase();
  const jdSkills = SKILLS.filter((skill) => found(skill, lowJd)); const matchedSkills = jdSkills.filter((skill) => found(skill, lowResume)); const missingSkills = jdSkills.filter((skill) => !found(skill, lowResume));
  const techScore = jdSkills.length ? (matchedSkills.length / jdSkills.length) * 35 : 25;
  const metrics = resume.match(/(\d+(?:\.\d+)?%|\d+x|\$\d+[\d,kmb]*|\b\d{2,}\+?\s*(?:users|clients|requests|ms|seconds|million|thousand|tb|gb|records|downloads|dollars)\b)/gi) || [];
  const impactScore = Math.min(15, 3 + metrics.length * 3);
  const usedVerbs = VERBS.filter((verb) => lowResume.includes(verb)); const weakPhrases = WEAK.filter((phrase) => lowResume.includes(phrase));
  const verbScore = Math.max(3, Math.min(15, Math.round((usedVerbs.length / 8) * 15)) - weakPhrases.length * 2);
  const jdPhrases = TECH_PHRASES.filter((phrase) => found(phrase, lowJd)); const matchedPhrases = jdPhrases.filter((phrase) => found(phrase, lowResume)); const missingPhrases = jdPhrases.filter((phrase) => !found(phrase, lowResume));
  const phraseScore = jdPhrases.length ? (matchedPhrases.length / jdPhrases.length) * 15 : 10;
  const jdTokens = [...new Set(tokens(jd))]; const resumeTokens = tokens(resume); const matches = jdTokens.filter((token) => resumeTokens.includes(token)); const missingKeywords = jdTokens.filter((token) => !resumeTokens.includes(token) && token.length > 3).slice(0, 25); const keywordScore = jdTokens.length ? (matches.length / jdTokens.length) * 10 : 6;
  const sections = { Contact: /email|phone|linkedin|github|@|\+91|\+1/i.test(resume), Summary: /summary|objective|about me|professional profile/i.test(resume), Education: /education|degree|university|college|bachelor|master|b\.tech|m\.tech|b\.e|cgpa|gpa/i.test(resume), Experience: /experience|internship|employment|work history/i.test(resume), Skills: /skills|technologies|technical stack|tools|proficiencies/i.test(resume), Projects: /project|github\.com|portfolio/i.test(resume), Certifications: /certification|certificate|certified|coursera|udemy|aws certified|license/i.test(resume) };
  const structuralScore = Math.min(10, Math.round((Object.values(sections).filter(Boolean).length / 7) * 10));
  const score = Math.min(100, Math.max(0, Math.round(techScore + impactScore + verbScore + phraseScore + keywordScore + structuralScore)));
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : score >= 40 ? 'D' : 'F';
  const breakdown = [
    { label: 'Core technical skills', score: Math.round(techScore), max: 35, detail: `${matchedSkills.length}/${jdSkills.length} requested skills matched`, color: '#4F46E5' },
    { label: 'Quantifiable impact', score: impactScore, max: 15, detail: `${metrics.length} metrics detected`, color: '#16A34A' },
    { label: 'Power verbs', score: verbScore, max: 15, detail: `${usedVerbs.length} active verbs; ${weakPhrases.length} weak phrases`, color: '#0891B2' },
    { label: 'Technical phrases', score: Math.round(phraseScore), max: 15, detail: `${matchedPhrases.length}/${jdPhrases.length} phrases matched`, color: '#2563EB' },
    { label: 'JD keyword overlap', score: Math.round(keywordScore), max: 10, detail: `${matches.length}/${jdTokens.length} unique keywords found`, color: '#7C3AED' },
    { label: 'Section structure', score: structuralScore, max: 10, detail: `${Object.values(sections).filter(Boolean).length}/7 standard sections found`, color: '#D97706' },
  ];
  return { score, grade, missingSkills: [...new Set(missingSkills)], matchedSkills, missingKeywords, missingPhrases, weakPhrases, metrics, sections, breakdown, wordCount: tokens(resume).length };
}
