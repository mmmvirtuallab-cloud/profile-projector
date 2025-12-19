import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";

// Import only the IntroPage and the LabPage
import IntroPage from "./experiments/ProfileProjector/IntroPage";
import ProfileProjectorLabPage from "./experiments/ProfileProjector/LabPage";

function App() {
  return (
    <Router>
      <Routes>
        {/* --- 1. Info / Intro Page (Home) --- */}
        <Route path="/" element={<IntroPage />} />

        {/* --- 2. Dedicated Full-Screen Lab Route --- */}
        <Route
          path="/lab/profile-projector"
          element={<ProfileProjectorLabPage />}
        />
      </Routes>
    </Router>
  );
}

export default App;
