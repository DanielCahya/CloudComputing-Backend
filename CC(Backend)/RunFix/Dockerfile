FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Salin file requirements dan install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Salin semua file ke dalam container
COPY . .

# Ekspos port Flask (8080)
EXPOSE 8080

# Jalankan aplikasi
CMD ["python", "app.py"]
