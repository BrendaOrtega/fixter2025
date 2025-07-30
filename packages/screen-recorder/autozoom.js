/**
 * AutoZoom Class
 * Simulates intelligent zoom functionality similar to Screen Studio
 */
class AutoZoom {
  /**
   * Initialize the AutoZoom functionality
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Configuration options
    this.sensitivity = options.sensitivity || 0.5;
    this.transitionSpeed = options.transitionSpeed || 0.8;
    this.maxZoomLevel = options.maxZoomLevel || 1.5;
    this.isEnabled = options.enabled !== undefined ? options.enabled : true;

    // Callback for zoom level changes
    this.onZoom = options.onZoom || function () {};

    // Internal state
    this.currentFocus = null;
    this.previewElement = options.previewElement;
    this.zoomElement = options.zoomElement;
    this.areasOfInterest = [];
    this.activeArea = null;
    this.animationFrameId = null;
    this.highlightElement = null;
    this.currentZoomLevel = 1.0;

    // Initialize the highlight element for visualizing detected areas
    this._createHighlightElement();
  }

  /**
   * Create the highlight element to show detected areas of interest
   * @private
   */
  _createHighlightElement() {
    this.highlightElement = document.createElement("div");
    this.highlightElement.className = "zoom-highlight";
    this.highlightElement.style.display = "none";
    if (this.previewElement) {
      this.previewElement.appendChild(this.highlightElement);
    }
  }

  /**
   * Start the autozoom analysis
   */
  start() {
    if (!this.isEnabled) return;

    // Use requestAnimationFrame to continuously analyze the screen
    const analyze = () => {
      this._analyzeFrame();
      this.animationFrameId = requestAnimationFrame(analyze);
    };

    analyze();
  }

  /**
   * Stop the autozoom analysis
   */
  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this._resetZoom();
  }

  /**
   * Toggle the autozoom functionality
   * @param {boolean} enabled - Whether autozoom should be enabled
   */
  toggle(enabled) {
    this.isEnabled = enabled;

    if (!this.isEnabled) {
      this.stop();
      this._resetZoom();
    } else {
      this.start();
    }
  }

  /**
   * Update autozoom sensitivity
   * @param {number} value - New sensitivity value (0.1 to 1)
   */
  updateSensitivity(value) {
    this.sensitivity = parseFloat(value) || 0.5;
  }

  /**
   * Update transition speed
   * @param {number} value - New transition speed value (0.3 to 2)
   */
  updateTransitionSpeed(value) {
    this.transitionSpeed = parseFloat(value) || 0.8;
    if (this.zoomElement) {
      this.zoomElement.style.transition = `transform ${this.transitionSpeed}s ease-out`;
    }
  }

  /**
   * Analyze the current frame to identify areas of interest
   * @private
   */
  _analyzeFrame() {
    if (!this.isEnabled || !this.previewElement || !this.zoomElement) return;

    // In a real implementation, this would analyze the video frame
    // For our prototype, we'll use mouse position and predefined areas

    // Check if there's a current active area and if we should keep focusing on it
    if (this._shouldSwitchFocus()) {
      const newArea = this._findNewAreaOfInterest();
      if (newArea && newArea !== this.activeArea) {
        this._focusOnArea(newArea);
      }
    }
  }

  /**
   * Determine if we should switch focus to a new area
   * @private
   * @returns {boolean} True if we should find a new area to focus on
   */
  _shouldSwitchFocus() {
    // In a real implementation, this would use more sophisticated logic
    // For the prototype, we'll use a simple time-based approach or input changes

    // If no active area, definitely switch
    if (!this.activeArea) return true;

    // For demo, switch focus every few seconds or on significant events
    const shouldSwitch = Math.random() < 0.01 * this.sensitivity;
    return shouldSwitch;
  }

  /**
   * Find a new area of interest to focus on
   * @private
   * @returns {Object|null} Area of interest with coordinates and dimensions
   */
  _findNewAreaOfInterest() {
    // In a real implementation, this would use computer vision and heuristics
    // For our prototype, we'll return predefined areas or cursor position-based areas

    // Get the cursor position if available (from our demo cursor)
    const cursor = document.getElementById("cursor");
    const cursorVisible =
      cursor && window.getComputedStyle(cursor).display !== "none";

    if (cursorVisible) {
      // Extract position from cursor element's transform
      const transform = window.getComputedStyle(cursor).transform;
      const matrix = new DOMMatrix(transform);
      const cursorX = matrix.m41 + cursor.offsetWidth / 2;
      const cursorY = matrix.m42 + cursor.offsetHeight / 2;

      // Find the nearest element of interest to the cursor
      // In a real implementation, this would be more sophisticated
      const elements = this.previewElement.querySelectorAll(".editor-line");
      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        const previewRect = this.previewElement.getBoundingClientRect();

        // Normalize coordinates relative to the preview element
        const normalizedRect = {
          left: rect.left - previewRect.left,
          top: rect.top - previewRect.top,
          width: rect.width,
          height: rect.height,
          element: element,
        };

        // Check if cursor is near this element
        const isNearCursor =
          cursorX >= normalizedRect.left - 50 &&
          cursorX <= normalizedRect.left + normalizedRect.width + 50 &&
          cursorY >= normalizedRect.top - 50 &&
          cursorY <= normalizedRect.top + normalizedRect.height + 50;

        if (isNearCursor) {
          return normalizedRect;
        }
      }
    }

    // If no area is found near cursor, check if there's an active line (for demo)
    const activeLine = this.previewElement.querySelector(".cursor-line");
    if (activeLine) {
      const rect = activeLine.getBoundingClientRect();
      const previewRect = this.previewElement.getBoundingClientRect();

      return {
        left: rect.left - previewRect.left,
        top: rect.top - previewRect.top,
        width: rect.width,
        height: rect.height,
        element: activeLine,
      };
    }

    // If no specific area, return a default area (center of the screen)
    if (this.previewElement) {
      return {
        left: this.previewElement.offsetWidth * 0.25,
        top: this.previewElement.offsetHeight * 0.25,
        width: this.previewElement.offsetWidth * 0.5,
        height: this.previewElement.offsetHeight * 0.5,
      };
    }

    return null;
  }

  /**
   * Focus on a specific area of interest
   * @private
   * @param {Object} area - Area with coordinates and dimensions
   */
  _focusOnArea(area) {
    if (!this.zoomElement || !this.isEnabled) return;

    this.activeArea = area;

    // Show the highlight on the area of interest
    this._showHighlight(area);

    // Calculate the transform needed for the zoom effect
    const transform = this._calculateZoomTransform(area);

    // Store current zoom level
    this.currentZoomLevel = transform.zoomLevel;

    // Notify about zoom level change
    this.onZoom(transform.zoomLevel);

    // Apply the transform to the zoom view
    this.zoomElement.style.transform = transform.transform;
    this.zoomElement.style.transition = `transform ${this.transitionSpeed}s ease-out`;
  }

  /**
   * Calculate the CSS transform needed to zoom to an area
   * @private
   * @param {Object} area - Area with coordinates and dimensions
   * @returns {Object} Transform object with CSS properties
   */
  _calculateZoomTransform(area) {
    if (!this.previewElement || !this.zoomElement) {
      return { transform: "scale(1) translate(0, 0)" };
    }

    // Increase base zoom level for more pronounced effect
    const baseZoom = Math.max(2.5, this.maxZoomLevel);
    const areaSize = Math.max(area.width, area.height);
    const containerSize = Math.max(
      this.previewElement.offsetWidth,
      this.previewElement.offsetHeight
    );

    // Dynamic zoom calculation with more aggressive scaling
    // Smaller areas get higher zoom
    let zoomLevel = baseZoom * (1 - (areaSize / containerSize) * 0.3);

    // Ensure zoom is significantly noticeable (minimum 2x)
    zoomLevel = Math.max(2.0, Math.min(zoomLevel, baseZoom + 1));

    // Calculate center of the area
    const centerX = area.left + area.width / 2;
    const centerY = area.top + area.height / 2;

    // The following calculation is crucial for proper zoom effect:
    // 1. We find the center point of our area of interest
    // 2. We calculate how much to move the view so this point becomes centered
    // 3. We adjust this offset based on the zoom level

    // Calculate the position in the container where we want our point of interest to be
    const targetX = this.previewElement.offsetWidth / 2;
    const targetY = this.previewElement.offsetHeight / 2;

    // Calculate the difference between where the point is and where we want it
    const diffX = targetX - centerX;
    const diffY = targetY - centerY;

    // Apply this translation, adjusting for the zoom level
    // This is what creates the true "zoom to this area" effect
    return {
      transform: `scale(${zoomLevel}) translate(${diffX / zoomLevel}px, ${
        diffY / zoomLevel
      }px)`,
      zoomLevel: zoomLevel, // Return the zoom level so we can use it elsewhere
    };
  }

  /**
   * Show highlight around the current area of interest
   * @private
   * @param {Object} area - Area with coordinates and dimensions
   */
  _showHighlight(area) {
    if (!this.highlightElement || !this.isEnabled) return;

    this.highlightElement.style.display = "block";
    this.highlightElement.style.left = `${area.left}px`;
    this.highlightElement.style.top = `${area.top}px`;
    this.highlightElement.style.width = `${area.width}px`;
    this.highlightElement.style.height = `${area.height}px`;

    // Fade out the highlight after a short delay
    setTimeout(() => {
      this.highlightElement.style.opacity = "0";

      // Hide completely after transition
      setTimeout(() => {
        this.highlightElement.style.display = "none";
        this.highlightElement.style.opacity = "1";
      }, 500);
    }, 1000);
  }

  /**
   * Reset zoom to default state
   * @private
   */
  _resetZoom() {
    if (this.zoomElement) {
      this.zoomElement.style.transform = "scale(1) translate(0, 0)";
    }

    if (this.highlightElement) {
      this.highlightElement.style.display = "none";
    }

    // Reset zoom level and notify
    this.currentZoomLevel = 1.0;
    this.onZoom(this.currentZoomLevel);

    this.activeArea = null;
  }
}
