# 1. Base Image: Use a slim and specific Python version for security and size.
FROM python:3.11-slim-bullseye

# 2. Set Environment Variables: For better Python performance within Docker.
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 3. Set Working Directory: All subsequent commands run here.
WORKDIR /app

# 4. Install Dependencies: Copy only the requirements file first to leverage Docker's cache.
# This layer is only rebuilt when requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy Application Code: Copy the rest of the code after dependencies are installed.
COPY . .

# 6. Expose Port: Inform Docker that the container listens on port 8000.
# This is for documentation; the mapping happens in docker-compose.yml.
EXPOSE 8000
