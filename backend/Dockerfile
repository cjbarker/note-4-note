# Backend image: bundles ffmpeg (for non-WAV decoding) + the uv-managed Python app.
FROM python:3.11-slim

# ffmpeg decodes non-WAV audio; curl is used by the container healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

# uv: fast, reproducible Python package management.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install dependencies from the lockfile first (cached unless deps change).
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app ./app
COPY README.md ./

EXPOSE 8000

# Generous start period: the model warms up on startup before /api/health is ready.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health || exit 1

CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
