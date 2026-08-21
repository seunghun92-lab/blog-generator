FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 캐시를 위해 requirements만 먼저 복사
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
