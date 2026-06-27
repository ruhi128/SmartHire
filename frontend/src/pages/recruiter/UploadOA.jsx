import { useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
console.log('✅ UploadOA component rendered');
const emptyQuestion = () => ({
  question_text: '',
  options: ['', '', '', ''],
  correct_answer: 0,
  marks: 4
});

export default function UploadOA(){
  const [title, setTitle] = useState('');
  const [testType, setTestType] = useState('technical');
  const [duration, setDuration] = useState(60);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [submitting, setSubmitting] = useState(false);

  const updateQuestion = (idx, field, value) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx, optIdx, value) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const handleSubmit = async () => {
    console.log('✅ handleSubmit called');
  if (!title.trim()) {
    toast.error('Please enter a test title');
    return;
  }

  if (questions.length === 0) {
    toast.error('Add at least one question');
    return;
  }

  // Validate questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (!q.question_text.trim()) {
      toast.error(`Question ${i + 1} is empty`);
      return;
    }

    const hasEmptyOption = q.options.some(opt => !opt.trim());

    if (hasEmptyOption) {
      toast.error(`Question ${i + 1} has empty options`);
      return;
    }
  }

  setSubmitting(true);

  try {
    await api.post('/api/companyoa/submit', {
      title,
      description: '',
      test_type: testType,
      duration,
      target_branches: [],
      min_cgpa: 0,
      instructions: 'Do not switch tabs during the assessment.',

      questions: questions.map((q, idx) => ({
        ordering: idx + 1,
        section: 'General',
        question_type: 'mcq',

        question_text: q.question_text,

        options: q.options,

        correct_index: q.correct_answer,

        marks: q.marks,

        negative_marks: 0.25,

        explanation: '',

        placeholder: '',

        word_limit: 200,
      })),
    });

    toast.success('✅ OA submitted for admin approval!');

    // Reset form
    setTitle('');
    setDuration(60);
    setTestType('technical');
    setQuestions([emptyQuestion()]);

  } catch (err) {
    toast.error(err.response?.data?.error || 'Submission failed');
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-white">Upload Mock OA Test</h2>

      <input className="input mb-3 w-full" placeholder="Test Title"
        value={title} onChange={e => setTitle(e.target.value)} />

      <div className="flex gap-4 mb-6">
        <select className="input" value={testType} onChange={e => setTestType(e.target.value)}>
          <option value="technical">Technical</option>
          <option value="aptitude">Aptitude</option>
          <option value="behavioural">Behavioural</option>
        </select>
        <input type="number" className="input w-32" placeholder="Duration (mins)"
          value={duration} onChange={e => setDuration(Number(e.target.value))} />
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="bg-gray-800 rounded-xl p-4 mb-4">
          <p className="text-gray-400 mb-2">Question {qi + 1}</p>
          <textarea className="input w-full mb-3" rows={2} placeholder="Question text"
            value={q.question_text}
            onChange={e => updateQuestion(qi, 'question_text', e.target.value)} />

          {q.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2 mb-2">
              <input type="radio" name={`correct-${qi}`} checked={q.correct_answer === oi}
                onChange={() => updateQuestion(qi, 'correct_answer', oi)} />
              <input className="input flex-1" placeholder={`Option ${oi + 1}`}
                value={opt} onChange={e => updateOption(qi, oi, e.target.value)} />
            </div>
          ))}
          <p className="text-xs text-gray-500">● Select the radio button next to the correct answer</p>
        </div>
      ))}

      <div className="flex gap-3 mt-4">
        <button className="btn-secondary" onClick={() => setQuestions(qs => [...qs, emptyQuestion()])}>
          + Add Question
        </button>
        <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );
}