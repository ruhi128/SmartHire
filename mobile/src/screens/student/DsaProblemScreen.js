import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dsaApi } from '../../api';
import AppHeader from '../../components/AppHeader';
import { AppButton, Badge, Card, ErrorState, FormInput, LoadingState, SectionTitle } from '../../components/Ui';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';
import { DEMO_MODE } from '../../config/runtime';

const LANGUAGES = [
  ['python', 'Python'],
  ['javascript', 'JavaScript'],
  ['java', 'Java'],
  ['cpp', 'C++'],
  ['c', 'C'],
];

function normalizeExamples(examples) {
  return Array.isArray(examples) ? examples : [];
}

function exactStarter(problem, language, functionExecution = null) {
  const source = problem?.starter_code || {};
  const candidate = typeof source[language] === 'string' ? source[language] : '';
  const configured = candidate.trim() ? candidate : '';
  // Legacy live records can be missing starter_code even when the backend has
  // verified function metadata. In that case use its safe, unfinished
  // fallback template; never invent a stdin/stdout program on the device.
  const fallback = functionExecution?.starterTemplates?.[language];
  return configured || (typeof fallback === 'string' ? fallback : '');
}

function demoStarter(problem, language) {
  const source = problem?.starter_code || {};
  return exactStarter(problem, language) || source.javascript || source.python || '';
}

function formatJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
}

function parseArguments(value) {
  const parsed = JSON.parse(value || '[]');
  if (!Array.isArray(parsed)) throw new Error('Arguments must be a JSON array. For example: [[2,7,11,15], 9]');
  return parsed;
}

function displayValue(value) {
  if (typeof value === 'string') return value;
  return formatJson(value);
}

export default function DsaProblemScreen({ navigation, route }) {
  const { problemId } = route.params;
  const { data, loading, error, reload } = useAsyncData(() => dsaApi.problem(problemId), [problemId]);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [argumentsText, setArgumentsText] = useState('[]');
  const [customInput, setCustomInput] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [output, setOutput] = useState(null);

  const problem = data?.problem;
  const functionExecution = !DEMO_MODE ? problem?.function_execution : null;
  const typedAvailable = Boolean(functionExecution?.available);
  const typedLanguages = typedAvailable && Array.isArray(functionExecution.languages)
    ? functionExecution.languages
    : [];
  const usableTypedLanguages = typedLanguages.filter((item) => Boolean(exactStarter(problem, item, functionExecution).trim()));
  const languageIsRunnable = DEMO_MODE
    ? true
    : typedAvailable && usableTypedLanguages.includes(language);

  useEffect(() => {
    if (!problem) return;
    if (!DEMO_MODE && functionExecution?.available) {
      setLanguage((current) => (usableTypedLanguages.includes(current) ? current : (usableTypedLanguages[0] || current)));
    }
  }, [problem?.id, functionExecution?.available, usableTypedLanguages.join('|')]);

  useEffect(() => {
    if (!problem) return;
    const starter = DEMO_MODE
      ? demoStarter(problem, language)
      : exactStarter(problem, language, functionExecution);
    setCode(starter);
  }, [problem?.id, language]);

  useEffect(() => {
    if (!problem) return;
    if (!DEMO_MODE && functionExecution?.available) {
      setArgumentsText(formatJson(functionExecution.defaultArgs || []));
    } else {
      setArgumentsText('[]');
    }
    setOutput(null);
  }, [problem?.id]);

  if (loading) {
    return <><AppHeader navigation={navigation} title="Coding problem" /><SafeAreaView edges={['left', 'right', 'bottom']} style={styles.state}><LoadingState /></SafeAreaView></>;
  }
  if (error || !problem) {
    return <><AppHeader navigation={navigation} title="Coding problem" /><SafeAreaView edges={['left', 'right', 'bottom']} style={styles.state}><ErrorState message={error || 'Problem not found.'} onRetry={() => reload().catch(() => {})} /></SafeAreaView></>;
  }

  const unavailableReason = !DEMO_MODE && !typedAvailable
    ? (functionExecution?.reason || 'This problem has no verified mobile function runner yet.')
    : (!DEMO_MODE && typedAvailable && !usableTypedLanguages.length
      ? 'This problem has a verified function runner, but no Python or JavaScript starter template is configured. It is intentionally unavailable on mobile rather than being graded incorrectly.'
      : null);
  const canExecute = DEMO_MODE || languageIsRunnable;

  const run = async () => {
    if (!canExecute) {
      Alert.alert('Unavailable on mobile', unavailableReason || 'Choose an available Python or JavaScript starter template.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Write some code first', DEMO_MODE ? 'Enter code to receive local sample feedback.' : 'Implement the required function or class before running it.');
      return;
    }

    let args;
    if (!DEMO_MODE) {
      try {
        args = parseArguments(argumentsText);
      } catch (parseError) {
        Alert.alert('Arguments are not valid JSON', parseError.message);
        return;
      }
    }

    setRunning(true);
    setOutput(null);
    try {
      const result = DEMO_MODE
        ? await dsaApi.run({ problemId, code, language, customInput })
        : await dsaApi.runFunction({ problemId, code, language, args });
      setOutput(result);
    } catch (requestError) {
      setOutput({
        stderr: requestError?.response?.data?.error || 'Could not run code.',
        error: requestError?.response?.data?.code,
        verdict: 'Error',
      });
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    if (!canExecute) {
      Alert.alert('Unavailable on mobile', unavailableReason || 'Choose an available Python or JavaScript starter template.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Write some code first', DEMO_MODE ? 'Enter code to save a local sample submission.' : 'Implement the required function or class before submitting it.');
      return;
    }

    setSubmitting(true);
    setOutput(null);
    try {
      const result = DEMO_MODE
        ? await dsaApi.submit({ problemId, code, language })
        : await dsaApi.submitFunction({ problemId, code, language });
      setOutput(result);
    } catch (requestError) {
      setOutput({
        stderr: requestError?.response?.data?.error || 'Could not submit code.',
        error: requestError?.response?.data?.code,
        verdict: 'Error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader navigation={navigation} title={problem.title} subtitle={problem.difficulty} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeBody}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.tags}>
          <Badge tone={problem.difficulty === 'Easy' ? 'success' : problem.difficulty === 'Medium' ? 'warning' : 'danger'}>{problem.difficulty}</Badge>
          {(problem.tags || []).map((tag) => <Badge key={tag}>{tag}</Badge>)}
        </View>

        <SectionTitle title="Problem" />
        <Card>
          <Text style={styles.description}>{problem.description}</Text>
          {normalizeExamples(problem.examples).map((example, index) => (
            <View key={index} style={styles.example}>
              <Text style={styles.exampleTitle}>Example {index + 1}</Text>
              <Text style={styles.mono}>Input: {example.input}</Text>
              <Text style={styles.mono}>Output: {example.output}</Text>
              {example.explanation ? <Text style={styles.explanation}>{example.explanation}</Text> : null}
            </View>
          ))}
          {problem.constraints?.length ? <>
            <Text style={styles.constraintTitle}>Constraints</Text>
            {problem.constraints.map((constraint, index) => <Text key={index} style={styles.constraint}>• {constraint}</Text>)}
          </> : null}
        </Card>

        {!DEMO_MODE && typedAvailable ? (
          <Card style={styles.functionInfo}>
            <Text style={styles.functionInfoTitle}>LeetCode-style function runner</Text>
            <Text style={styles.functionInfoBody}>
              Write only {functionExecution.className ? `the ${functionExecution.className} class` : `the ${functionExecution.method} function`}.
              {' '}Do not read stdin, add a main function, or print the final answer. SmartHire supplies the arguments and serializes the returned value.
            </Text>
          </Card>
        ) : null}

        {unavailableReason ? (
          <Card style={styles.unavailable}>
            <Text style={styles.unavailableTitle}>Unavailable for mobile function grading</Text>
            <Text style={styles.unavailableBody}>{unavailableReason}</Text>
          </Card>
        ) : null}

        <SectionTitle title="Code editor" />
        <View style={styles.languageRow}>
          {LANGUAGES.map(([value, label]) => {
            const isSupported = DEMO_MODE || (typedAvailable && usableTypedLanguages.includes(value));
            const selected = language === value;
            return (
              <Pressable
                key={value}
                disabled={!isSupported}
                onPress={() => setLanguage(value)}
                style={[styles.language, selected && styles.languageActive, !isSupported && styles.languageDisabled]}
              >
                <Text style={[styles.languageText, selected && styles.languageTextActive, !isSupported && styles.languageTextDisabled]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {!DEMO_MODE && typedAvailable ? <Text style={styles.languageHint}>Only languages with both a verified function driver and a starter template are enabled.</Text> : null}

        <View style={styles.codeWrap}>
          <TextInput
            editable={canExecute}
            value={code}
            onChangeText={setCode}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
            style={[styles.code, !canExecute && styles.codeDisabled]}
            placeholder={canExecute ? 'Write your solution' : 'This problem is unavailable for mobile function grading.'}
            placeholderTextColor="#64748B"
          />
        </View>

        {!DEMO_MODE && typedAvailable ? (
          <FormInput
            label="Arguments for Run (JSON array)"
            value={argumentsText}
            onChangeText={setArgumentsText}
            multiline
            editable={canExecute}
            placeholder="Example: [[2,7,11,15], 9]"
            inputStyle={styles.argsInput}
          />
        ) : null}
        {DEMO_MODE ? (
          <FormInput
            label="Custom input (optional)"
            value={customInput}
            onChangeText={setCustomInput}
            multiline
            placeholder="Input for local demo feedback"
          />
        ) : null}

        <View style={styles.actions}>
          <AppButton title="Run" variant="outline" onPress={run} loading={running} disabled={!canExecute} style={styles.action} />
          <AppButton title="Submit" onPress={submit} loading={submitting} disabled={!canExecute} style={styles.action} />
        </View>

        {output ? (
          <Card style={styles.output}>
            <Text style={styles.outputTitle}>{output.status || output.verdict || 'Result'}</Text>
            {output.actualDisplay !== null && output.actualDisplay !== undefined ? <>
              <Text style={styles.outputLabel}>Returned value</Text>
              <Text style={styles.outputCode}>{displayValue(output.actualDisplay)}</Text>
            </> : null}
            {output.stdout ? <>
              <Text style={styles.outputLabel}>Runner output</Text>
              <Text style={styles.outputCode}>{output.stdout}</Text>
            </> : null}
            {output.stderr || output.error ? <>
              <Text style={styles.errorLabel}>Details</Text>
              <Text style={styles.errorOutput}>{output.stderr || output.error}</Text>
            </> : null}
            {output.passed !== undefined ? <Text style={styles.summary}>Passed {output.passed} of {output.total} test case{output.total === 1 ? '' : 's'}</Text> : null}
            {Array.isArray(output.results) && output.results.length ? <View style={styles.results}>
              <Text style={styles.resultsTitle}>Test cases</Text>
              {output.results.map((result, index) => <View key={`${result.testCase || index}-${index}`} style={[styles.testResult, result.passed ? styles.testPassed : styles.testFailed]}>
                <Text style={[styles.testTitle, result.passed ? styles.testPassedText : styles.testFailedText]}>Test {result.testCase || index + 1}: {result.passed ? 'Passed' : (result.verdict || 'Failed')}</Text>
                <Text style={styles.testLine}>Arguments: {displayValue(result.input ?? result.args)}</Text>
                <Text style={styles.testLine}>Expected: {displayValue(result.expected)}</Text>
                <Text style={styles.testLine}>Actual: {displayValue(result.output ?? result.actual)}</Text>
                {result.stderr ? <Text style={styles.testError}>{result.stderr}</Text> : null}
              </View>)}
            </View> : null}
          </Card>
        ) : null}

        <Text style={styles.note}>{DEMO_MODE
          ? 'Local demo feedback is deterministic and does not run your code on a server. Do not enter passwords, keys, or other sensitive data.'
          : 'Live function execution runs through the configured SmartHire server and JDoodle. Do not enter passwords, keys, or other sensitive data.'}
        </Text>
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeBody: { flex: 1, backgroundColor: colors.background },
  state: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  description: { color: colors.muted, lineHeight: 22 },
  example: { marginTop: 15, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  exampleTitle: { color: colors.text, fontWeight: '800', marginBottom: 4 },
  mono: { color: colors.text, fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  explanation: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  constraintTitle: { color: colors.text, fontWeight: '800', marginTop: 15, marginBottom: 5 },
  constraint: { color: colors.muted, lineHeight: 19 },
  functionInfo: { marginTop: 14, backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  functionInfoTitle: { color: '#3730A3', fontWeight: '900', marginBottom: 5 },
  functionInfoBody: { color: '#3730A3', lineHeight: 19, fontSize: 12 },
  unavailable: { marginTop: 14, backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  unavailableTitle: { color: '#9A3412', fontWeight: '900', marginBottom: 5 },
  unavailableBody: { color: '#9A3412', lineHeight: 19, fontSize: 12 },
  languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 7 },
  language: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  languageActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  languageDisabled: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', opacity: 0.72 },
  languageText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  languageTextActive: { color: colors.white },
  languageTextDisabled: { color: '#94A3B8' },
  languageHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  codeWrap: { minHeight: 280, borderRadius: 12, overflow: 'hidden', backgroundColor: '#101827', marginBottom: 14 },
  code: { minHeight: 280, color: '#E2E8F0', padding: 14, fontFamily: 'monospace', fontSize: 13, lineHeight: 19 },
  codeDisabled: { opacity: 0.58 },
  argsInput: { fontFamily: 'monospace', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  output: { marginTop: 14, backgroundColor: '#F8FAFC' },
  outputTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  outputLabel: { color: colors.muted, fontSize: 12, marginTop: 11 },
  outputCode: { fontFamily: 'monospace', color: colors.text, marginTop: 4, fontSize: 12, lineHeight: 18 },
  errorLabel: { color: colors.danger, fontSize: 12, marginTop: 11 },
  errorOutput: { fontFamily: 'monospace', color: colors.danger, marginTop: 4, fontSize: 12, lineHeight: 18 },
  summary: { color: colors.primary, fontWeight: '800', marginTop: 11 },
  results: { marginTop: 14 },
  resultsTitle: { color: colors.text, fontWeight: '900', marginBottom: 8 },
  testResult: { borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1 },
  testPassed: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  testFailed: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  testTitle: { fontWeight: '900', marginBottom: 5 },
  testPassedText: { color: '#166534' },
  testFailedText: { color: '#B91C1C' },
  testLine: { color: colors.text, fontFamily: 'monospace', fontSize: 11, lineHeight: 16 },
  testError: { color: colors.danger, fontFamily: 'monospace', fontSize: 11, lineHeight: 16, marginTop: 5 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 14 },
});
