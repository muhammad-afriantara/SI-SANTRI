FROM python:3.10-slim

# Gunakan non-root user UID 1000 sesuai standar Hugging Face Spaces
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy dependency dan install
COPY --chown=user requirements.txt ./
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy seluruh file backend
COPY --chown=user . ./

# Port default Hugging Face Spaces
EXPOSE 7860

# Jalankan FastAPI server di port 7860
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
