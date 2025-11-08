# WisprFlow Backend

A local speech-to-text transcription server using Whisper.cpp for fast, offline audio transcription with GPU acceleration.

## Features

- **GPU-Accelerated Transcription** (Metal on Apple Silicon, CUDA/ROCm on other platforms)
- Real-time audio transcription (~150ms for 5-10 second clips with GPU)
- Supports WebM and PCM audio formats
- Offline processing (no API keys needed)
- Fast inference using Whisper.cpp with Metal backend
- REST API endpoint for transcription
- Detailed performance logging and metrics
- Docker support for instant deployment

## Deployment Options

| Method | Performance | Setup Time | Best For |
|--------|------------|------------|----------|
| **🐳 Docker (Standard)** | ~400-600ms/clip | 5 minutes | Quick deployment, balanced performance |
| **🚀 Docker (Fast)** | ~150-200ms/clip | 5 minutes | Speed-focused, slight accuracy tradeoff |
| **⚡ Native + GPU** | ~150ms/clip (GPU) | 15 minutes | Maximum performance, Apple Silicon |

**Quick Start:**
- **Docker (Easiest)**: `docker-compose up -d` → [Jump to Docker Setup](#docker-deployment-)
- **Native + GPU (Fastest)**: Follow [GPU Setup](#gpu-accelerated-setup-recommended) → [Installation](#installation)

## Prerequisites

### Required Software

- **Node.js** (v16 or higher)
- **pnpm** (package manager)
- **FFmpeg** (for audio conversion)
- **Git** (for cloning repositories)

### macOS Setup

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install ffmpeg pnpm git
```

### Windows Setup

```powershell
# Install Chocolatey (if not already installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install dependencies
choco install ffmpeg nodejs git
npm install -g pnpm
```

## GPU-Accelerated Setup (Recommended)

For maximum performance, compile Whisper.cpp with GPU support.

### Apple Silicon (M1/M2/M3/M4) - Metal Backend

```bash
# Clone whisper.cpp repository
cd ~
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Build with Metal support (GPU acceleration)
mkdir build
cd build
cmake .. -DGGML_METAL=ON
cmake --build . --config Release

# Copy the compiled binary to your project
cp ~/whisper.cpp/build/bin/whisper-cli /path/to/local-wisprflow-backend/whisper-cli

# Make it executable
cd /path/to/local-wisprflow-backend
chmod +x whisper-cli
```

**Expected Performance on Apple Silicon:**
- Model load time: ~50ms
- Transcription: ~150ms for 5-10 second audio clips
- Uses Metal backend with unified memory
- All optimizations enabled (bfloat16, fusion, concurrency)

### NVIDIA GPUs - CUDA Backend

```bash
# Clone whisper.cpp repository
cd ~
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Build with CUDA support
mkdir build
cd build
cmake .. -DGGML_CUDA=ON
cmake --build . --config Release

# Copy the compiled binary to your project
cp ~/whisper.cpp/build/bin/whisper-cli /path/to/local-wisprflow-backend/whisper-cli
chmod +x whisper-cli
```

### AMD GPUs - ROCm Backend

```bash
# Clone whisper.cpp repository
cd ~
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Build with ROCm support
mkdir build
cd build
cmake .. -DGGML_HIPBLAS=ON
cmake --build . --config Release

# Copy the compiled binary to your project
cp ~/whisper.cpp/build/bin/whisper-cli /path/to/local-wisprflow-backend/whisper-cli
chmod +x whisper-cli
```

### CPU-Only Fallback

If you don't have a GPU or prefer CPU-only processing:

```bash
cd ~
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
mkdir build
cd build
cmake ..
cmake --build . --config Release
cp ~/whisper.cpp/build/bin/whisper-cli /path/to/local-wisprflow-backend/whisper-cli
chmod +x whisper-cli
```

## Installation

1. **Clone the repository**

   ```bash
   cd /your/projects/folder
   git clone https://github.com/avayyyyyyy/local-wisprflow.git
   cd local-wisprflow-backend
   ```

2. **Install Node.js dependencies**

   ```bash
   pnpm install
   ```

3. **Setup GPU-accelerated Whisper binary**

   Follow the [GPU-Accelerated Setup](#gpu-accelerated-setup-recommended) section above to compile and copy the `whisper-cli` binary to your project root.

   **Verify the binary is in place:**

   ```bash
   ls -l whisper-cli
   # Should show: -rwxr-xr-x ... whisper-cli
   ```

4. **Download Whisper model**

   The `ggml-base.bin` model should already be in the project root. If not, download it:

   ```bash
   # macOS/Linux
   curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o ggml-base.bin

   # Windows PowerShell
   Invoke-WebRequest -Uri "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" -OutFile "ggml-base.bin"
   ```

5. **Build the TypeScript project**

   ```bash
   pnpm build
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

## Docker Deployment 🐳

The easiest way to deploy WisprFlow is using Docker. The Dockerfile is fully tested and production-ready.

### Quick Start with Docker

**Build and run with a single command:**

```bash
docker build -t wisprflow-backend .
docker run -d -p 3000:3000 --name wisprflow wisprflow-backend
```

**Or use Docker Compose:**

```bash
docker-compose up -d
```

### Docker Features

- ✅ **Multi-stage build** - Minimal final image size
- ✅ **Automatic model download** - Downloads `ggml-base.bin` if not present
- ✅ **Whisper.cpp compilation** - Builds optimized binary from source with `-O3` flags
- ✅ **Health checks** - Built-in container health monitoring
- ✅ **CPU optimized** - OpenMP multithreading, 8 threads, beam-size=2 for speed
- ✅ **Fast variant** - Optional `Dockerfile.fast` with tiny model (3x faster)

### Docker Commands

```bash
# Standard build (balanced speed/accuracy)
docker build -t wisprflow-backend .
docker run -d -p 3000:3000 --name wisprflow wisprflow-backend

# FAST build (3x faster, tiny model, slight accuracy tradeoff)
docker build -f Dockerfile.fast -t wisprflow-backend-fast .
docker run -d -p 3000:3000 --name wisprflow wisprflow-backend-fast

# View logs
docker logs -f wisprflow

# Stop container
docker stop wisprflow

# Remove container
docker rm wisprflow

# Check container status
docker ps -a --filter name=wisprflow
```

### Docker Compose Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Performance Notes

The Docker container runs Whisper.cpp in **CPU mode** with optimizations:

**Standard Dockerfile (base model):**
- **Model load time**: ~40ms
- **Transcription**: ~400-600ms for 2-3 second clips (optimized CPU)
- **Memory usage**: ~300MB per container
- **Accuracy**: Excellent

**Dockerfile.fast (tiny model):**
- **Model load time**: ~20ms
- **Transcription**: ~150-200ms for 2-3 second clips (3x faster)
- **Memory usage**: ~200MB per container
- **Accuracy**: Good (slight tradeoff for speed)

**Optimizations applied:**
- OpenMP multithreading enabled
- 8 CPU threads (vs default 4)
- Beam size reduced to 2 (vs default 5)
- Compiler flags: `-O3 -march=armv8-a -mtune=native`

For GPU acceleration (~150ms with Metal), run the server directly on your host machine (see [GPU-Accelerated Setup](#gpu-accelerated-setup-recommended)).

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
├── whisper-cli           # GPU-compiled Whisper binary (for local dev)
├── ggml-base.bin         # Whisper model (147MB)
├── Dockerfile            # Production-ready Docker image
├── docker-compose.yml    # Docker Compose configuration
├── .dockerignore         # Docker build exclusions
├── package.json
├── tsconfig.json
└── README.md
```

**Important Files:**
- `whisper-cli`: GPU-accelerated binary compiled from whisper.cpp (must be executable, for local development)
- `ggml-base.bin`: Pre-trained Whisper model for transcription
- `Dockerfile`: Multi-stage build with automatic whisper.cpp compilation
- `docker-compose.yml`: Single-command deployment configuration
- `src/index.ts`: Uses absolute path resolution for `whisper-cli` via `path.join(process.cwd(), "whisper-cli")`

## Whisper Model Information

### Current Model: Base

- **Model**: `ggml-base.bin`
- **Size**: 147.37 MB
- **Languages**: Multilingual (99 languages)
- **Device**: GPU (Metal/CUDA/ROCm) with CPU fallback
- **Format**: GGML format for whisper.cpp
- **Parameters**: ~74M parameters

**Performance on Apple M4 Pro (Metal):**
- Model load time: ~54ms
- Transcription: ~150ms for 5-10 second clips
- Memory usage: ~147MB model + ~153MB compute buffers
- Throughput: Real-time factor < 0.03 (30x faster than real-time)

### GPU Acceleration Details

The server automatically detects and uses GPU acceleration:

```
whisper_backend_init_gpu: using Metal backend
ggml_metal_init: found device: Apple M4 Pro
ggml_metal_init: use bfloat = true
ggml_metal_init: use fusion = true
ggml_metal_init: use concurrency = true
```

**Logging Output:** The server logs detailed performance metrics to stderr, including:
- Model initialization time
- Encode/decode times
- Per-run timing breakdowns
- Hardware utilization

### Other Available Models

For different accuracy/speed tradeoffs, you can use other models:

```bash
# Tiny model (75MB) - fastest
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin -o ggml-tiny.bin

# Small model (466MB) - more accurate
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin -o ggml-small.bin

# Medium model (1.5GB) - very accurate
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin -o ggml-medium.bin

# Large model (2.9GB) - most accurate
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large.bin -o ggml-large.bin
```

Then update the model path in `src/index.ts`:

```typescript
const modelPath = path.join(process.cwd(), "ggml-small.bin");
```

## Troubleshooting

### Common Issues

**1. ENOENT Error (whisper-cli not found)**

```
Error: spawn whisper-cli ENOENT
```

**Solution:** Ensure `whisper-cli` is in the project root and executable:

```bash
ls -l whisper-cli  # Should show -rwxr-xr-x
chmod +x whisper-cli  # Make executable if needed
```

**2. Model Not Found**

```
Error: Whisper failed with code 1
```

**Solution:** Verify `ggml-base.bin` exists in the project root:

```bash
ls -lh ggml-base.bin  # Should show ~147MB file
```

**3. FFmpeg Not Installed**

```
Error: ffmpeg spawn error
```

**Solution:** Install FFmpeg:

```bash
# macOS
brew install ffmpeg

# Windows
choco install ffmpeg
```

**4. GPU Not Detected**

If you see `whisper_init_with_params_no_state: use gpu = 0`:

- Verify you compiled with the correct GPU flag (`-DGGML_METAL=ON`, `-DGGML_CUDA=ON`, etc.)
- Check that your GPU drivers are up to date
- Try recompiling whisper.cpp with explicit GPU support

### Docker-Specific Issues

**1. Container Fails to Build**

```
Error: failed to build
```

**Solution:** Check Docker daemon is running and you have enough disk space:

```bash
docker system df  # Check disk usage
docker system prune  # Clean up unused resources
```

**2. Port Already in Use**

```
Error: bind: address already in use
```

**Solution:** Use a different port or stop the conflicting service:

```bash
# Use different port
docker run -d -p 3001:3000 --name wisprflow wisprflow-backend

# Or find and stop the conflicting process
lsof -i :3000  # Find process using port 3000
```

**3. Container Starts But Crashes**

```bash
# Check logs for errors
docker logs wisprflow

# Check container resource usage
docker stats wisprflow
```

**4. Slow Performance in Docker**

The Docker container uses CPU-only mode. Expected performance:
- ~1000ms for 2-3 second audio clips
- For better performance, run natively with GPU acceleration (see [GPU Setup](#gpu-accelerated-setup-recommended))

### Performance Tips

1. **Use GPU acceleration** - Provides 10-30x speedup over CPU (native setup, not Docker)
2. **Adjust thread count** - The binary uses 4 threads by default (configurable in code)
3. **Model selection** - Base model offers best speed/accuracy tradeoff
4. **Audio format** - PCM format is slightly faster than WebM (no conversion needed)
5. **Docker vs Native** - For production with high loads, run natively with GPU for best performance

## Contributing

Feel free to submit issues and pull requests!

## License

MIT License - See LICENSE file for details
