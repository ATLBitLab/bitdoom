import { useEffect, useRef, useState } from 'react';

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState(1);

  useEffect(() => {
    const tracks = [1, 2, 3, 4];
    
    const playRandomTrack = () => {
      const randomTrack = Math.floor(Math.random() * tracks.length) + 1;
      setCurrentTrack(randomTrack);
      
      if (audioRef.current) {
        audioRef.current.src = `/music-${randomTrack}.mp3`;
        audioRef.current.volume = 0.3; // Set volume to 30%
        audioRef.current.play().catch(error => {
          console.log('Audio playback failed:', error);
        });
      }
    };

    // Create audio element
    audioRef.current = new Audio();
    audioRef.current.loop = false;

    // Play first random track
    playRandomTrack();

    // Set up ended event listener to play next random track
    const handleEnded = () => {
      playRandomTrack();
    };
    audioRef.current.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return null; // This component doesn't render anything
} 