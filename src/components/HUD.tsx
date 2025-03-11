import { Infinity } from 'lucide-react';

export function HUD() {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-between items-center bg-black bg-opacity-50 text-white">
      <div className="flex items-center gap-8">
        <div>
          <span className="font-bold">Health: </span>
          <span className="text-green-400">100%</span>
        </div>
        <div>
          <span className="font-bold">Bitcoin: </span>
          <span className="text-yellow-400">1000 sats</span>
        </div>
        <div className="flex items-center">
          <span className="font-bold mr-2">Ammo: </span>
          <Infinity className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}