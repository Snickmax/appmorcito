export type BoardSize = 2 | 4 | 6;

export type UploadedImage = {
  id: string;
  uri: string;
};

export type MemoryCardModel = {
  id: string;
  pairId: string;
  uri: string;
  isFlipped: boolean;
  isMatched: boolean;
};

export type BestStat = {
  moves: number;
  time: number;
} | null;

export type BestStatsMap = Record<BoardSize, BestStat>;