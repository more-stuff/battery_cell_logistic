# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema para Postgres (por si acaso)
RUN apt-get update && apt-get install -y libpq-dev gcc

# Copiar dependencias e instalarlas
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código
COPY . .

# Comando de arranque
# Ajusta "main:app" si tu instancia de FastAPI se llama diferente en main.py
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "main:app"]