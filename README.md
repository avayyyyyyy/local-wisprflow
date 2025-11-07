# WisprFlow Backend

A local speech-to-text transcription server using Whisper.cpp for fast, offline audio transcription.

## Features

- Real-time audio transcription
- Supports WebM and PCM audio formats
- Offline processing (no API keys needed)
- Fast inference using Whisper.cpp
- REST API endpoint for transcription

## Prerequisites

### macOS

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install ffmpeg
brew install whisper-cpp
brew install pnpm
```

### Windows

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
choco install ffmpeg
choco install nodejs
npm install -g pnpm
```

For **whisper-cpp** on Windows, download from: https://github.com/ggml-org/whisper.cpp/releases

## Installation

1. **Clone the repository**

   ```bash
   cd /path/to/your/projects
   git clone <your-repo-url>
   cd local-wisprflow-backend
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Download Whisper model**

   The `ggml-base.bin` model should already be in the project root. If not, download it:

   ```bash
   # macOS/Linux
   curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o ggml-base.bin

   # Windows PowerShell
   Invoke-WebRequest -Uri "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" -OutFile "ggml-base.bin"
   ```

## Running the Server

### Development Mode

```bash
pnpm run server

npx ts-node src/index.ts
```

### Production Mode

```bash
pnpm run build

pnpm start
```

The server will start on **http://localhost:3000**

## API Endpoints

### POST /transcribe

Transcribe audio to text.

**Supported Formats:**

- `audio/webm` (recommended for web browsers)
- `audio/pcm` (16kHz, mono, 16-bit)

**Request:**

```bash
curl -X POST http://localhost:3000/transcribe \
  -H "Content-Type: audio/webm" \
  --data-binary @audio.webm
```

**Response:**

```json
{
  "transcription": "Your transcribed text here",
  "timing": {
    "conversion": 150,
    "transcription": 850,
    "total": 1000
  }
}
```

## Testing

### Using cURL (macOS/Linux)

```bash
curl -X POST http://localhost:3000/transcribe \
  -H "Content-Type: audio/webm" \
  --data-binary @test-audio.webm
```

### Using PowerShell (Windows)

```powershell
$audio = [System.IO.File]::ReadAllBytes("test-audio.webm")
Invoke-WebRequest -Uri "http://localhost:3000/transcribe" `
  -Method POST `
  -ContentType "audio/webm" `
  -Body $audio
```

## Project Structure

```
local-wisprflow-backend/
├── src/
│   ├── index.ts          # Main server with /transcribe endpoint
│   └── audio-capture.ts  # Audio capture utilities
├── ggml-base.bin         # Whisper model (142MB)
├── package.json
└── tsconfig.json
```

## Whisper Model Information

- **Model**: `ggml-base.bin`
- **Size**: 142MB
- **Languages**: Multilingual (99 languages)
- **Device**: CPU (default)
- **Format**: GGML format for whisper.cpp

### Other Available Models

If you want better accuracy, you can download larger models:

```bash
# Small model (466MB) - more accurate
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin -o ggml-small.bin

# Medium model (1.5GB) - very accurate
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin -o ggml-medium.bin
```

Then update the model path in `src/index.ts`:

```typescript
const modelPath = path.join(process.cwd(), "ggml-small.bin");
```

## Contributing

Feel free to submit issues and pull requests!
