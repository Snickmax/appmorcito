import { useEffect, useRef, useState } from 'react';
import { BoardSize, MemoryCardModel, UploadedImage } from '../types/memory';
import { createDeck } from '../utils/memory';

type StartGameParams = {
  size: BoardSize;
  images: UploadedImage[];
};

export function useMemoryGame() {
  const [cards, setCards] = useState<MemoryCardModel[]>([]);
  const [boardSize, setBoardSize] = useState<BoardSize | null>(null);
  const [moves, setMoves] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const firstSelectedIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isGameStarted || isWon) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameStarted, isWon]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const resetSelection = () => {
    firstSelectedIdRef.current = null;
    setIsLocked(false);
  };

  const startGame = ({ size, images }: StartGameParams) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setBoardSize(size);
    setCards(createDeck(images, size));
    setMoves(0);
    setElapsedSeconds(0);
    setIsLocked(false);
    setIsWon(false);
    setIsGameStarted(true);
    firstSelectedIdRef.current = null;
  };

  const resetGame = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setCards([]);
    setBoardSize(null);
    setMoves(0);
    setElapsedSeconds(0);
    setIsLocked(false);
    setIsWon(false);
    setIsGameStarted(false);
    firstSelectedIdRef.current = null;
  };

  const flipCard = (cardId: string) => {
    if (isLocked || !isGameStarted || isWon) return;

    const clickedCard = cards.find((card) => card.id === cardId);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return;

    const nextCards = cards.map((card) =>
      card.id === cardId ? { ...card, isFlipped: true } : card
    );

    setCards(nextCards);

    if (!firstSelectedIdRef.current) {
      firstSelectedIdRef.current = cardId;
      return;
    }

    const firstId = firstSelectedIdRef.current;
    const secondId = cardId;

    const firstCard = nextCards.find((card) => card.id === firstId);
    const secondCard = nextCards.find((card) => card.id === secondId);

    if (!firstCard || !secondCard) return;

    setMoves((prev) => prev + 1);
    setIsLocked(true);

    if (firstCard.pairId === secondCard.pairId) {
      timeoutRef.current = setTimeout(() => {
        setCards((prev) => {
          const updated = prev.map((card) =>
            card.id === firstId || card.id === secondId
              ? { ...card, isMatched: true }
              : card
          );

          const allMatched = updated.every((card) => card.isMatched);
          if (allMatched) setIsWon(true);

          return updated;
        });

        resetSelection();
      }, 250);

      return;
    }

    timeoutRef.current = setTimeout(() => {
      setCards((prev) =>
        prev.map((card) =>
          card.id === firstId || card.id === secondId
            ? { ...card, isFlipped: false }
            : card
        )
      );

      resetSelection();
    }, 900);
  };

  return {
    boardSize,
    cards,
    moves,
    elapsedSeconds,
    isLocked,
    isWon,
    isGameStarted,
    startGame,
    resetGame,
    flipCard,
  };
}