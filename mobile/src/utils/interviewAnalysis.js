// Shared, transparent typed-practice scoring used by the native mock
// interview. These are the same prompt and text heuristics used by the web
// mock-interview flow; this module deliberately does not make camera, audio,
// identity, emotion, or hiring inferences.
export const INTERVIEW_QUESTIONS = [
  'Tell me about yourself and your technical background.',
  'What is your strongest programming language and why?',
  'Explain a challenging project you worked on. What was your role?',
  'How do you approach debugging a complex bug in production?',
  'Where do you see yourself in 5 years?',
];

const keywordMap = [
  ['background', 'experience', 'skills', 'studied', 'worked', 'project', 'language', 'framework', 'degree', 'college', 'engineering', 'develop', 'build', 'learn'],
  ['language', 'python', 'java', 'javascript', 'c++', 'typescript', 'proficient', 'experience', 'prefer', 'because', 'performance', 'syntax', 'ecosystem', 'library'],
  ['project', 'team', 'role', 'challenge', 'built', 'developed', 'designed', 'architecture', 'problem', 'solution', 'contributed', 'led', 'managed', 'feature', 'deadline'],
  ['debug', 'log', 'reproduce', 'isolate', 'stack', 'breakpoint', 'test', 'monitor', 'trace', 'error', 'exception', 'fix', 'root cause', 'systematic', 'tools'],
  ['goal', 'career', 'grow', 'lead', 'architect', 'contribute', 'learn', 'team', 'company', 'impact', 'senior', 'specialize', 'skill', 'future', 'years', 'plan'],
];

const fillerPhrases = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'so uh', 'well uh', 'i mean'];
const uncertainPhrases = ['i think', 'i guess', 'maybe', 'perhaps', 'not sure', "i don't know", 'kind of', 'sort of', 'probably', 'might be', 'i suppose'];
const confidentPhrases = ['i have', 'i built', 'i led', 'i designed', 'i implemented', 'i achieved', 'i know', 'i am', 'i will', 'i can', 'i created', 'i managed', 'i developed'];

/**
 * Scores only the content a learner typed for one prompt. It is feedback for
 * practice, not an evaluation of speech, a person, or employment suitability.
 */
export function analyzeInterviewAnswer(question, answer) {
  const text = String(answer || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter((item) => item.trim().length > 3);
  const lower = text.toLowerCase();
  const promptIndex = INTERVIEW_QUESTIONS.indexOf(question);
  const keywords = keywordMap[promptIndex] || [];
  const matchedKeywords = keywords.filter((keyword) => lower.includes(keyword)).length;

  let lengthScore = 0;
  if (wordCount === 0) lengthScore = 0;
  else if (wordCount < 10) lengthScore = 15;
  else if (wordCount < 30) lengthScore = 40;
  else if (wordCount < 50) lengthScore = 60;
  else if (wordCount <= 200) lengthScore = 100;
  else lengthScore = Math.max(60, 100 - (wordCount - 200) * 0.2);

  const relevanceScore = keywords.length
    ? Math.min(100, Math.round((matchedKeywords / Math.min(keywords.length, 6)) * 100))
    : 50;
  const fillerCount = fillerPhrases.reduce((total, phrase) => total + (lower.split(phrase).length - 1), 0);
  const fluencyScore = Math.max(0, Math.round(100 - (wordCount ? fillerCount / wordCount : 0) * 300));
  const structureScore = (
    (/^(i |my |the |so |well |to |first|let me)/i.test(text) ? 30 : 0)
    + (/\b(because|however|therefore|also|additionally|furthermore|finally|in conclusion|overall|for example|specifically|in particular|as a result)\b/i.test(text) ? 40 : 0)
    + (sentences.length >= 3 ? 30 : 0)
  );
  const uncertainCount = uncertainPhrases.reduce((total, phrase) => total + (lower.includes(phrase) ? 1 : 0), 0);
  const confidentCount = confidentPhrases.reduce((total, phrase) => total + (lower.includes(phrase) ? 1 : 0), 0);
  const confidenceScore = wordCount === 0
    ? 0
    : Math.min(100, Math.max(0, 50 + confidentCount * 15 - uncertainCount * 10));

  return {
    lengthScore: Math.round(lengthScore),
    relevanceScore,
    fluencyScore,
    structureScore,
    confidenceScore,
    wordCount,
  };
}

export function scoreInterview(transcript = []) {
  const analyses = transcript.map((item) => analyzeInterviewAnswer(item.question, item.answer));
  const average = (key) => Math.round(analyses.reduce((sum, analysis) => sum + analysis[key], 0) / Math.max(analyses.length, 1));
  const content = Math.round((average('lengthScore') + average('relevanceScore')) / 2);
  const fluency = average('fluencyScore');
  const confidence = average('confidenceScore');
  const structure = average('structureScore');
  const relevance = average('relevanceScore');
  const overall = Math.round(relevance * 0.35 + content * 0.25 + confidence * 0.25 + fluency * 0.15);
  const averageWords = Math.round(analyses.reduce((sum, analysis) => sum + analysis.wordCount, 0) / Math.max(analyses.length, 1));

  const strengths = [];
  const improvements = [];
  const tips = [];
  if (relevance >= 70) strengths.push('Your answers used relevant role and technical language.');
  if (confidence >= 70) strengths.push('Your wording was generally direct and assertive.');
  if (fluency >= 70) strengths.push('Few filler expressions were detected in your typed answers.');
  if (structure >= 70) strengths.push('Your answers show clear connective structure.');
  if (content >= 70) strengths.push('Your answers included useful detail.');
  if (relevance < 50) improvements.push('Answer the exact question and anchor examples in relevant skills or outcomes.');
  if (confidence < 50) improvements.push('Use precise ownership language such as “I built” or “I implemented” where truthful.');
  if (fluency < 50) improvements.push('Remove filler language and use shorter, purposeful sentences.');
  if (structure < 50) improvements.push('Try a Situation–Action–Result structure for each example.');
  if (content < 50) improvements.push('Include a specific example; aim for approximately 60–120 words when appropriate.');
  if (averageWords < 20) tips.push(`Your average answer was about ${averageWords} words; practise expanding with a concrete example.`);
  if (averageWords > 200) tips.push('Try to make answers more focused; concise, structured answers are easier to follow.');
  if (averageWords >= 60 && averageWords <= 150) tips.push(`Your average answer length of about ${averageWords} words is a useful range for practice.`);
  if (!strengths.length) strengths.push('You completed a full set of practice questions.');
  if (!improvements.length) improvements.push('Keep practising with role-specific examples and truthful outcomes.');

  return {
    overall,
    content,
    fluency,
    confidence,
    structure,
    relevance,
    averageWords,
    feedback: { strengths, improvements, tips },
    analyses,
  };
}
