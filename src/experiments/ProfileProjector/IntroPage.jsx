import React from "react";
import { useNavigate } from "react-router-dom";
import { INTRO_CONTENT } from "./data/intro_data";
import "./IntroPage.css";

const IntroPage = () => {
  const navigate = useNavigate();

  return (
    <div className="intro-container">
      {/* Header */}
      <header className="intro-header">
        <div className="header-title">{INTRO_CONTENT.headerTitle}</div>
        <button
          className="header-btn"
          onClick={() => navigate(INTRO_CONTENT.buttonLink)}
        >
          {INTRO_CONTENT.buttonLabel} →
        </button>
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

      {/* Footer (Clean Single Line) */}
      <footer className="intro-footer">
        {/* Using a simple string or dangerouslySetInnerHTML if you have entities like &copy; */}
        <p
          dangerouslySetInnerHTML={{
            __html:
              INTRO_CONTENT.footerText ||
              "&copy; 2025 Virtual Laboratory. Department of Mechanical Engineering.",
          }}
        />
      </footer>
    </div>
  );
};

export default IntroPage;
