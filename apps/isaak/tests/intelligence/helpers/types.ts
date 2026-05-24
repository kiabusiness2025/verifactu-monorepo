export type GoldenCategory =
  | 'clarify'
  | 'no-clarify'
  | 'no-hallucination'
  | 'multi-turn'
  | 'tool-use';

export type GoldenTurn = {
  user: string;
  assistant?: string;
};

export type GoldenContext = {
  authenticated?: boolean;
  holdedConnected?: boolean;
  bankConnected?: boolean;
  noClientWithName?: string;
};

export type GoldenExpected = {
  shouldClarify?: boolean;
  ambiguityType?: 'period' | 'entity' | 'intent' | 'amount';
  clarificationContains?: string[];
  responseContains?: string[];
  responseExcludes?: string[];
  toolsUsed?: string[];
  turnAssertions?: {
    turn: number;
    contains?: string[];
    excludes?: string[];
    shouldClarify?: boolean;
  }[];
  minJudgeScore?: number;
};

export type GoldenFixture = {
  id: string;
  category: GoldenCategory;
  description?: string;
  query?: string;
  turns?: GoldenTurn[];
  context?: GoldenContext;
  expected: GoldenExpected;
};
