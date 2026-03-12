import { BoardSize, MemoryCardModel, UploadedImage } from '../types/memory';

export function requiredImagesForSize(size: BoardSize) {
  return (size * size) / 2;
}

export function shuffleArray<T>(items: T[]) {
  const array = [...items];

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

export function createDeck(images: UploadedImage[], size: BoardSize): MemoryCardModel[] {
  const pairsNeeded = requiredImagesForSize(size);
  const selectedImages = shuffleArray(images).slice(0, pairsNeeded);

  const deck = selectedImages.flatMap((image, index) => {
    const pairId = `pair-${index}-${image.id}`;

    return [
      {
        id: `${pairId}-a`,
        pairId,
        uri: image.uri,
        isFlipped: false,
        isMatched: false,
      },
      {
        id: `${pairId}-b`,
        pairId,
        uri: image.uri,
        isFlipped: false,
        isMatched: false,
      },
    ];
  });

  return shuffleArray(deck);
}

export function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}