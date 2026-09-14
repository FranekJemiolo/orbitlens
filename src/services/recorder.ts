export interface RecordingResult {
  blob: Blob;
  url: string;
  filename: string;
}

export class ARRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private compositingCanvas: HTMLCanvasElement | null = null;
  private animFrameId: number | null = null;
  private isRecording = false;

  startRecording(
    videoElement: HTMLVideoElement | null,
    webglCanvas: HTMLCanvasElement | null,
  ): boolean {
    if (!webglCanvas) {
      throw new Error("WebGL Canvas is not available for recording.");
    }

    this.recordedChunks = [];
    const width = webglCanvas.width || 1080;
    const height = webglCanvas.height || 1920;

    // Create off-screen compositing canvas
    this.compositingCanvas = document.createElement("canvas");
    this.compositingCanvas.width = width;
    this.compositingCanvas.height = height;
    const ctx = this.compositingCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context for compositing.");
    }

    this.isRecording = true;

    // Continuous 30fps composite loop
    const compositeLoop = () => {
      if (!this.isRecording) return;

      // 1. Draw video background
      if (videoElement && videoElement.readyState >= 2) {
        ctx.drawImage(videoElement, 0, 0, width, height);
      } else {
        // Fallback dark sky background if video stream not ready
        ctx.fillStyle = "#0B0E14";
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Draw WebGL celestial overlay
      ctx.drawImage(webglCanvas, 0, 0, width, height);

      this.animFrameId = requestAnimationFrame(compositeLoop);
    };

    compositeLoop();

    // Capture 30fps stream
    const stream = this.compositingCanvas.captureStream(30);

    // Determine supported mimeType
    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    let selectedMimeType = "";
    for (const mime of mimeTypes) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(mime)
      ) {
        selectedMimeType = mime;
        break;
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(
        stream,
        selectedMimeType ? { mimeType: selectedMimeType } : undefined,
      );

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // 100ms timeslices
      return true;
    } catch (err) {
      this.isRecording = false;
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      console.error("Failed to start MediaRecorder:", err);
      throw err;
    }
  }

  async stopRecording(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        reject(new Error("MediaRecorder is not active."));
        return;
      }

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        if (this.animFrameId) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }

        const mimeType = this.mediaRecorder?.mimeType || "video/webm";
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const filename = `orbitlens-session-${Date.now()}.${ext}`;

        // Auto trigger download via anchor tag
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);

        // Dispatch download event for E2E testing
        window.dispatchEvent(
          new CustomEvent("orbitlens:recording-downloaded", {
            detail: { filename, blobSize: blob.size },
          }),
        );

        resolve({ blob, url, filename });
      };

      this.mediaRecorder.stop();
    });
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}

export const recorderService = new ARRecorderService();
