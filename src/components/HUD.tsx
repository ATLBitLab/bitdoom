import { Infinity } from 'lucide-react';
import { useState, useEffect } from 'react';

export function HUD() {
  const [health, setHealth] = useState(100);
  const [sats, setSats] = useState(1000);
  const [isDead, setIsDead] = useState(false);

  useEffect(() => {
    const handleDamage = (event: CustomEvent) => {
      setHealth(event.detail.health);
      setSats(event.detail.sats);
      if (event.detail.health <= 0) {
        setIsDead(true);
      }
    };

    window.addEventListener('playerDamaged', handleDamage as EventListener);
    return () => window.removeEventListener('playerDamaged', handleDamage as EventListener);
  }, []);

  const handleRespawn = () => {
    setHealth(100);
    setSats(0);
    setIsDead(false);
    // Notify server of respawn
    const event = new CustomEvent('playerRespawn');
    window.dispatchEvent(event);
  };

  return (
    <>
      {/* Death screen */}
      {isDead && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="text-center">
            <h2 className="text-red-500 text-4xl mb-4">You're doomed!</h2>
            <p className="text-white text-xl mb-8">You lost your bitcoin.</p>
            <button
              onClick={handleRespawn}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg text-lg transition-colors"
            >
              Respawn
            </button>
          </div>
        </div>
      )}

      {/* Crosshair */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute h-4 w-0.5 bg-white opacity-70" style={{ left: '50%', transform: 'translateX(-50%)' }} />
          {/* Horizontal line */}
          <div className="absolute w-4 h-0.5 bg-white opacity-70" style={{ top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Stats HUD */}
      <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-between items-center bg-black bg-opacity-50 text-white">
        <div className="flex items-center gap-8">
          <div>
            <span className="font-bold">Health: </span>
            <span className={`${health > 50 ? 'text-green-400' : health > 25 ? 'text-yellow-400' : 'text-red-400'}`}>
              {health}%
            </span>
          </div>
          <div>
            <span className="font-bold">Bitcoin: </span>
            <span className="text-yellow-400">{sats} sats</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold mr-2">Ammo: </span>
            <Infinity className="w-6 h-6" />
          </div>
        </div>
      </div>
    </>
  );
}