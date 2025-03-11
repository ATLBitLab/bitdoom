import { Infinity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { socket } from '../socket';
import { useGame } from '../hooks/useGame';

interface KillNotification {
  stolenSats: number;
  timestamp: number;
}

export function HUD() {
  const [health, setHealth] = useState(100);
  const [sats, setSats] = useState(1000);
  const [isDead, setIsDead] = useState(false);
  const [killNotifications, setKillNotifications] = useState<KillNotification[]>([]);
  const [countdown, setCountdown] = useState(60);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [hasEscaped, setHasEscaped] = useState(false);
  const { emitRespawn } = useGame();

  useEffect(() => {
    const handleDamage = (event: CustomEvent) => {
      setHealth(event.detail.health);
      setSats(event.detail.sats);
      if (event.detail.health <= 0) {
        setIsDead(true);
      }
    };

    const handleKill = (event: CustomEvent) => {
      const notification: KillNotification = {
        stolenSats: event.detail.stolenSats,
        timestamp: Date.now(),
      };
      setKillNotifications(prev => [notification, ...prev]);
      setTimeout(() => {
        setKillNotifications(prev => prev.filter(n => n !== notification));
      }, 3000);
    };

    const handleEscape = () => {
      setHasEscaped(true);
    };

    // Sync portal timer with server
    socket.on('portalTimerSync', (data: { countdown: number; isOpen: boolean }) => {
      setCountdown(data.countdown);
      setIsPortalOpen(data.isOpen);
    });

    window.addEventListener('playerDamaged', handleDamage as EventListener);
    window.addEventListener('playerKill', handleKill as EventListener);
    window.addEventListener('playerEscaped', handleEscape as EventListener);

    return () => {
      window.removeEventListener('playerDamaged', handleDamage as EventListener);
      window.removeEventListener('playerKill', handleKill as EventListener);
      window.removeEventListener('playerEscaped', handleEscape as EventListener);
      socket.off('portalTimerSync');
    };
  }, []);

  const handleRespawn = () => {
    setHealth(100);
    setIsDead(false);
    socket.emit('respawn', { id: localStorage.getItem('playerId') });
  };

  if (hasEscaped) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="text-center">
          <h2 className="text-blue-500 text-4xl mb-4">You Escaped!</h2>
          <p className="text-white text-xl mb-4">Your Bitcoin Balance: {sats} sats</p>
          <button
            onClick={() => window.location.href = '/claim'}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg text-lg transition-colors"
          >
            Claim Your Bitcoin
          </button>
        </div>
      </div>
    );
  }

  if (isDead) {
    return (
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
    );
  }

  return (
    <>
      {/* Kill Notifications */}
      <div className="fixed top-4 right-4 z-50">
        {killNotifications.map((notification, index) => (
          <div
            key={notification.timestamp}
            className="bg-yellow-500 text-black px-4 py-2 rounded mb-2 animate-fade-in"
          >
            +{notification.stolenSats} sats from kill!
          </div>
        ))}
      </div>

      {/* Portal Timer */}
      <div className="fixed top-4 left-4 text-2xl font-bold text-white z-50">
        {isPortalOpen ? (
          <div className="text-blue-400">Portal Open!</div>
        ) : (
          <div>Portal: {countdown}s</div>
        )}
      </div>

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