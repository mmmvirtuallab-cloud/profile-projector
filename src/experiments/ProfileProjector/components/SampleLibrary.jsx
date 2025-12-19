import React from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./SampleLibrary.module.css";

const BASE_URL_PREFIX = import.meta.env.BASE_URL || "/";

const HARDCODED_SAMPLES = {
  "profile-projector": [
    {
      id: "gear",
      name: "Gear",
      imageUrl: BASE_URL_PREFIX + "assets/samples/gear.png",
      diameter: "44.00 mm",
      angle: "20°",
      type: "image",
    },
    {
      id: "screw",
      name: "Threaded Screw",
      imageUrl: BASE_URL_PREFIX + "assets/samples/screw.png",
      screwDiameter: "17.00 mm",
      pitch: "0.8 mm",
      type: "image",
    },
    {
      id: "v-profile",
      name: "V-Profile",
      imageUrl: BASE_URL_PREFIX + "assets/samples/thread.png",
      type: "image",
      angle: "60.00°", // Included angle
    },
  ],
};

const mockFetchExperimentSamples = async (experimentId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(HARDCODED_SAMPLES[experimentId] || []);
    }, 500);
  });
};

// **Helper to get the required sample ID for a tutorial**
const getRequiredSampleId = (tutorialName) => {
  switch (tutorialName) {
    case "GEAR_OD":
      return "gear";
    case "SCREW_OD":
      return "screw";
    case "ANGLE_MEASURE":
      return "v-profile";
    default:
      return null; // No specific sample required
  }
};

function SampleLibrary({
  onSampleSelect,
  selectedSampleId,
  highlightTargetId,
  disabled, // General tutorial active state
  activeTutorialName, // **<-- RECEIVE THIS PROP**
}) {
  const experimentId = "profile-projector";

  const {
    data: samples,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["samples", experimentId],
    queryFn: () => mockFetchExperimentSamples(experimentId),
  });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading samples...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>Error loading samples.</p>
      </div>
    );
  }

  if (!samples || samples.length === 0) {
    return (
      <div className={styles.container}>
        <p>No samples found.</p>
      </div>
    );
  }

  // Get the ID of the sample required by the current tutorial
  const requiredSampleId = getRequiredSampleId(activeTutorialName);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Sample Library</h3>
      <div className={styles.sampleGrid}>
        {samples.map((sample) => {
          // **THE FIX: Refined disabling logic**
          let isDisabled = false;
          if (disabled) {
            // Is a tutorial active?
            if (highlightTargetId === `sample-${sample.id}`) {
              // If this specific sample is highlighted (like in step 1), enable it.
              isDisabled = false;
            } else if (requiredSampleId && sample.id !== requiredSampleId) {
              // If a specific sample is required and this isn't it, disable it.
              isDisabled = true;
            } else if (
              !requiredSampleId &&
              highlightTargetId?.startsWith("sample-")
            ) {
              // If NO specific sample required, but SOME sample is highlighted (unlikely), disable others.
              isDisabled = true;
            } else if (!highlightTargetId?.startsWith("sample-")) {
              // If tutorial is active but NOT currently asking to select a sample, disable all.
              isDisabled = true;
            }
          }

          return (
            <button
              key={sample.id}
              onClick={() => onSampleSelect(sample)}
              className={`${styles.sampleButton} ${
                selectedSampleId === sample.id ? styles.selected : ""
              }`}
              id={`sample-${sample.id}`}
              disabled={isDisabled} // Use the refined logic
            >
              {sample.imageUrl ? (
                <div
                  className={styles.sampleProfile}
                  style={{ backgroundImage: `url(${sample.imageUrl})` }}
                ></div>
              ) : (
                <div
                  className={`${styles.sampleProfile} ${styles.cssSampleIcon}`}
                >
                  <span> {sample.name.charAt(0)} </span>
                </div>
              )}
              <span className={styles.sampleName}>{sample.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SampleLibrary;
