FROM python:3.9-slim

WORKDIR /app

# Ensure required directories exist to prevent startup crashes
RUN mkdir -p static templates

ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y git ffmpeg build-essential

# Install CPU-only PyTorch first to save space and time
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]