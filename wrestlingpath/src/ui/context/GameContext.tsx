'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { UnifiedState, CustomStartOptions } from '@/engine/unified/types';
import { UnifiedEngine } from '@/engine/unified/UnifiedEngine';

type Screen = 'create' | 'game';

interface GameContextValue {
  screen: Screen;
  state: UnifiedState | null;
  engine: UnifiedEngine | null;
  startNewGame: (seed: string, options: { name: string; weightClass?: number; customStart?: CustomStartOptions }) => void;
  loadGame: (loaded: UnifiedState) => void;
  applyChoice: (choiceKey: string) => void;
  applyRelationshipAction: (relId: string, actionKey: string) => void;
  advanceWeek: () => boolean;
  runOffseasonEvent: (eventKey: string) => { success: boolean; place?: number; eventName?: string; message?: string; matches?: { won: boolean; method: string }[] };
  goToCreate: () => void;
  goToGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>('create');
  const [state, setState] = useState<UnifiedState | null>(null);
  const [engine, setEngine] = useState<UnifiedEngine | null>(null);

  const startNewGame = useCallback((seed: string, options: { name: string; weightClass?: number; customStart?: CustomStartOptions }) => {
    const initial = UnifiedEngine.createState(seed, options);
    const eng = new UnifiedEngine(initial);
    setEngine(eng);
    setState(eng.getState());
    setScreen('game');
  }, []);

  const loadGame = useCallback((loaded: UnifiedState) => {
    const eng = new UnifiedEngine(loaded);
    setEngine(eng);
    setState(eng.getState());
    setScreen('game');
  }, []);

  const applyChoice = useCallback((choiceKey: string) => {
    if (!engine) return;
    engine.applyChoice(choiceKey);
    setState(JSON.parse(JSON.stringify(engine.getState())));
  }, [engine]);

  const applyRelationshipAction = useCallback((relId: string, actionKey: string) => {
    if (!engine) return;
    engine.applyRelationshipAction(relId, actionKey);
    setState(JSON.parse(JSON.stringify(engine.getState())));
  }, [engine]);

  const advanceWeek = useCallback((): boolean => {
    if (!engine) return false;
    const newYear = engine.advanceWeek();
    setState(JSON.parse(JSON.stringify(engine.getState())));
    return newYear;
  }, [engine]);

  const runOffseasonEvent = useCallback((eventKey: string) => {
    if (!engine) return { success: false, message: 'No game' };
    const result = engine.runOffseasonEvent(eventKey);
    if (result.success) setState(JSON.parse(JSON.stringify(engine.getState())));
    return result;
  }, [engine]);

  const value: GameContextValue = {
    screen,
    state,
    engine,
    startNewGame,
    loadGame,
    applyChoice,
    applyRelationshipAction,
    advanceWeek,
    runOffseasonEvent,
    goToCreate: () => setScreen('create'),
    goToGame: () => setScreen('game'),
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
