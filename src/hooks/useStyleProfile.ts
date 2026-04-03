import { useState, useCallback, useEffect } from 'react';
import type { Language, StyleProfile } from '@/types';
import { extractStyleProfile, mergeProfiles } from '@/engine/styleProfiler';
import { extractPDFText, isPDFFile } from '@/utils/pdfExtraction';

interface PDFEntry {
  name: string;
  wordCount: number;
}

interface PersistedState {
  profiles: StyleProfile[];
  pdfs: PDFEntry[];
}

const STORAGE_KEY = 'humanize_style_profiles';

/** Load persisted profiles from localStorage */
function loadPersistedState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (Array.isArray(parsed.profiles) && Array.isArray(parsed.pdfs)) {
      return parsed;
    }
  } catch {
    // Corrupted data — ignore
  }
  return null;
}

/** Save profiles to localStorage */
function persistState(profiles: StyleProfile[], pdfs: PDFEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, pdfs }));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

/** Clear persisted profiles */
function clearPersistedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
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
  removePDF: (index: number) => void;
  /** Clear all profiles */
  clearProfiles: () => void;
  /** Whether a profile is available */
  hasProfile: boolean;
}

export function useStyleProfile(): UseStyleProfileReturn {
  // Initialize from localStorage
  const persisted = loadPersistedState();
  const [, setProfiles] = useState<StyleProfile[]>(persisted?.profiles ?? []);
  const [uploadedPDFs, setUploadedPDFs] = useState<PDFEntry[]>(persisted?.pdfs ?? []);
  const [mergedProfile, setMergedProfile] = useState<StyleProfile | null>(
    persisted?.profiles && persisted.profiles.length > 0
      ? mergeProfiles(persisted.profiles)
      : null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist whenever profiles change (via effect to avoid stale closures)
  const [shouldPersist, setShouldPersist] = useState(false);
  useEffect(() => {
    if (!shouldPersist) return;
    // Read current state from the updater to avoid needing profiles in deps
    setProfiles((current) => {
      setUploadedPDFs((currentPdfs) => {
        persistState(current, currentPdfs);
        return currentPdfs;
      });
      return current;
    });
    setShouldPersist(false);
  }, [shouldPersist]);

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
        setShouldPersist(true);
      }

      setIsProcessing(false);
    },
    [],
  );

  const removePDF = useCallback(
    (index: number) => {
      setProfiles((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        setMergedProfile(updated.length > 0 ? mergeProfiles(updated) : null);
        return updated;
      });
      setUploadedPDFs((prev) => prev.filter((_, i) => i !== index));
      setError(null);
      setShouldPersist(true);
    },
    [],
  );

  const clearProfiles = useCallback(() => {
    setProfiles([]);
    setUploadedPDFs([]);
    setMergedProfile(null);
    setError(null);
    clearPersistedState();
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
