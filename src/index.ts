import express, { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

const app = express();

const WHISPER_CLI_PATH = "~/whisper.cpp/build/bin/whisper-cli";

app.use(express.raw({ type: "audio/pcm", limit: "50mb" }));
app.use(express.raw({ type: "audio/webm", limit: "50mb" }));

function createWavBuffer(pcmData: Buffer): Buffer {
  const header = Buffer.alloc(44);
  let offset = 0;
  header.write("RIFF", offset);
  offset += 4;
  header.writeUInt32LE(36 + pcmData.length, offset);
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
  header.writeUInt32LE(pcmData.length, offset);

  return Buffer.concat([header, pcmData]);
}

async function convertWebMToWav(
  webmFile: string,
  wavFile: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn("ffmpeg", [
      "-i",
      webmFile,
      "-ar",
      "16000",
      "-ac",
      "1",
      "-sample_fmt",
      "s16",
      "-y",
      wavFile,
    ]);

    let stderrOutput = "";

    ffmpegProcess.stderr.on("data", (data) => {
      stderrOutput += data.toString();
    });

    ffmpegProcess.on("close", (code: number) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed with code ${code}: ${stderrOutput}`));
      }
    });

    ffmpegProcess.on("error", (err) => {
      reject(new Error(`ffmpeg spawn error: ${err.message}`));
    });
  });
}

async function transcribeAudio(audioFile: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const modelPath = path.join(process.cwd(), "ggml-base.bin");

    const whisperBinaryPath = path.join(
      process.env.HOME || "~",
      "whisper.cpp/build/bin/whisper-cli"
    );

    const whisperProcess = spawn(whisperBinaryPath, [
      audioFile,
      "--model",
      modelPath,
      "--threads",
      "8",
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

    let stderrOutput = "";
    whisperProcess.stderr.on("data", (data) => {
      console.log("Whisper STDERR:", data.toString());
      stderrOutput += data.toString();
    });

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
        reject(
          new Error(`Whisper failed with code ${code}. Log: ${stderrOutput}`)
        );
      }
    });

    whisperProcess.on("error", reject);
  });
}

app.post("/transcribe", async (req: Request, res: Response) => {
  const requestStart = Date.now();
  const timestamp = Date.now();
  let tempWebMFile: string | null = null;
  let tempWavFile: string | null = null;

  try {
    const contentType = req.headers["content-type"];
    const audioData = req.body as Buffer;

    if (contentType === "audio/webm") {
      tempWebMFile = `temp_${timestamp}.webm`;
      tempWavFile = `temp_${timestamp}.wav`;

      fs.writeFileSync(tempWebMFile, audioData);

      await convertWebMToWav(tempWebMFile, tempWavFile);

      const transcription = await transcribeAudio(tempWavFile);

      const totalTime = Date.now() - requestStart;

      res.json({
        transcription,
        timing: {
          conversion: 0,
          transcription: totalTime - requestStart,
          total: totalTime,
        },
      });
    } else if (contentType === "audio/pcm") {
      tempWavFile = `temp_${timestamp}.wav`;
      const wavBuffer = createWavBuffer(audioData);

      fs.writeFileSync(tempWavFile, wavBuffer);

      const transcription = await transcribeAudio(tempWavFile);

      const totalTime = Date.now() - requestStart;

      res.json({
        transcription,
        timing: {
          conversion: 0,
          transcription: totalTime - requestStart,
          total: totalTime,
        },
      });
    } else {
      res.status(400).json({
        error: "Unsupported content type. Use audio/webm or audio/pcm",
      });
    }
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: "Transcription failed" });
  } finally {
    if (tempWebMFile && fs.existsSync(tempWebMFile)) {
      fs.unlinkSync(tempWebMFile);
    }
    if (tempWavFile && fs.existsSync(tempWavFile)) {
      fs.unlinkSync(tempWavFile);
    }
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
