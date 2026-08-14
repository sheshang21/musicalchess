import { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function Board() {
  const [game, setGame] = useState(new Chess());

  const position = useMemo(() => game.fen(), [game]);

  function onDrop(sourceSquare, targetSquare) {
    const next = new Chess(game.fen());
    try {
      next.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch {
      return false; // illegal move
    }
    setGame(next);
    // TODO: send move to Lichess board API (see src/lib/lichess.js)
    // and broadcast confirmed moves to the opponent via the room socket.
    return true;
  }

  return (
    <div className="board-wrap">
      <Chessboard position={position} onPieceDrop={onDrop} />
    </div>
  );
}
