"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project, TeamMember } from "./schema";

type State = {
  idea: string;
  clarifyingQuestions: string[];
  clarifications: Record<string, string>;
  team: TeamMember[];
  project: Project | null;
  generating: boolean;

  setIdea: (s: string) => void;
  setClarifyingQuestions: (q: string[]) => void;
  setClarifications: (c: Record<string, string>) => void;
  setTeam: (t: TeamMember[]) => void;
  addMember: (m: TeamMember) => void;
  removeMember: (idx: number) => void;
  updateMember: (idx: number, m: Partial<TeamMember>) => void;
  setProject: (p: Project | null) => void;
  setGenerating: (b: boolean) => void;
  reset: () => void;
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      idea: "",
      clarifyingQuestions: [],
      clarifications: {},
      team: [],
      project: null,
      generating: false,

      setIdea: (idea) => set({ idea }),
      setClarifyingQuestions: (clarifyingQuestions) => set({ clarifyingQuestions }),
      setClarifications: (clarifications) => set({ clarifications }),
      setTeam: (team) => set({ team }),
      addMember: (m) => set((s) => ({ team: [...s.team, m] })),
      removeMember: (idx) =>
        set((s) => ({ team: s.team.filter((_, i) => i !== idx) })),
      updateMember: (idx, m) =>
        set((s) => ({
          team: s.team.map((cur, i) => (i === idx ? { ...cur, ...m } : cur)),
        })),
      setProject: (project) => set({ project }),
      setGenerating: (generating) => set({ generating }),
      reset: () =>
        set({
          idea: "",
          clarifyingQuestions: [],
          clarifications: {},
          team: [],
          project: null,
          generating: false,
        }),
    }),
    { name: "idea-to-jira" },
  ),
);
