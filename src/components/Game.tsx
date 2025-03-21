import { Canvas } from '@react-three/fiber';
import { Stars, KeyboardControls } from '@react-three/drei';
import { Environment } from './Environment';
import { Player } from './Player';
import { HUD } from './HUD';
import { MultiplayerManager } from './MultiplayerManager';
import { BackgroundMusic } from './BackgroundMusic';
import { CoinManager } from './CoinManager';
import { Color } from 'three';

export function Game() {
  return (
    <div className="h-screen w-screen">
      <BackgroundMusic />
      <KeyboardControls
        map={[
          { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
          { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
          { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
          { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
          { name: 'jump', keys: ['Space'] },
        ]}
      >
        <Canvas 
          shadows 
          camera={{ position: [0, 2, 5], fov: 75 }}
          gl={{ antialias: true }}
          onCreated={({ scene }) => {
            scene.background = new Color('#000000');
          }}
        >
          <Environment />
          <Player />
          <MultiplayerManager />
          <CoinManager />
          <Stars 
            radius={200} 
            depth={50} 
            count={5000} 
            factor={20} 
            saturation={1} 
            fade 
            speed={1}
          />
          <fog attach="fog" args={['#000000', 30, 100]} />
        </Canvas>
      </KeyboardControls>
      <HUD />
    </div>
  );
}