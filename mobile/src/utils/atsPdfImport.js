// ATS source documents are used for transient text extraction only. This
// helper never attaches a PDF to the student's profile or keeps a file URI.
export const MAX_ATS_PDF_BYTES = 8 * 1024 * 1024;

export async function pickAndExtractAtsPdf({ pickDocument, extractPdf }) {
  const picked = await pickDocument({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked?.canceled) return null;
  const asset = picked?.assets?.[0];
  if (!asset?.uri || typeof asset.uri !== 'string') {
    throw new Error('No PDF was selected. Please try again.');
  }
  if (asset.mimeType !== 'application/pdf' && !/\.pdf$/i.test(asset.name || '')) {
    throw new Error('Choose a PDF document, not another file type.');
  }
  if (Number.isFinite(asset.size) && asset.size > MAX_ATS_PDF_BYTES) {
    throw new Error('Choose a PDF no larger than 8 MB.');
  }

  const selectedName = String(asset.name || 'document.pdf').split(/[\\/]/).pop().slice(0, 180);
  const name = /\.pdf$/i.test(selectedName) ? selectedName : `${selectedName}.pdf`;
  const formData = new FormData();
  formData.append('document', { uri: asset.uri, name, type: 'application/pdf' });
  const extracted = await extractPdf(formData);
  const text = typeof extracted?.text === 'string' ? extracted.text.trim() : '';
  if (text.replace(/\s+/g, ' ').length < 50) {
    throw new Error('Could not extract enough readable text. Image-scanned or protected PDFs need text pasted manually.');
  }
  return { text, name };
}
