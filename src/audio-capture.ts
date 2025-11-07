import * as fs from "fs";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";

interface AudioConfig {
  sampleRate: number;
  bitDepth: number;
  channels: number;
}

interface RecordingStatus {
  isRecording: boolean;
  chunksCount: number;
  totalBytes: number;
}

export class AudioCapture {
  private isRecording = false;
  private audioChunks: Buffer[] = [];
  private outputFile: string;
  private recordProcess: ChildProcess | null = null;
  private config: AudioConfig = {
    sampleRate: 16000,
    bitDepth: 16,
    channels: 1,
  };

  constructor(outputFile = "recording.wav") {
    this.outputFile = path.resolve(process.cwd(), outputFile);
  }

  async startRecording(): Promise<string> {
    if (this.isRecording) return "";

    return new Promise((resolve, reject) => {
      this.recordProcess = spawn("sox", [
        "-t",
        "coreaudio",
        "-d",
        "-r",
        "16000",
        "-b",
        "16",
        "-c",
        "1",
        "-e",
        "signed-integer",
        "-t",
        "raw",
        "-",
      ]);

      this.isRecording = true;

      this.recordProcess.stdout?.on("data", (chunk: Buffer) => {
        this.audioChunks.push(chunk);
      });

      this.recordProcess.on("close", () => {
        const savedFile = this.saveAudioToFile();
        this.isRecording = false;
        savedFile ? resolve(savedFile) : reject(new Error("Save failed"));
      });

      this.recordProcess.on("error", reject);
    });
  }

  stopRecording(): void {
    if (this.recordProcess && this.isRecording) {
      this.recordProcess.kill("SIGINT");
    }
  }

  getStatus(): RecordingStatus {
    const totalBytes = this.audioChunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0
    );
    return {
      isRecording: this.isRecording,
      chunksCount: this.audioChunks.length,
      totalBytes,
    };
  }

  async transcribeAudio(audioFile: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const modelPath = path.join(process.cwd(), "ggml-base.bin");

      const whisperProcess = spawn("whisper-cli", [
        audioFile,
        "--model",
        modelPath,
        "--output-txt",
        "--language",
        "en",
        "--no-speech-thold",
        "0.2",
        "--word-thold",
        "0.01",
        "--temperature",
        "0.0",
      ]);

      whisperProcess.on("close", (code: number) => {
        if (code === 0) {
          const txtFile = `${audioFile}.txt`;
          if (fs.existsSync(txtFile)) {
            const transcription = fs.readFileSync(txtFile, "utf8").trim();
            fs.unlinkSync(txtFile);
            resolve(transcription || "No speech detected");
          } else {
            resolve("No speech detected");
          }
        } else {
          reject(new Error(`Whisper failed with code ${code}`));
        }
      });

      whisperProcess.on("error", reject);
    });
  }

  private saveAudioToFile(): string | null {
    if (this.audioChunks.length === 0) return null;

    try {
      const pcmData = Buffer.concat(this.audioChunks);
      const wavBuffer = this.createWavBuffer(pcmData);
      fs.writeFileSync(this.outputFile, wavBuffer);
      this.audioChunks = [];
      return this.outputFile;
    } catch {
      return null;
    }
  }

  private createWavBuffer(pcmData: Buffer): Buffer {
    const header = Buffer.alloc(44);
    const dataSize = pcmData.length;
    const fileSize = 36 + dataSize;

    let offset = 0;
    header.write("RIFF", offset);
    offset += 4;
    header.writeUInt32LE(fileSize, offset);
    offset += 4;
    header.write("WAVE", offset);
    offset += 4;
    header.write("fmt ", offset);
    offset += 4;
    header.writeUInt32LE(16, offset);
    offset += 4;
    header.writeUInt16LE(1, offset);
    offset += 2;
    header.writeUInt16LE(1, offset);
    offset += 2;
    header.writeUInt32LE(16000, offset);
    offset += 4;
    header.writeUInt32LE(32000, offset);
    offset += 4;
    header.writeUInt16LE(2, offset);
    offset += 2;
    header.writeUInt16LE(16, offset);
    offset += 2;
    header.write("data", offset);
    offset += 4;
    header.writeUInt32LE(dataSize, offset);

    return Buffer.concat([header, pcmData]);
  }
}

async function main() {
  const audioCapture = new AudioCapture("recording.wav");

  process.on("SIGINT", () => {
    audioCapture.stopRecording();
  });

  try {
    const outputFile = await audioCapture.startRecording();
    const transcription = await audioCapture.transcribeAudio(outputFile);
    console.log(transcription);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
