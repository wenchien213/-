export type Character = 1 | 2 | 3 | 4;

export interface PersonalityInfo {
  id: Character;
  name: string;
  title: string;
  description: string;
  traits: string[];
  advice: string;
}

export interface AnalysisResult {
  scores: Record<Character, number>;
  quote: {
    text: string;
    author: string;
  };
  advice: string;
}
