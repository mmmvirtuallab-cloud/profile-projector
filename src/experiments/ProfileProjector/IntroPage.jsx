import React from "react";
import { useNavigate } from "react-router-dom";
import { INTRO_CONTENT } from "./data/intro_data";
import "./IntroPage.css";

const IntroPage = () => {
  const navigate = useNavigate();

  // Function to handle external navigation to the main site Home
  const handleHomeClick = () => {
    // This breaks out of the HashRouter (#) and goes to domain.com/home/
    window.location.href = "/home/";
  };

  return (
    <div className="intro-container">
      {/* Header */}
      <header className="intro-header">
        <div className="header-title">{INTRO_CONTENT.headerTitle}</div>

        {/* Buttons Wrapper */}
        <div className="header-actions">
          {/* HOME BUTTON - Exits the React App */}
          <button className="header-btn home-btn" onClick={handleHomeClick}>
            Home
          </button>

          {/* EXPERIMENT BUTTON - Navigates inside the App */}
          <button
            className="header-btn"
            // If the link is internal (like '/lab'), use navigate.
            // If it's external in your data, keep window.open or navigate as needed.
            // Assuming based on your Router that you want to go to '/lab':
            onClick={() => navigate("/lab")}
          >
            {INTRO_CONTENT.buttonLabel} →
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="content-wrapper">
        <div className="info-card">
          <h1>{INTRO_CONTENT.mainHeading}</h1>
          <hr className="divider" />

          <div className="description-area">
            <div className="aim-section">
              <h3>{INTRO_CONTENT.aimTitle}</h3>
              <p>{INTRO_CONTENT.aimContent}</p>
            </div>

            <div className="ack-section">
              <h3>{INTRO_CONTENT.ackTitle}</h3>
              <p>{INTRO_CONTENT.ackContent}</p>
            </div>

            {/* Student List Grid */}
            <ul className="student-list">
              {INTRO_CONTENT.students.map((student, index) => (
                <li key={index}>{student}</li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="intro-footer">
        <p
          dangerouslySetInnerHTML={{
            __html:
              INTRO_CONTENT.footerText ||
              "Developed and coordinated by: Dr. S.Vijayakumar, Dr.S.Sathish Department of Production Technology, MIT Campus, Anna University, Chennai.",
          }}
        />
      </footer>
    </div>
  );
};

export default IntroPage;
