import { useEffect, useRef, useState } from 'react';

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState(1);

  useEffect(() => {
    const tracks = [1, 2, 3, 4];
    
    const playRandomTrack = async () => {
      try {
        const randomTrack = Math.floor(Math.random() * tracks.length) + 1;
        setCurrentTrack(randomTrack);
        
        if (audioRef.current) {
          console.log('Setting up audio track:', randomTrack);
          audioRef.current.src = `/music-${randomTrack}.mp3`;
          audioRef.current.volume = 0.3;
          audioRef.current.loop = true;
          
          // Try to play and handle any autoplay restrictions
          const playResult = await audioRef.current.play();
          console.log('Audio playback started successfully');
          
          // Add error listener to catch any playback issues
          audioRef.current.onerror = (e) => {
            console.error('Audio playback error:', e);
          };
        }
      } catch (error) {
        console.log('Audio playback failed, trying to recover:', error);
        // If autoplay was blocked, add click listener to start playback
        const handleClick = async () => {
          try {
            if (audioRef.current) {
              await audioRef.current.play();
              console.log('Audio playback started after user interaction');
              document.removeEventListener('click', handleClick);
            }
          } catch (e) {
            console.error('Failed to play audio after click:', e);
          }
        };
        document.addEventListener('click', handleClick);
      }
    };

    // Create audio element
    console.log('Creating audio element');
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto'; // Preload the audio file

    // Play first random track
    playRandomTrack();

    // Cleanup
    return () => {
      console.log('Cleaning up audio');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onerror = null;
        audioRef.current = null;
      }
    };
  }, []);

  return null; // This component doesn't render anything
} 