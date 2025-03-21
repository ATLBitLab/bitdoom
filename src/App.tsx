import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Game } from "./components/Game";
import { Menu } from "./components/Menu";
import { useState } from "react";

function App() {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <Router>
      <div className="w-screen h-screen bg-black">
        <Routes>
          <Route
            path="/"
            element={
              <div className="w-full h-full">
                {!gameStarted ? (
                  <Menu onGameStart={() => setGameStarted(true)} />
                ) : (
                  <Game />
                )}
              </div>
            }
          />
          <Route
            path="/claim"
            element={
              <div className="w-full h-full">
                <Game />
              </div>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
