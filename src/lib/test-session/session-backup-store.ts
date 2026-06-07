import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type QuestionState } from "@/lib/test-session/answer-shape";

export type SessionBackupSnapshot = {
  questionStates: Record<string, QuestionState>;
  savedAt: string;
};

type SessionBackupStore = {
  backups: Record<string, SessionBackupSnapshot>;
  clearBackup: (sessionId: string) => void;
  getBackup: (sessionId: string) => SessionBackupSnapshot | null;
  hasHydrated: boolean;
  setBackup: (sessionId: string, questionStates: Record<string, QuestionState>) => void;
  setHasHydrated: (value: boolean) => void;
};

const STORAGE_KEY = "tsp-session-backup";

export const useSessionBackupStore = create<SessionBackupStore>()(
  persist(
    (set, get) => ({
      backups: {},
      clearBackup: (sessionId) =>
        set((state) => {
          const { [sessionId]: _removed, ...backups } = state.backups; // eslint-disable-line @typescript-eslint/no-unused-vars
          return { backups };
        }),
      getBackup: (sessionId) => get().backups[sessionId] ?? null,
      hasHydrated: false,
      setBackup: (sessionId, questionStates) =>
        set((state) => ({
          backups: {
            ...state.backups,
            [sessionId]: {
              questionStates,
              savedAt: new Date().toISOString()
            }
          }
        })),
      setHasHydrated: (value) => set({ hasHydrated: value })
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ backups: state.backups }),
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export function mergeWithBackup(
  serverStates: Record<string, QuestionState>,
  backup: SessionBackupSnapshot | null
) {
  if (!backup) {
    return serverStates;
  }

  const merged = { ...serverStates };

  for (const [questionId, backupState] of Object.entries(backup.questionStates)) {
    const serverState = serverStates[questionId];

    if (!serverState || serverState.answer === null) {
      merged[questionId] = backupState;
    }
  }

  return merged;
}
