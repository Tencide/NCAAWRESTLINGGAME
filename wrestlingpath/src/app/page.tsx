'use client';

import { GameProvider, useGame } from '@/ui/context/GameContext';
import { CreateScreen } from '@/ui/components/CreateScreen';
import { UnifiedGameLayout } from '@/ui/components/UnifiedGameLayout';

function GameRoot() {
  const { screen } = useGame();
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {screen === 'create' && <CreateScreen />}
      {screen === 'game' && <UnifiedGameLayout />}
    </div>
  );
}

export default function Home() {
  return (
    <GameProvider>
      <GameRoot />
    </GameProvider>
  );
}
