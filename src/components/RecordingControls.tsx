import React, { useState, useEffect, useRef } from "react";
import { Video, Square, CheckCircle2 } from "lucide-react";
import { recorderService } from "../services/recorder";
import { soundService } from "../services/audio";

interface RecordingControlsProps {
  videoElement: HTMLVideoElement | null;
  webglCanvas: HTMLCanvasElement | null;
  isNightVision: boolean;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  videoElement,
  webglCanvas,
  isNightVision,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleStartRecording = () => {
    try {
      soundService.playRecordSound(true);
      recorderService.startRecording(videoElement, webglCanvas);
      setRecordDuration(0);
      setIsRecording(true);
      setDownloadSuccess(false);
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const handleStopRecording = async () => {
    try {
      soundService.playRecordSound(false);
      await recorderService.stopRecording();
      setIsRecording(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error("Error stopping recording:", err);
      setIsRecording(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div
      className="absolute top-20 right-3 z-30 pointer-events-auto"
      data-testid="recording-controls"
      data-recording-state={
        isRecording ? "recording" : downloadSuccess ? "downloaded" : "idle"
      }
    >
      {!isRecording ? (
        <button
          onClick={handleStartRecording}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition shadow-xl border backdrop-blur-md ${
            isNightVision
              ? "bg-red-950/80 border-red-500 text-red-400 hover:bg-red-900/80"
              : "bg-astro-dark/80 border-astro-accent/40 text-astro-text hover:border-astro-accent"
          }`}
          data-testid="record-button"
          title="Record AR Night Sky Session"
        >
          {downloadSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">SAVED!</span>
            </>
          ) : (
            <>
              <Video className="w-4 h-4 text-astro-alert animate-pulse" />
              <span>RECORD</span>
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-red-950/90 border border-red-500 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-xs font-bold text-red-200">
              REC {formatTimer(recordDuration)}
            </span>
          </div>
          <button
            onClick={handleStopRecording}
            className="p-1 rounded bg-red-600 hover:bg-red-700 text-white transition ml-1"
            data-testid="stop-record-button"
            title="Stop and Download Video"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
};
