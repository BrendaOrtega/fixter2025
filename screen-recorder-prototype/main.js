/**
 * Screen Recorder with AutoZoom - Main Script
 * Demonstrates a screen recorder with autozoom functionality similar to Screen Studio
 */
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const autozoomToggle = document.getElementById("autozoomToggle");
  const recordingStatus = document.getElementById("recordingStatus");
  const recordingTime = document.getElementById("recordingTime");
  const recordingPreview = document.getElementById("recordingPreview");
  const zoomView = document.getElementById("zoomView");
  const cursor = document.getElementById("cursor");
  const zoomSensitivity = document.getElementById("zoomSensitivity");
  const transitionSpeed = document.getElementById("transitionSpeed");

  // State
  let isRecording = false;
  let recordingStartTime = 0;
  let recordingTimer = null;
  let cursorAnimationId = null;

  // Zoom indicator element
  const zoomIndicator = document.getElementById("zoomIndicator");

  // Initialize autozoom
  const autozoom = new AutoZoom({
    previewElement: recordingPreview,
    zoomElement: zoomView,
    sensitivity: parseFloat(zoomSensitivity.value),
    transitionSpeed: parseFloat(transitionSpeed.value),
    enabled: autozoomToggle.checked,
    onZoom: updateZoomIndicator,
  });

  // Function to update zoom indicator
  function updateZoomIndicator(zoomLevel) {
    // Update the zoom indicator text
    zoomIndicator.textContent = `ZOOM: ${zoomLevel.toFixed(1)}x`;

    // Add zoom-active class to container for visual feedback
    const container = zoomView.closest(".zoom-view-container");
    if (zoomLevel > 1.1) {
      container.classList.add("zoom-active");
    } else {
      container.classList.remove("zoom-active");
    }
  }

  // Clone content from preview to zoom view for demo
  function updateZoomViewContent() {
    // In a real implementation, this would display the actual captured video
    // For the demo, we'll clone the content
    zoomView.innerHTML = "";
    const clone = recordingPreview
      .querySelector(".demo-content")
      .cloneNode(true);
    zoomView.appendChild(clone);
  }
  updateZoomViewContent();

  // Event Listeners
  startBtn.addEventListener("click", startRecording);
  stopBtn.addEventListener("click", stopRecording);
  autozoomToggle.addEventListener("change", toggleAutoZoom);
  zoomSensitivity.addEventListener("input", updateZoomSettings);
  transitionSpeed.addEventListener("input", updateZoomSettings);

  // Start recording
  function startRecording() {
    if (isRecording) return;

    isRecording = true;
    recordingStartTime = Date.now();

    // Update UI
    startBtn.disabled = true;
    stopBtn.disabled = false;
    recordingStatus.textContent = "Grabando...";
    document.body.classList.add("recording-active");

    // Start timer
    recordingTimer = setInterval(updateRecordingTime, 1000);

    // Start the autozoom
    autozoom.start();

    // Start cursor demo animation for the demo
    startCursorAnimation();

    // In a real implementation, this would start the actual screen recording
    console.log("Recording started");
  }

  // Stop recording
  function stopRecording() {
    if (!isRecording) return;

    isRecording = false;

    // Update UI
    startBtn.disabled = false;
    stopBtn.disabled = true;
    recordingStatus.textContent = "Listo para grabar";
    document.body.classList.remove("recording-active");

    // Stop timer
    clearInterval(recordingTimer);

    // Stop the autozoom
    autozoom.stop();

    // Stop cursor animation
    if (cursorAnimationId) {
      cancelAnimationFrame(cursorAnimationId);
      cursorAnimationId = null;
      cursor.style.display = "none";
    }

    // In a real implementation, this would stop the recording and process the video
    console.log("Recording stopped");

    // Reset the zoom view
    resetZoomView();
  }

  // Toggle autozoom functionality
  function toggleAutoZoom() {
    autozoom.toggle(autozoomToggle.checked);

    if (!autozoomToggle.checked) {
      resetZoomView();
    }
  }

  // Update the autozoom settings
  function updateZoomSettings() {
    autozoom.updateSensitivity(zoomSensitivity.value);
    autozoom.updateTransitionSpeed(transitionSpeed.value);
  }

  // Reset the zoom view to default state
  function resetZoomView() {
    zoomView.style.transform = "scale(1) translate(0, 0)";
    updateZoomViewContent();
  }

  // Update the recording time display
  function updateRecordingTime() {
    if (!isRecording) return;

    const elapsedTime = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (elapsedTime % 60).toString().padStart(2, "0");

    recordingTime.textContent = `${minutes}:${seconds}`;
  }

  // Demo cursor animation for visualizing the autozoom effect with physics-based motion
  function startCursorAnimation() {
    const editorLines = recordingPreview.querySelectorAll(".editor-line");
    const previewRect = recordingPreview.getBoundingClientRect();

    // Show the cursor
    cursor.style.display = "block";

    // Physics-based movement variables
    let currentLineIndex = 0;
    let isMovingToLine = true;
    let currentPosition = { x: previewRect.width / 2, y: 0 };
    let targetPosition = { x: 0, y: 0 };
    let velocity = { x: 0, y: 0 };
    let acceleration = { x: 0, y: 0 };

    // Constants for physics simulation
    const spring = 0.1; // Spring constant (attraction force)
    const damping = 0.8; // Damping factor (reduces oscillation)
    const mass = 10; // Mass (affects acceleration)
    const maxSpeed = 40; // Maximum speed cap
    const minDistance = 3; // Minimum distance to consider "arrived"

    // Timestamps for computing delta time
    let lastTime = performance.now();
    let idleTime = 0; // Time spent idle at a position

    function animateCursor(currentTime) {
      if (!isRecording) return;

      // Calculate time elapsed since last frame in seconds
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (isMovingToLine) {
        // Get the target line
        const line = editorLines[currentLineIndex];
        if (line) {
          const lineRect = line.getBoundingClientRect();

          // Target position is near the beginning of the line
          targetPosition = {
            x: lineRect.left - previewRect.left + 50, // Some padding from left
            y: lineRect.top - previewRect.top + lineRect.height / 2,
          };

          // Calculate distance to target
          const dx = targetPosition.x - currentPosition.x;
          const dy = targetPosition.y - currentPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > minDistance) {
            // Reset idle time when moving
            idleTime = 0;

            // Calculate spring force (F = -kx)
            const forceX = spring * dx;
            const forceY = spring * dy;

            // Apply force (F = ma, so a = F/m)
            acceleration.x = forceX / mass;
            acceleration.y = forceY / mass;

            // Update velocity (v = v + a*t)
            velocity.x += acceleration.x;
            velocity.y += acceleration.y;

            // Apply damping (simulates air resistance)
            velocity.x *= damping;
            velocity.y *= damping;

            // Cap maximum speed for more natural motion
            const speed = Math.sqrt(
              velocity.x * velocity.x + velocity.y * velocity.y
            );
            if (speed > maxSpeed) {
              const ratio = maxSpeed / speed;
              velocity.x *= ratio;
              velocity.y *= ratio;
            }

            // Update position (p = p + v*t)
            currentPosition.x += velocity.x * deltaTime * 60; // Normalize to 60fps
            currentPosition.y += velocity.y * deltaTime * 60;

            // Add slight randomness for more natural movement
            currentPosition.x += (Math.random() - 0.5) * 0.5;
            currentPosition.y += (Math.random() - 0.5) * 0.5;
          } else {
            // We've arrived at the target
            idleTime += deltaTime;

            // Slow down when close to target
            velocity.x *= 0.8;
            velocity.y *= 0.8;

            // Switch to next target after staying at current position
            if (idleTime > 2) {
              // 2 seconds idle time
              isMovingToLine = true;
              currentLineIndex = (currentLineIndex + 1) % editorLines.length;
              idleTime = 0;

              // Add a little "bump" effect when moving to next target
              velocity.x = (Math.random() - 0.5) * 5;
              velocity.y = (Math.random() - 0.5) * 5;
            }
          }

          // Calculate the speed for trail effect
          const speed = Math.sqrt(
            velocity.x * velocity.x + velocity.y * velocity.y
          );

          // Determine movement direction
          const directionX = velocity.x > 0 ? "right" : "left";
          const directionY = velocity.y > 0 ? "down" : "up";
          const primaryDirection =
            Math.abs(velocity.x) > Math.abs(velocity.y)
              ? directionX
              : directionY;

          // Clear previous direction classes
          cursor.classList.remove(
            "moving-left",
            "moving-right",
            "moving-up",
            "moving-down"
          );

          // Add direction class
          if (speed > 5) {
            // Only show direction when moving at significant speed
            cursor.classList.add(`moving-${primaryDirection}`);
          }

          // Toggle fast movement class based on speed
          if (speed > 10) {
            cursor.classList.add("moving-fast");

            // Calculate trail offset based on velocity direction and magnitude
            const trailOffsetX = Math.min(Math.abs(velocity.x) * 0.2, 10);
            const trailOffsetY = Math.min(Math.abs(velocity.y) * 0.2, 10);

            // Set CSS variables for dynamic trail positioning
            cursor.style.setProperty("--offset-x", `${trailOffsetX}px`);
            cursor.style.setProperty("--offset-y", `${trailOffsetY}px`);
          } else {
            cursor.classList.remove("moving-fast");
          }

          // Update cursor position
          cursor.style.left = `${currentPosition.x}px`;
          cursor.style.top = `${currentPosition.y}px`;
        }
      }

      cursorAnimationId = requestAnimationFrame(animateCursor);
    }

    cursorAnimationId = requestAnimationFrame(animateCursor);
  }
});
