// Drafts intentionally stay on this device, but must not leak between two
// SmartHire accounts using the same phone. Do not read the old unscoped
// dsa_code_<problem>_<language> keys, which may belong to another account.
export function dsaDraftKey(accountId, problemId, language) {
  if (!accountId || !problemId || !language) return null;
  return `dsa_code_v2:${encodeURIComponent(String(accountId))}:${encodeURIComponent(String(problemId))}:${encodeURIComponent(String(language))}`;
}
