# Stage 1: Build dependencies
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    cmake \
    pkg-config \
    zlib1g-dev \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Create virtual environment and sync dependencies
RUN uv venv .venv && \
    . .venv/bin/activate && \
    uv sync

# Download flink-connector-rabbitmq JAR
RUN mkdir -p /app/lib && \
    curl -L -o /app/lib/flink-connector-rabbitmq-3.0.1-1.17.jar \
    https://repo1.maven.org/maven2/org/apache/flink/flink-connector-rabbitmq/3.0.1-1.17/flink-connector-rabbitmq-3.0.1-1.17.jar

# Stage 2: Final image
FROM python:3.11-slim-bookworm

WORKDIR /app

# Install runtime dependencies (Java for Flink)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Copy virtual environment and JAR from builder
COPY --from=builder /app/.venv ./.venv
COPY --from=builder /app/lib ./lib

# Copy application code
COPY app/ ./app/

# Create non-root user
RUN useradd -m -u 1000 appuser
USER appuser

# Ensure virtual environment is activated
CMD ["bash"]