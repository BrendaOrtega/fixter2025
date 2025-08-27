import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AudioPlayer from "../AudioPlayer";

// Mock the audio element
const mockAudio = {
  play: vi.fn(),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 180,
  volume: 1,
};

// Mock HTMLAudioElement
Object.defineProperty(window, "HTMLAudioElement", {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudio),
});

describe("AudioPlayer", () => {
  const defaultProps = {
    postId: "test-post-id",
    postTitle: "Test Post Title",
    postBody: "This is a test post body content for audio generation.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in idle state initially", () => {
    render(<AudioPlayer {...defaultProps} />);

    expect(screen.getByText("Audio: Test Post Title")).toBeInTheDocument();
    expect(screen.getByText("Listo para generar")).toBeInTheDocument();
    expect(screen.getByText("Generar Audio")).toBeInTheDocument();
  });

  it("shows loading state when generating audio", async () => {
    render(<AudioPlayer {...defaultProps} />);

    const generateButton = screen.getByText("Generar Audio");
    fireEvent.click(generateButton);

    expect(screen.getByText("Generando audio del post...")).toBeInTheDocument();
    expect(
      screen.getByText("Esto puede tomar unos segundos")
    ).toBeInTheDocument();
  });

  it("shows audio controls after successful generation", async () => {
    render(<AudioPlayer {...defaultProps} />);

    const generateButton = screen.getByText("Generar Audio");
    fireEvent.click(generateButton);

    // Wait for the mock generation to complete
    await waitFor(
      () => {
        expect(screen.getByText("Audio listo")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Check for audio controls
    expect(screen.getByRole("button")).toBeInTheDocument(); // Play button
    expect(screen.getByRole("slider")).toBeInTheDocument(); // Volume slider
  });

  it("handles play/pause functionality", async () => {
    render(<AudioPlayer {...defaultProps} />);

    // Generate audio first
    const generateButton = screen.getByText("Generar Audio");
    fireEvent.click(generateButton);

    await waitFor(
      () => {
        expect(screen.getByText("Audio listo")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Find and click play button
    const playButton = screen.getByRole("button");
    fireEvent.click(playButton);

    expect(mockAudio.play).toHaveBeenCalled();
  });

  it("handles volume changes", async () => {
    render(<AudioPlayer {...defaultProps} />);

    // Generate audio first
    const generateButton = screen.getByText("Generar Audio");
    fireEvent.click(generateButton);

    await waitFor(
      () => {
        expect(screen.getByText("Audio listo")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Find volume slider and change it
    const volumeSlider = screen.getByRole("slider");
    fireEvent.change(volumeSlider, { target: { value: "0.5" } });

    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <AudioPlayer {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("formats time correctly", async () => {
    render(<AudioPlayer {...defaultProps} />);

    // Generate audio first
    const generateButton = screen.getByText("Generar Audio");
    fireEvent.click(generateButton);

    await waitFor(
      () => {
        expect(screen.getByText("Audio listo")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Check time formatting (should show 0:00 and 3:00 for 180 seconds)
    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(screen.getByText("3:00")).toBeInTheDocument();
  });

  it("shows error state and retry functionality", async () => {
    // Mock a failed generation
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<AudioPlayer {...defaultProps} />);

    const generateButton = screen.getByText("Generar Audio");
    fireEvent.click(generateButton);

    await waitFor(
      () => {
        expect(screen.getByText("Error generando audio")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Check retry button exists
    expect(screen.getByText("Reintentar")).toBeInTheDocument();

    // Restore fetch
    global.fetch = originalFetch;
  });
});
