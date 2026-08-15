# Production-shaped image for the Selah API.
#
# Multi-stage so the runtime layer carries no build toolchain, and the app runs
# as a non-root user.

FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies resolve from pyproject alone, so this layer caches until the
# dependency list actually changes.
COPY pyproject.toml README.md ./
COPY app ./app
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install .

# ---------------------------------------------------------------------------

FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH"

RUN useradd --create-home --uid 10001 selah
WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --chown=selah:selah app ./app
COPY --chown=selah:selah data ./data

USER selah
EXPOSE 8000

# One worker: the app is async and Compose scales by replicas, not threads.
# Behind a real platform, set the worker count from the CPU allocation.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
