import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ReviewOA() {
  const [tests, setTests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    api.get('/api/mockoa/pending').then(r => setTests(r.data));
  }, []);

  const approve = async (id) => {
    await api.patch(`/api/mockoa/${id}/approve`);
    toast.success('Test approved!');
    setTests(ts => ts.filter(t => t.id !== id));
    setSelected(null);
  };

  const reject = async (id) => {
    await api.patch(`/api/mockoa/${id}/reject`, { reason: rejectReason });
    toast.error('Test rejected.');
    setTests(ts => ts.filter(t => t.id !== id));
    setSelected(null);
    setRejectReason('');
  };

  return (
    <div className="p-6 flex gap-6">
      {/* Left — list */}
      <div className="w-1/3 space-y-3">
        <h2 className="text-xl font-bold text-white">Pending OA Tests</h2>
        {tests.length === 0 && <p className="text-gray-400">No pending tests 🎉</p>}
        {tests.map(t => (
          <div key={t.id}
            className={`p-3 rounded-lg cursor-pointer border ${selected?.id === t.id ? 'border-cyan-400' : 'border-gray-700'} bg-gray-800`}
            onClick={() => setSelected(t)}>
            <p className="font-semibold text-white">{t.title}</p>
            <p className="text-sm text-gray-400">{t.companies?.name} · {t.test_type}</p>
            <p className="text-xs text-yellow-400">{t.mock_oa_questions?.length} questions</p>
          </div>
        ))}
      </div>

      {/* Right — preview */}
      {selected && (
        <div className="flex-1 bg-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-bold text-white mb-1">{selected.title}</h3>
          <p className="text-gray-400 mb-4">{selected.companies?.name} · {selected.test_type} · {selected.duration_minutes} min</p>

          <div className="space-y-4 max-h-96 overflow-y-auto mb-5">
            {selected.mock_oa_questions?.map((q, i) => (
              <div key={q.id} className="bg-gray-700 rounded-lg p-3">
                <p className="font-medium text-white mb-2">Q{i + 1}. {q.question_text}</p>
                {q.options?.map((opt, oi) => (
                  <p key={oi} className={`text-sm py-1 px-2 rounded ${oi === q.correct_answer ? 'bg-green-700 text-white' : 'text-gray-300'}`}>
                    {String.fromCharCode(65 + oi)}. {opt}
                    {oi === q.correct_answer && ' ✓'}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="flex gap-3 items-center">
            <button className="bg-green-600 text-white px-5 py-2 rounded-lg"
              onClick={() => approve(selected.id)}>
              ✅ Approve
            </button>
            <input className="input flex-1" placeholder="Rejection reason (optional)"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <button className="bg-red-600 text-white px-5 py-2 rounded-lg"
              onClick={() => reject(selected.id)}>
              ❌ Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}