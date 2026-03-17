export type CropQueueAsset = {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
};

export type RootStackParamList = {
  Auth: undefined;
  CoupleSetup: undefined;
  CoupleWaiting: undefined;
  Splash: undefined;
  Home: undefined;
  Countdown: undefined;
  MemoryGame: undefined;
  MemoryStats:
    | {
        selectedSetId?: string | null;
      }
    | undefined;
  MemoryCropQueue: {
    title: string;
    memorySetId: string;
    coupleId: string;
    userId: string;
    slotIndexes: number[];
    assets: CropQueueAsset[];
  };
  CoupleSettings: undefined;
};