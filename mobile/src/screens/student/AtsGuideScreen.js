import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { AppButton, Badge, Card, SectionTitle } from '../../components/Ui';
import { colors, spacing } from '../../constants/theme';
import { analyzeAts, SAMPLE_JD } from '../../utils/atsAnalysis';
import { buildAtsResumeHtml, createAndSharePdf, resumeThemes } from '../../utils/documentExport';

const SAMPLE_JDS = [
  { id: 'full-stack', label: 'Full stack', text: SAMPLE_JD },
  {
    id: 'data',
    label: 'Data / ML',
    text: 'Job Title: Junior Machine Learning Engineer\n\nRequired Skills: Python, SQL, Pandas, NumPy, Scikit-Learn, PyTorch, TensorFlow, Machine Learning, Deep Learning, Docker, AWS, Git, REST API.\n\nResponsibilities: Build and evaluate machine-learning pipelines, prepare data, document experiments, collaborate with product teams, and deploy reliable services.',
  },
  {
    id: 'cloud',
    label: 'Cloud / DevOps',
    text: 'Job Title: Cloud and DevOps Engineer\n\nRequired Skills: Linux, Bash, Docker, Kubernetes, AWS, Terraform, CI/CD, Jenkins, Git, PostgreSQL, Redis, Python, System Design.\n\nResponsibilities: Build automated deployment pipelines, support containerized services, improve observability, and collaborate on resilient cloud infrastructure.',
  },
];

const WEAK_REPLACEMENTS = {
  'responsible for': 'led',
  'helped with': 'contributed to',
  'worked on': 'developed',
  'assisted in': 'contributed to',
  handled: 'managed',
  'participated in': 'contributed to',
  'tasked with': 'delivered',
};

const SECTION_TEMPLATES = {
  Contact: '\n\nCONTACT\n[Add your email, phone, LinkedIn, and GitHub links]\n',
  Summary: '\n\nPROFESSIONAL SUMMARY\n[Add a concise, truthful summary of your strengths and career direction.]\n',
  Education: '\n\nEDUCATION\n[Add degree, institution, graduation year, and CGPA if appropriate.]\n',
  Experience: '\n\nEXPERIENCE\n[Add internships, work experience, or relevant responsibilities with truthful outcomes.]\n',
  Skills: '\n\nTECHNICAL SKILLS\n[Add tools, languages, and technologies you can genuinely discuss.]\n',
  Projects: '\n\nPROJECTS\n[Project name] — [technology stack]\n• [Describe a truthful contribution and outcome.]\n',
  Certifications: '\n\nCERTIFICATIONS\n[Add completed certifications, courses, or credentials.]\n',
};

function tokenPresent(text, token) {
  const escaped = String(token).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const boundary = /[+#/.]/.test(token)
    ? `(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`
    : `\\b${escaped}\\b`;
  return new RegExp(boundary, 'i').test(text);
}

function insertSkill(resume, skill) {
  if (tokenPresent(resume, skill)) return resume;
  const heading = /(?:technical\s+|core\s+)?skills\s*:?/i;
  const match = heading.exec(resume);
  if (!match) return `${resume.trim()}\n\nTECHNICAL SKILLS\n${skill}`.trim();
  const insertAt = match.index + match[0].length;
  const after = resume.slice(insertAt);
  const separator = after.startsWith('\n') || !after.trim() ? '\n' : ' ';
  return `${resume.slice(0, insertAt)}${separator}${skill},${after}`;
}

function insertProjectBullet(resume, bullet) {
  const heading = /(?:featured\s+)?projects\s*:?/i;
  const match = heading.exec(resume);
  if (!match) return `${resume.trim()}\n\nPROJECTS\n• ${bullet}`.trim();
  const insertAt = match.index + match[0].length;
  return `${resume.slice(0, insertAt)}\n• ${bullet}${resume.slice(insertAt)}`;
}

function suggestedBullets(result) {
  const missing = new Set(result?.missingSkills || []);
  const bullets = [];
  if (missing.has('docker') || missing.has('kubernetes')) bullets.push('Containerized [your project or service] with Docker to make development and deployment more repeatable.');
  if (missing.has('ci/cd') || missing.has('jenkins')) bullets.push('Built an automated CI/CD workflow for [your project], replacing manual release steps with repeatable checks.');
  if (missing.has('redis') || missing.has('postgresql') || missing.has('mongodb')) bullets.push('Improved [your project] data access by designing and evaluating an appropriate storage or caching approach.');
  if (missing.has('rest api') || missing.has('microservices') || missing.has('system design')) bullets.push('Designed and documented REST API endpoints for [your project], including validation and clear error handling.');
  if (missing.has('unit testing') || missing.has('test driven development')) bullets.push('Added focused tests for [your project] to verify important behavior before release.');
  if (missing.has('machine learning') || missing.has('pytorch') || missing.has('tensorflow')) bullets.push('Evaluated a machine-learning workflow for [your dataset or project] and documented the method and result.');
  if (!bullets.length) bullets.push('Built [project name] with [technologies], focusing on a specific user problem and a truthful, measurable outcome.');
  return bullets.slice(0, 3);
}

export default function AtsGuideScreen({ navigation }) {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [originalResume, setOriginalResume] = useState('');
  const [template, setTemplate] = useState('classic');
  const [exporting, setExporting] = useState(false);

  const analyze = () => {
    if (resume.trim().length < 40 || jobDescription.trim().length < 40) {
      Alert.alert('Add more detail', 'Paste your resume content and a job description before analysing.');
      return;
    }
    if (!originalResume) setOriginalResume(resume);
    setResult(analyzeAts(resume, jobDescription));
  };

  const changeResume = (next, { recalculate = false } = {}) => {
    setResume(next);
    if (recalculate && jobDescription.trim().length >= 40) setResult(analyzeAts(next, jobDescription));
    else if (!recalculate) setResult(null);
  };

  const applySkill = (skill) => changeResume(insertSkill(resume, skill), { recalculate: true });

  const applyAllSkills = () => {
    if (!result?.missingSkills?.length) return;
    const next = result.missingSkills.reduce((draft, skill) => insertSkill(draft, skill), resume);
    changeResume(next, { recalculate: true });
  };

  const replaceWeakPhrase = (phrase) => {
    const replacement = WEAK_REPLACEMENTS[phrase] || 'improved';
    const expression = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    changeResume(resume.replace(expression, replacement), { recalculate: true });
  };

  const addMissingSection = (name) => {
    const templateText = SECTION_TEMPLATES[name];
    if (!templateText) return;
    changeResume(`${resume.trim()}${templateText}`, { recalculate: true });
  };

  const addBullet = (bullet) => changeResume(insertProjectBullet(resume, bullet), { recalculate: true });

  const reset = () => {
    if (!originalResume) return;
    Alert.alert('Restore original resume text?', 'This removes local ATS edits made since the first analysis.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', style: 'destructive', onPress: () => changeResume(originalResume, { recalculate: true }) },
    ]);
  };

  const exportPdf = async () => {
    if (!resume.trim()) {
      Alert.alert('Resume text required', 'Add your resume text before creating a PDF.');
      return;
    }
    setExporting(true);
    try {
      await createAndSharePdf(buildAtsResumeHtml(resume, template), 'Share ATS-tailored resume PDF');
    } catch (error) {
      Alert.alert('Could not export PDF', error?.message || 'Please try again on an Android or iOS device.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <AppHeader navigation={navigation} title="ATS Resume Guide" />
      <Screen>
        <Text style={styles.intro}>Compare editable resume text with a job description, tailor it deliberately, then create a native PDF to share. Keep every change truthful and verifiable.</Text>

        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.label}>Resume text</Text>
            {resume ? <Pressable accessibilityRole="button" onPress={() => changeResume('')}><Text style={styles.clear}>Clear</Text></Pressable> : null}
          </View>
          <TextInput
            value={resume}
            onChangeText={(value) => changeResume(value)}
            multiline
            textAlignVertical="top"
            style={styles.editor}
            placeholder="Paste the text of your resume here…"
            placeholderTextColor="#94A3B8"
          />
          <Text style={styles.hint}>For existing PDFs, open the file from Profile and paste the text you want to improve. Mobile PDF text extraction is intentionally not performed on-device.</Text>
        </Card>

        <Card style={styles.space}>
          <View style={styles.cardHeader}><Text style={styles.label}>Job description</Text><Text style={styles.wordCount}>{jobDescription.trim() ? `${jobDescription.trim().split(/\s+/).length} words` : ''}</Text></View>
          <View style={styles.samples}>
            {SAMPLE_JDS.map((sample) => (
              <Pressable key={sample.id} accessibilityRole="button" onPress={() => { setJobDescription(sample.text); setResult(null); }} style={({ pressed }) => [styles.sampleChip, pressed && styles.pressed]}>
                <Text style={styles.sampleText}>{sample.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={jobDescription}
            onChangeText={(value) => { setJobDescription(value); setResult(null); }}
            multiline
            textAlignVertical="top"
            style={styles.editor}
            placeholder="Paste a job description or campus-drive specification…"
            placeholderTextColor="#94A3B8"
          />
        </Card>

        <AppButton title="Analyse compatibility" onPress={analyze} />
        {result ? (
          <Analysis
            result={result}
            originalScore={originalResume ? analyzeAts(originalResume, jobDescription).score : null}
            onApplySkill={applySkill}
            onApplyAll={applyAllSkills}
            onReplaceWeak={replaceWeakPhrase}
            onAddSection={addMissingSection}
            onAddBullet={addBullet}
            onReset={reset}
            template={template}
            onTemplateChange={setTemplate}
            onExport={exportPdf}
            exporting={exporting}
          />
        ) : null}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>This is an on-device keyword and structure heuristic. It is not an employer ATS, a selection prediction, or a hiring decision. Suggestions add editable wording only; do not claim skills or outcomes you cannot substantiate.</Text>
        </View>
      </Screen>
    </>
  );
}

function Analysis({ result, originalScore, onApplySkill, onApplyAll, onReplaceWeak, onAddSection, onAddBullet, onReset, template, onTemplateChange, onExport, exporting }) {
  const missingSections = Object.entries(result.sections || {}).filter(([, available]) => !available).map(([name]) => name);
  const bullets = useMemo(() => suggestedBullets(result), [result]);
  const scoreTone = result.score >= 80 ? colors.success : result.score >= 60 ? colors.warning : colors.danger;
  const scoreDelta = originalScore === null || originalScore === undefined ? null : result.score - originalScore;

  return (
    <View style={styles.results}>
      <Card style={[styles.scoreCard, { borderColor: scoreTone }]}>
        <Text style={[styles.score, { color: scoreTone }]}>{result.score}<Text style={styles.denom}>/100</Text></Text>
        <Text style={styles.grade}>Grade {result.grade}</Text>
        <Text style={styles.words}>{result.wordCount} resume words analysed{scoreDelta !== null && scoreDelta !== 0 ? ` · ${scoreDelta > 0 ? '+' : ''}${scoreDelta} since first check` : ''}</Text>
      </Card>

      <SectionTitle title="Score breakdown" />
      <Card>
        {result.breakdown.map((row) => (
          <View key={row.label} style={styles.row}>
            <View style={styles.rowTop}><Text style={styles.rowLabel}>{row.label}</Text><Text style={[styles.rowScore, { color: row.color }]}>{row.score}/{row.max}</Text></View>
            <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, (row.score / row.max) * 100)}%`, backgroundColor: row.color }]} /></View>
            <Text style={styles.detail}>{row.detail}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle title="Top matches" />
      <TokenList values={result.matchedSkills} empty="No requested technical skills were detected." tone="success" />

      <SectionTitle title="Missing skills" action={result.missingSkills.length ? <AppButton compact title="Add all" variant="outline" onPress={onApplyAll} /> : null} />
      <ActionList values={result.missingSkills} empty="No listed skills are missing from the pasted text." actionLabel="Add" onAction={onApplySkill} tone="warning" />

      <SectionTitle title="Missing JD keywords" />
      <TokenList values={result.missingKeywords.slice(0, 18)} empty="Good keyword coverage." tone="info" />

      {result.weakPhrases.length ? <>
        <SectionTitle title="Strengthen weak wording" />
        <ActionList values={result.weakPhrases} empty="" actionLabel="Replace" onAction={onReplaceWeak} tone="warning" />
      </> : null}

      {missingSections.length ? <>
        <SectionTitle title="Add missing sections" />
        <ActionList values={missingSections} empty="" actionLabel="Add template" onAction={onAddSection} tone="info" />
      </> : null}

      <SectionTitle title="Project-bullet prompts" />
      <Card>
        <Text style={styles.integrityNote}>These are prompts, not claims. Edit bracketed details and keep only work you actually completed.</Text>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.promptRow}>
            <Text style={styles.promptText}>• {bullet}</Text>
            <Pressable accessibilityRole="button" onPress={() => onAddBullet(bullet)} style={styles.promptButton}><Text style={styles.promptButtonText}>Add</Text></Pressable>
          </View>
        ))}
      </Card>

      <SectionTitle title="Export tailored text" />
      <Card>
        <Text style={styles.detail}>Choose a PDF style. Export uses the Android/iOS share sheet; it does not replace the resume saved to your profile.</Text>
        <View style={styles.templates}>
          {Object.entries(resumeThemes).map(([id, item]) => (
            <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: template === id }} onPress={() => onTemplateChange(id)} style={[styles.template, template === id && { backgroundColor: item.soft, borderColor: item.accent }]}>
              <View style={[styles.swatch, { backgroundColor: item.accent }]} />
              <Text style={[styles.templateText, template === id && { color: item.accent }]}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
        <AppButton title="Create and share tailored PDF" onPress={onExport} loading={exporting} style={styles.exportButton} />
        {originalScore !== null ? <AppButton title="Restore original resume text" variant="outline" onPress={onReset} style={styles.restoreButton} /> : null}
      </Card>
    </View>
  );
}

function TokenList({ values, empty, tone }) {
  return <Card style={styles.tokens}>{values?.length ? values.map((value) => <Badge key={value} tone={tone} style={styles.token}>{value}</Badge>) : <Text style={styles.detail}>{empty}</Text>}</Card>;
}

function ActionList({ values, empty, actionLabel, onAction, tone }) {
  if (!values?.length) return <Card><Text style={styles.detail}>{empty}</Text></Card>;
  return <Card style={styles.actionList}>{values.map((value) => (
    <View key={value} style={styles.actionRow}>
      <Badge tone={tone} style={styles.actionBadge}>{value}</Badge>
      <Pressable accessibilityRole="button" onPress={() => onAction(value)} style={styles.inlineAction}><Text style={styles.inlineActionText}>{actionLabel}</Text></Pressable>
    </View>
  ))}</Card>;
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, lineHeight: 20, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontWeight: '800', color: colors.text },
  clear: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  wordCount: { color: colors.muted, fontSize: 11 },
  editor: { marginTop: 10, minHeight: 178, padding: 11, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.text, lineHeight: 20 },
  hint: { fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: 8 },
  samples: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  sampleChip: { borderRadius: 99, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6 },
  sampleText: { color: colors.primary, fontWeight: '800', fontSize: 11 },
  space: { marginTop: 12 },
  results: { marginTop: spacing.lg },
  scoreCard: { alignItems: 'center', borderWidth: 2 },
  score: { fontSize: 46, fontWeight: '900' },
  denom: { fontSize: 18, color: colors.muted },
  grade: { color: colors.text, fontWeight: '900', fontSize: 16 },
  words: { color: colors.muted, marginTop: 4, fontSize: 12, textAlign: 'center' },
  row: { marginBottom: 15 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: colors.text, fontWeight: '800', fontSize: 13, flex: 1, paddingRight: 8 },
  rowScore: { fontWeight: '900', fontSize: 12 },
  track: { height: 7, borderRadius: 7, backgroundColor: '#E2E8F0', overflow: 'hidden', marginTop: 7 },
  fill: { height: '100%', borderRadius: 7 },
  detail: { color: colors.muted, fontSize: 12, marginTop: 5, lineHeight: 17 },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  token: { marginRight: 0 },
  actionList: { gap: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 34 },
  actionBadge: { flex: 1, alignSelf: 'auto' },
  inlineAction: { marginLeft: 8, minHeight: 34, paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  inlineActionText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  integrityNote: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 7 },
  promptRow: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingVertical: 10, flexDirection: 'row', alignItems: 'flex-start' },
  promptText: { color: colors.text, fontSize: 12, lineHeight: 18, flex: 1, paddingRight: 8 },
  promptButton: { paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#EEF2FF', borderRadius: 8 },
  promptButtonText: { color: colors.primary, fontWeight: '900', fontSize: 11 },
  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  template: { width: '48.7%', minHeight: 42, flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 9, backgroundColor: colors.white },
  swatch: { width: 15, height: 15, borderRadius: 5, marginRight: 7 },
  templateText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  exportButton: { marginTop: 13 },
  restoreButton: { marginTop: 9 },
  disclaimer: { padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, marginTop: spacing.lg },
  disclaimerText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.75 },
});
