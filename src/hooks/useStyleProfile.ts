import { useState, useCallback } from 'react';
import type { Language, StyleProfile } from '@/types';
import { extractStyleProfile, mergeProfiles } from '@/engine/styleProfiler';
import { extractPDFText, isPDFFile } from '@/utils/pdfExtraction';

interface PDFEntry {
  name: string;
  wordCount: number;
}

interface UseStyleProfileReturn {
  /** List of uploaded PDF metadata */
  uploadedPDFs: PDFEntry[];
  /** Merged profile from all uploaded documents */
  mergedProfile: StyleProfile | null;
  /** Whether PDFs are currently being processed */
  isProcessing: boolean;
  /** Error message from last operation */
  error: string | null;
  /** Add one or more PDF files */
  addPDFs: (files: File[], language: Language) => Promise<void>;
  /** Remove a specific PDF by index */
  removePDF: (index: number, language: Language) => void;
  /** Clear all profiles */
  clearProfiles: () => void;
  /** Whether a profile is available */
  hasProfile: boolean;
}

export function useStyleProfile(): UseStyleProfileReturn {
  const [, setProfiles] = useState<StyleProfile[]>([]);
  const [uploadedPDFs, setUploadedPDFs] = useState<PDFEntry[]>([]);
  const [mergedProfile, setMergedProfile] = useState<StyleProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPDFs = useCallback(
    async (files: File[], language: Language) => {
      setIsProcessing(true);
      setError(null);

      const newProfiles: StyleProfile[] = [];
      const newEntries: PDFEntry[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (!isPDFFile(file)) {
          errors.push(`${file.name}: not a PDF file`);
          continue;
        }

        try {
          const text = await extractPDFText(file);
          if (text.trim().length < 100) {
            errors.push(`${file.name}: insufficient text extracted (possibly scanned/image PDF)`);
            continue;
          }
          const profile = extractStyleProfile(text, language);
          newProfiles.push(profile);
          newEntries.push({ name: file.name, wordCount: profile.totalWords });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${file.name}: ${msg}`);
        }
      }

      if (errors.length > 0) {
        setError(errors.join('\n'));
      }

      if (newProfiles.length > 0) {
        setProfiles((prev) => {
          const updated = [...prev, ...newProfiles];
          setMergedProfile(mergeProfiles(updated));
          return updated;
        });
        setUploadedPDFs((prev) => [...prev, ...newEntries]);
      }

      setIsProcessing(false);
    },
    [],
  );

  const removePDF = useCallback(
    (index: number, _language: Language) => {
      setProfiles((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        setMergedProfile(updated.length > 0 ? mergeProfiles(updated) : null);
        return updated;
      });
      setUploadedPDFs((prev) => prev.filter((_, i) => i !== index));
      setError(null);
    },
    [],
  );

  const clearProfiles = useCallback(() => {
    setProfiles([]);
    setUploadedPDFs([]);
    setMergedProfile(null);
    setError(null);
  }, []);

  return {
    uploadedPDFs,
    mergedProfile,
    isProcessing,
    error,
    addPDFs,
    removePDF,
    clearProfiles,
    hasProfile: mergedProfile !== null,
  };
}
