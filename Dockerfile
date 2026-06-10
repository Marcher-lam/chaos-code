# Chaos Code Dockerfile
# Multi-stage build for production deployment

# Stage 1: Production dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install runtime dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy runtime source code
COPY cli.js ./
COPY src/ ./src/
COPY schemas/ ./schemas/
COPY stdd/config.yaml ./stdd/config.yaml
COPY stdd/config/ ./stdd/config/
COPY stdd/extensions/catalog.json ./stdd/extensions/catalog.json
COPY stdd/extensions/README.md ./stdd/extensions/README.md
COPY stdd/graph/conditions.json ./stdd/graph/conditions.json
COPY stdd/graph/config.json ./stdd/graph/config.json
COPY stdd/graph/skills.yaml ./stdd/graph/skills.yaml
COPY stdd/presets/ ./stdd/presets/
COPY stdd/reporters/ ./stdd/reporters/
COPY stdd/templates/ ./stdd/templates/
COPY stdd/specs/.gitkeep ./stdd/specs/.gitkeep
COPY stdd/changes/archive/.gitkeep ./stdd/changes/archive/.gitkeep

# Stage 2: Production
FROM node:20-alpine

ARG VERSION=2.0.0

LABEL org.opencontainers.image.title="Chaos Code"
LABEL org.opencontainers.image.description="Chaos Code — Spec + Test Driven AI Copilot"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /workspace

# Create non-root user
RUN addgroup -g 1000 chaos && \
    adduser -u 1000 -G chaos -s /bin/sh -D chaos

# Copy from builder
COPY --from=builder /app /app

# Create symlink for global usage
RUN ln -s /app/cli.js /usr/local/bin/chaos && \
    ln -s /app/cli.js /usr/local/bin/stdd && \
    chmod +x /usr/local/bin/chaos /usr/local/bin/stdd

# Create workspace directory
RUN mkdir -p /workspace && \
    chown -R chaos:chaos /workspace /app

USER chaos

# Set working directory
WORKDIR /workspace

# Default command
ENTRYPOINT ["chaos"]
CMD ["--help"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD chaos --version || exit 1
