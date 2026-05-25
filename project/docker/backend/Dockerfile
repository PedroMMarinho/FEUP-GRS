FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Install Docker Compose v2 manually as a Docker CLI plugin.
# For Docker Desktop on Apple Silicon, TARGETARCH should become arm64.
# For Intel/AMD, it should become amd64.
ARG TARGETARCH
RUN mkdir -p /usr/libexec/docker/cli-plugins && \
    if [ "$TARGETARCH" = "arm64" ]; then ARCH="aarch64"; else ARCH="x86_64"; fi && \
    curl -SL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-${ARCH}" \
      -o /usr/libexec/docker/cli-plugins/docker-compose && \
    chmod +x /usr/libexec/docker/cli-plugins/docker-compose && \
    docker compose version

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]