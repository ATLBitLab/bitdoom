import React, { useState } from "react";
import { Game } from "./components/Game";
import { Menu } from "./components/Menu";

function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);

  return (
    <div className="w-screen h-screen">
      {!isGameStarted && <Menu onGameStart={() => setIsGameStarted(true)} />}
      <Game />
    </div>
  );
}

export default App;
