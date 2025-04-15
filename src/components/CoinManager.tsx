import { useState, useEffect } from 'react';
import { Vector3 } from 'three';
import { GoldCoin } from './GoldCoin';
import { emitCoinCollected } from '../socket';

interface Coin {
  id: string;
  position: [number, number, number];
  value: number;
}

export function CoinManager() {
  const [coins, setCoins] = useState<Coin[]>(() => {
    // Generate 50 default coins scattered around the map
    return Array.from({ length: 50 }, (_, i) => {
      // Random position within a 20x20 area
      const x = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      return {
        id: `default-${i}`,
        position: [x, 1.5, z] as [number, number, number],
        value: 100,
      };
    });
  });

  useEffect(() => {
    const handleCoinsSpawned = (event: CustomEvent) => {
      const { position, coins: numCoins } = event.detail;
      
      // Generate coins in random positions around the player's last location
      const newCoins: Coin[] = Array.from({ length: numCoins }, (_, i) => {
        // Random angle and distance
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 2 + 0.5; // 0.5-2.5 units away
        const x = position.x + Math.cos(angle) * distance;
        const z = position.z + Math.sin(angle) * distance;
        
        return {
          id: `dropped-${Date.now()}-${i}`, // Make dropped coins have a distinct prefix
          position: [x, 1.5, z] as [number, number, number],
          value: 100,
        };
      });
      
      setCoins(prev => [...prev, ...newCoins]);
    };

    const handleCoinCollected = (event: CustomEvent) => {
      const { coinId } = event.detail;
      console.log('Removing coin:', coinId);
      // Remove the coin that was collected
      setCoins(prev => {
        const newCoins = prev.filter(coin => coin.id !== coinId);
        console.log('Remaining coins:', newCoins.length);
        return newCoins;
      });
    };

    window.addEventListener('coinsSpawned', handleCoinsSpawned as EventListener);
    window.addEventListener('coinCollected', handleCoinCollected as EventListener);
    
    return () => {
      window.removeEventListener('coinsSpawned', handleCoinsSpawned as EventListener);
      window.removeEventListener('coinCollected', handleCoinCollected as EventListener);
    };
  }, []);

  // Check for coin collection
  useEffect(() => {
    const checkCoinCollection = () => {
      const playerPosition = window.gameState?.player?.position;
      if (!playerPosition) return;

      setCoins(prev => {
        const remainingCoins = prev.filter(coin => {
          const dx = playerPosition.x - coin.position[0];
          const dy = playerPosition.y - coin.position[1];
          const dz = playerPosition.z - coin.position[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // If player is close enough to collect the coin
          if (distance < 1) {
            console.log('Collecting coin:', coin.id);
            emitCoinCollected(coin.id);
            return false;
          }
          return true;
        });

        return remainingCoins;
      });
    };

    const interval = setInterval(checkCoinCollection, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {coins.map(coin => (
        <GoldCoin
          key={coin.id}
          position={coin.position}
          value={coin.value}
          onCollect={() => {
            emitCoinCollected(coin.id); // Pass the actual coin ID
            setCoins(prev => prev.filter(c => c.id !== coin.id));
          }}
        />
      ))}
    </>
  );
} 