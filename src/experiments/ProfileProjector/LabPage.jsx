import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
// We don't fetch samples here, SampleLibrary handles its mock data
// import { useQuery } from "@tanstack/react-query";
// import { fetchExperimentSamples } from "../../repositories/lab_repo";

import ControlPanel from "./components/ControlPanel";
import ProjectorScreen from "./components/ProjectorScreen";
import LabTutorial from "./LabTutorial";
import { TUTORIAL_SCRIPTS } from "./data/TutorialsData";
import HighlightOverlay from "./components/HighlightOverlay";
import styles from "./components/LabLayout.module.css";
import warningStyles from "./components/MobileWarning.module.css";

const VIRTUAL_CALIBRATION_LENGTH_PIXELS = 400;
const REAL_CALIBRATION_LENGTH_MM = 100;
const correctionFactor =
  REAL_CALIBRATION_LENGTH_MM / VIRTUAL_CALIBRATION_LENGTH_PIXELS; // 0.25

const GEAR_ALIGN_TARGET_Y_TOP = -86;
const GEAR_ALIGN_TARGET_Y_BOTTOM = 84;
const SCREW_ALIGN_TARGET_Y_TOP = -34;
const SCREW_ALIGN_TARGET_Y_BOTTOM = 46;

// --- Pixel Targets for Angle Tutorial ---
const ANGLE_TARGETS = {
  23: { x: 52, y: 22 }, // Point 1: X: 13.000, Y: -5.500
  25: { x: 28, y: -22 }, // Point 2: X: 7.000, Y: 5.500
  27: { x: -28, y: -22 }, // Point 3: X: -7.000, Y: 5.500
  29: { x: -52, y: 22 }, // Point 4: X: -13.000, Y: -5.500
};

// **REMOVED HARDCODED_SAMPLES definition from here**

function ProfileProjectorLabPage() {
  const navigate = useNavigate(); // Get the navigate function
  const { experimentId } = useParams();

  // --- NEW: State to track if the device is mobile ---
  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 768 // Initial check
  );
  // --- Core State ---
  const [pointPosition, setPointPosition] = useState({ x: 0, y: 0 });
  const [zeroOffset, setZeroOffset] = useState({ x: 0, y: 0 });
  const [magnification, setMagnification] = useState(10);
  const [selectedSample, setSelectedSample] = useState(null);
  const [currentUnit, setCurrentUnit] = useState("mm");
  const [measuredData, setMeasuredData] = useState(null);

  // --- Tutorial State ---
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const [activeTutorialName, setActiveTutorialName] = useState(null);

  // --- Angle State ---
  const [isAngleMode, setIsAngleMode] = useState(false);
  const [anglePoints, setAnglePoints] = useState([]);
  const [calculatedAngle, setCalculatedAngle] = useState(null);

  // --- Refs ---
  const keysPressed = useRef({});
  const animationFrameId = useRef();
  const mainContainerRef = useRef(null);

  // --- Derived State (Tutorials) ---
  const activeSteps = activeTutorialName
    ? TUTORIAL_SCRIPTS[activeTutorialName].steps
    : [];
  const currentStepData = activeSteps.find(
    (step) => step.id === currentTutorialStep
  );

  const tutorialMessage = activeTutorialName
    ? currentStepData
      ? currentStepData.message
      : TUTORIAL_SCRIPTS[activeTutorialName].startMessage
    : "Click Gear Outer Diameter/Screw Outer diameter/Thread angle measurement";
  const highlightTargetId = currentStepData ? currentStepData.targetId : null;

  const showAlignmentLine =
    activeTutorialName === "GEAR_OD" &&
    (currentTutorialStep === 3 || currentTutorialStep === 5);

  // Determine if a tutorial is active (used for disabling logic)
  const isTutorialActive = !!activeTutorialName;

  // --- Helper Function to Advance Tutorial ---
  const advanceTutorial = useCallback(() => {
    const activeTutorial = TUTORIAL_SCRIPTS[activeTutorialName];
    if (!activeTutorial) return;

    const currentStepIndex = activeTutorial.steps.findIndex(
      (step) => step.id === currentTutorialStep
    );

    if (
      currentStepIndex === -1 ||
      currentStepIndex + 1 >= activeTutorial.steps.length
    ) {
      // Check if we just completed an angle measurement by adding the last point
      if (
        activeTutorialName === "ANGLE_MEASURE" &&
        anglePoints.length === 4 &&
        currentTutorialStep === 30
      ) {
        // Advance from step 30 ('Add Point 4') to step 31 ('Measurement Complete')
        setCurrentTutorialStep(31);
        console.log(
          "Angle measurement calculation done, moving to final step."
        );
      } else {
        console.log("Already at last step or step not found.");
      }
      return;
    }

    // Advance to the next step's ID
    setCurrentTutorialStep(activeTutorial.steps[currentStepIndex + 1].id);
  }, [activeTutorialName, currentTutorialStep, anglePoints.length]);

  // --- Tutorial and State Resets ---
  const startTutorial = (name) => {
    // Reset all relevant states
    setMeasuredData(null);
    setPointPosition({ x: 0, y: 0 });
    setZeroOffset({ x: 0, y: 0 });
    setIsAngleMode(false);
    setAnglePoints([]);
    setCalculatedAngle(null);
    setMagnification(10); // Reset magnification
    setCurrentUnit("mm"); // Reset unit

    if (name) {
      setActiveTutorialName(name);
      const firstStepId = TUTORIAL_SCRIPTS[name]?.steps[0]?.id || 0;
      setCurrentTutorialStep(firstStepId);
      // Let the first step's highlight handle sample selection
      setSelectedSample(null); // Deselect sample initially
    } else {
      setActiveTutorialName(null);
      setCurrentTutorialStep(0);
      setSelectedSample(null);
    }
    mainContainerRef.current?.focus(); // Focus for keyboard events
  };

  // --- Core Lab Functions ---
  const movePoint = useCallback(
    (axis, amount) => {
      setPointPosition((prev) => {
        let newPos = {
          x: axis === "x" ? prev.x + amount : prev.x,
          y: axis === "y" ? prev.y + amount : prev.y,
        };
        const currentPos = prev;

        // Auto-stop and advance logic based on active tutorial
        if (activeTutorialName === "GEAR_OD" && axis === "y") {
          if (currentTutorialStep === 3) {
            // Align Top
            const crossed =
              (currentPos.y > GEAR_ALIGN_TARGET_Y_TOP &&
                newPos.y <= GEAR_ALIGN_TARGET_Y_TOP) ||
              (currentPos.y < GEAR_ALIGN_TARGET_Y_TOP &&
                newPos.y >= GEAR_ALIGN_TARGET_Y_TOP);
            if (crossed) {
              newPos.y = GEAR_ALIGN_TARGET_Y_TOP;
              advanceTutorial();
            }
          } else if (currentTutorialStep === 5) {
            // Align Bottom
            const crossed =
              (currentPos.y > GEAR_ALIGN_TARGET_Y_BOTTOM &&
                newPos.y <= GEAR_ALIGN_TARGET_Y_BOTTOM) ||
              (currentPos.y < GEAR_ALIGN_TARGET_Y_BOTTOM &&
                newPos.y >= GEAR_ALIGN_TARGET_Y_BOTTOM);
            if (crossed) {
              newPos.y = GEAR_ALIGN_TARGET_Y_BOTTOM;
              advanceTutorial();
            }
          }
        } else if (activeTutorialName === "SCREW_OD" && axis === "y") {
          if (currentTutorialStep === 11) {
            // Align Top
            const crossed =
              (currentPos.y > SCREW_ALIGN_TARGET_Y_TOP &&
                newPos.y <= SCREW_ALIGN_TARGET_Y_TOP) ||
              (currentPos.y < SCREW_ALIGN_TARGET_Y_TOP &&
                newPos.y >= SCREW_ALIGN_TARGET_Y_TOP);
            if (crossed) {
              newPos.y = SCREW_ALIGN_TARGET_Y_TOP;
              advanceTutorial();
            }
          } else if (currentTutorialStep === 13) {
            // Align Bottom
            const crossed =
              (currentPos.y > SCREW_ALIGN_TARGET_Y_BOTTOM &&
                newPos.y <= SCREW_ALIGN_TARGET_Y_BOTTOM) ||
              (currentPos.y < SCREW_ALIGN_TARGET_Y_BOTTOM &&
                newPos.y >= SCREW_ALIGN_TARGET_Y_BOTTOM);
            if (crossed) {
              newPos.y = SCREW_ALIGN_TARGET_Y_BOTTOM;
              advanceTutorial();
            }
          }
        } else if (activeTutorialName === "ANGLE_MEASURE") {
          // Target is for the CURRENT alignment step (22, 24, 26, 28)
          const target = ANGLE_TARGETS[currentTutorialStep];
          if (target) {
            if (axis === "x") {
              const crossedX =
                (currentPos.x > target.x && newPos.x <= target.x) ||
                (currentPos.x < target.x && newPos.x >= target.x);
              if (crossedX) {
                newPos.x = target.x; // Arrest X
                // Check if Y is already aligned (within tolerance)
                if (Math.abs(currentPos.y - target.y) < 2) {
                  advanceTutorial(); // Advance if both aligned
                }
              }
            } else if (axis === "y") {
              const crossedY =
                (currentPos.y > target.y && newPos.y <= target.y) ||
                (currentPos.y < target.y && newPos.y >= target.y);
              if (crossedY) {
                newPos.y = target.y; // Arrest Y
                // Check if X is already aligned (within tolerance)
                if (Math.abs(currentPos.x - target.x) < 2) {
                  advanceTutorial(); // Advance if both aligned
                }
              }
            }
          }
        }
        return newPos;
      });
    },
    [currentTutorialStep, activeTutorialName, advanceTutorial]
  );

  const setRelativeZero = (axis) => {
    setZeroOffset((prev) => {
      const newZeroOffset = { ...prev, [axis]: pointPosition[axis] };
      // Advance tutorial if this was the required action
      if (
        currentStepData &&
        currentStepData.targetId === `zero-${axis}-button`
      ) {
        advanceTutorial();
      }
      return newZeroOffset;
    });
  };

  const resetAbsoluteZero = () => {
    setPointPosition({ x: 0, y: 0 });
    setZeroOffset({ x: 0, y: 0 });
    // Advance tutorial if this was the required action (unlikely for absolute zero)
    if (
      currentStepData &&
      currentStepData.targetId === `absolute-zero-button`
    ) {
      advanceTutorial();
    }
  };

  const handleMagnificationChange = (level) => {
    setMagnification(level);
    // Advance tutorial if this was the required action
    if (currentStepData && currentStepData.targetId === `mag-${level}x`) {
      advanceTutorial();
    }
  };

  const handleSampleSelect = (sample) => {
    setSelectedSample(sample);
    // Advance tutorial if this was the required action
    if (currentStepData && currentStepData.targetId === `sample-${sample.id}`) {
      advanceTutorial();
    }
  };

  const handleRecalibrate = () => {
    // Linked to "Home" button
    startTutorial(null);
  };

  // --- Angle Mode Handlers ---
  const toggleAngleMode = () => {
    const newMode = !isAngleMode;
    setIsAngleMode(newMode);
    setAnglePoints([]); // Reset points when toggling
    setCalculatedAngle(null); // Reset calculation
    setMeasuredData(null); // Clear any previous measurement display

    // Advance tutorial if this was the required action
    if (
      newMode &&
      currentStepData &&
      currentStepData.targetId === "angle-mode-toggle-button"
    ) {
      advanceTutorial();
    }
    // If exiting angle mode during the angle tutorial, reset the tutorial
    if (!newMode && activeTutorialName === "ANGLE_MEASURE") {
      startTutorial(null); // Go back to tutorial selection
    }

    mainContainerRef.current?.focus(); // Refocus after button click
  };

  const handleAddPoint = () => {
    if (anglePoints.length >= 4) return; // Max 4 points

    const real_relativeX_mm =
      (pointPosition.x - zeroOffset.x) * correctionFactor;
    const real_relativeY_mm =
      (pointPosition.y - zeroOffset.y) * correctionFactor;

    setAnglePoints((prevPoints) => [
      ...prevPoints,
      // Store the actual DRO values (real mm)
      { x: real_relativeX_mm, y: -real_relativeY_mm }, // Negate Y to match DRO display
    ]);

    // Advance tutorial if this was the required action
    if (currentStepData && currentStepData.targetId === "add-point-button") {
      advanceTutorial();
    }
  };

  // --- Lifecycle Effects ---

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", checkScreenSize);

    // Initial check in case the component mounts after initial load
    checkScreenSize();

    // Cleanup listener on component unmount
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Effect to calculate OD measurement
  useEffect(() => {
    // Skip if in angle mode
    if (isAngleMode) {
      if (measuredData?.userMeasuredDiameter) setMeasuredData(null);
      return;
    }

    let finalY_mm = 0;
    let diameterKey = "diameter";
    let isComplete = false;
    let lastStepId = 0;

    if (
      activeTutorialName &&
      TUTORIAL_SCRIPTS[activeTutorialName]?.steps?.length > 0
    ) {
      const steps = TUTORIAL_SCRIPTS[activeTutorialName].steps;
      lastStepId = steps[steps.length - 1].id;
    }

    isComplete =
      isTutorialActive &&
      currentTutorialStep === lastStepId &&
      lastStepId !== 0;

    if (
      isComplete &&
      (activeTutorialName === "GEAR_OD" || activeTutorialName === "SCREW_OD")
    ) {
      finalY_mm = (pointPosition.y - zeroOffset.y) * correctionFactor;
      diameterKey =
        activeTutorialName === "GEAR_OD" ? "diameter" : "screwDiameter";
    }

    if (
      isComplete &&
      selectedSample &&
      (diameterKey === "diameter" || diameterKey === "screwDiameter")
    ) {
      setMeasuredData({
        [diameterKey]: selectedSample[diameterKey] || selectedSample.diameter,
        angle: selectedSample.angle, // May be undefined
        pitch: selectedSample.pitch, // May be undefined
        userMeasuredDiameter: Math.abs(finalY_mm).toFixed(3) + " mm",
      });
    } else if (!isComplete && measuredData?.userMeasuredDiameter) {
      setMeasuredData(null); // Clear if not complete
    }
  }, [
    currentTutorialStep,
    activeTutorialName,
    pointPosition,
    zeroOffset,
    selectedSample,
    isAngleMode,
    measuredData,
  ]);

  // =================================================================
  // === 📐 EFFECT TO CALCULATE ANGLE (FIXED LOGIC) 📐 ===
  // =================================================================
  useEffect(() => {
    // Skip if not in angle mode or not enough points
    if (!isAngleMode || anglePoints.length !== 4) {
      if (calculatedAngle !== null) setCalculatedAngle(null); // Clear if exiting mode or resetting points
      if (measuredData?.userMeasuredAngle) setMeasuredData(null); // Clear measured data too
      return;
    }

    const [p1, p2, p3, p4] = anglePoints;

    // Create vector for Line 1 (from P1 to P2)
    const v1 = {
      x: p2.x - p1.x,
      y: p2.y - p1.y,
    };

    // Create vector for Line 2 (from P3 to P4)
    const v2 = {
      x: p4.x - p3.x,
      y: p4.y - p3.y,
    };

    // Calculate Dot Product
    const dotProduct = v1.x * v2.x + v1.y * v2.y;

    // Calculate Magnitudes
    const magV1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const magV2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    let angleDeg = 0;

    if (magV1 > 0 && magV2 > 0) {
      // Calculate cosine of the angle
      // We use Math.abs(dotProduct) to always get the acute angle (between 0 and 90)
      // which is what we want for a thread flank.
      let cosTheta = Math.abs(dotProduct) / (magV1 * magV2);

      // Clamp value to [-1, 1] to avoid floating point errors with acos
      cosTheta = Math.min(1.0, Math.max(-1.0, cosTheta));

      // Calculate angle in radians
      const angleRad = Math.acos(cosTheta);

      // Convert to degrees
      angleDeg = angleRad * (180 / Math.PI);
    }

    setCalculatedAngle(angleDeg); // Store the actual calculation for display

    // Update measuredData specifically for angle results
    setMeasuredData({
      referenceAngle: selectedSample?.angle || "60.00°", // Corrected default
      userMeasuredAngle: angleDeg.toFixed(2) + "°",
      // Include other relevant sample data if available
      pitch: selectedSample?.pitch,
    });

    // Advance tutorial automatically AFTER calculation if on the 'add point 4' step
    // Note: The advanceTutorial in handleAddPoint handles advancing *to* the calculation step
    if (currentTutorialStep === 30) {
      // Assuming 30 is the 'Add Point 4' step ID
      advanceTutorial(); // Advance to the final results step (31)
    }
  }, [
    anglePoints,
    isAngleMode,
    selectedSample,
    // correctionFactor is not needed here, already applied in handleAddPoint
    currentTutorialStep,
    advanceTutorial,
  ]);
  // =================================================================
  // === END OF FIXED ANGLE CALCULATION ==============================
  // =================================================================

  // Keyboard Handling Effect
  const handleKeyDown = useCallback(
    (e) => {
      // Allow keyboard movement only if NOT globally disabled (e.g., during specific animations later)
      // AND if the tutorial doesn't require clicking a specific button RIGHT NOW
      const shouldAllowMovement = !(
        isTutorialActive &&
        highlightTargetId &&
        highlightTargetId !== "dro-panel" &&
        highlightTargetId !== "stage-controls-grid" &&
        highlightTargetId !== "projector-screen"
      );

      if (!shouldAllowMovement) return; // Ignore keypress if specific button needs clicking

      const keyAmount = e.shiftKey ? 8 : 1; // Speed adjustment

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          movePoint("y", -keyAmount);
          break;
        case "ArrowDown":
          e.preventDefault();
          movePoint("y", keyAmount);
          break;
        case "ArrowLeft":
          e.preventDefault();
          movePoint("x", -keyAmount);
          break;
        case "ArrowRight":
          e.preventDefault();
          movePoint("x", keyAmount);
          break;
        default:
          break;
      }
    },
    [movePoint, isTutorialActive, highlightTargetId] // Add dependencies
  );

  // Focus container on mount
  useEffect(() => {
    mainContainerRef.current?.focus();
  }, []);

  if (isMobile) {
    return (
      <div className={warningStyles.mobileWarningContainer}>
        <h1>Desktop Recommended</h1>
        <p>
          This virtual lab requires a larger screen. Please switch to a computer
          for the best experience.You can still view the experiment by changing
          to desktop site mode but functionality is limited.
        </p>
        <p>📱➡️💻</p>
        <button
          className={warningStyles.backButton}
          onClick={() => navigate("/")} // CHANGED: Navigate to the Root/Intro Page
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  // --- Render ---
  return (
    <div
      className={styles.labContainer}
      onKeyDown={handleKeyDown}
      tabIndex="0" // Makes div focusable
      ref={mainContainerRef}
      onClick={() => mainContainerRef.current?.focus()} // Refocus on click
    >
      <header className={styles.header}>
        <h1 className="text-xl font-bold">Profile Projector Virtual Lab</h1>
        <button onClick={() => navigate("/")}>← Back to Experiment</button>
      </header>

      <div className={styles.tutorialMessageBar}>
        <span className={styles.tutorialMessageText}>{tutorialMessage}</span>
      </div>

      <div className={styles.mainContent}>
        <HighlightOverlay targetId={highlightTargetId} />

        <div className={styles.tutorialSidebar}>
          <LabTutorial
            activeTutorialName={activeTutorialName}
            currentStepId={currentTutorialStep} // Pass ID, not data object
            onTutorialSelect={startTutorial}
            allTutorials={TUTORIAL_SCRIPTS}
            measuredData={measuredData}
          />
        </div>

        <div className={styles.labContent}>
          <div className={styles.projectorArea} id="projector-screen">
            <ProjectorScreen
              pointPosition={pointPosition}
              selectedSample={selectedSample}
              magnification={magnification}
              showAlignmentLine={showAlignmentLine}
            />
          </div>

          <div className={styles.controlPanelArea}>
            <ControlPanel
              // Pass all necessary props down
              pointPosition={pointPosition}
              zeroOffset={zeroOffset}
              magnification={magnification}
              currentUnit={currentUnit}
              correctionFactor={correctionFactor}
              selectedSample={selectedSample}
              measuredData={measuredData}
              movePoint={movePoint} // Pass down even if not used by ControlPanel buttons
              setRelativeZero={setRelativeZero}
              resetAbsoluteZero={resetAbsoluteZero}
              setMagnification={handleMagnificationChange}
              setCurrentUnit={setCurrentUnit}
              onSampleSelect={handleSampleSelect}
              onRecalibrate={handleRecalibrate}
              highlightTargetId={highlightTargetId}
              currentTutorialStep={currentTutorialStep}
              activeTutorialName={activeTutorialName}
              isTutorialActive={isTutorialActive} // Pass the lock state
              isAngleMode={isAngleMode}
              anglePoints={anglePoints}
              calculatedAngle={calculatedAngle}
              toggleAngleMode={toggleAngleMode}
              handleAddPoint={handleAddPoint}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileProjectorLabPage;
