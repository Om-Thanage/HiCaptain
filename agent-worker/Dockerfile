FROM python:3.12-slim
WORKDIR /app
COPY requirements.lock ./requirements.lock
RUN pip install --no-cache-dir -r requirements.lock
COPY worker.py ./worker.py
USER nobody
CMD ["python", "worker.py"]
