# Multi-stage Dockerfile for WisprFlow Backend
# Stage 1: Build whisper.cpp
FROM debian:bookworm-slim AS whisper-builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    git \
    cmake \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Clone and build whisper.cpp
WORKDIR /build
RUN git clone https://github.com/ggerganov/whisper.cpp.git
WORKDIR /build/whisper.cpp

# Build whisper.cpp with optimizations for faster CPU performance
RUN mkdir build && cd build && \
    cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DGGML_NATIVE=OFF \
        -DGGML_CPU_ARM_ARCH=armv8-a \
        -DGGML_OPENMP=ON \
        -DCMAKE_C_FLAGS="-O3 -march=armv8-a -mtune=native" \
        -DCMAKE_CXX_FLAGS="-O3 -march=armv8-a -mtune=native" && \
    cmake --build . --config Release -j$(nproc)

# Stage 2: Application runtime
FROM node:20-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy whisper-cli binary and all shared libraries from builder stage
COPY --from=whisper-builder /build/whisper.cpp/build/bin/whisper-cli /app/whisper-cli
COPY --from=whisper-builder /build/whisper.cpp/build/src/libwhisper.so* /usr/local/lib/
COPY --from=whisper-builder /build/whisper.cpp/build/ggml/src/*.so* /usr/local/lib/
RUN chmod +x /app/whisper-cli && ldconfig

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy application source
COPY . .

# Download Whisper model if not present
RUN if [ ! -f ggml-base.bin ]; then \
    echo "Downloading Whisper base model..."; \
    curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o ggml-base.bin; \
    fi

# Build TypeScript
RUN pnpm build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start the server
CMD ["node", "dist/index.js"]
