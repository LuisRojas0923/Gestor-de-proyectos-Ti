# Face Recognition API Contract

The GeoFace app interacts with a Python Flask server running DeepFace.

**Base URL:** `http://<LAN_IP>:5005`

## Endpoints

### 1. Health Check
`GET /v1/health`
- **Response:** `{ "status": "ok" }`

### 2. Get Embedding (Represent)
`POST /v1/represent`
- **Request Body:**
  ```json
  {
    "image": "base64_encoded_image_string"
  }
  ```
- **Response:**
  ```json
  {
    "embedding": [0.12, -0.45, ...],
    "face_confidence": 0.98,
    "model": "Facenet512",
    "dimensions": 512
  }
  ```

### 3. Verify Face
`POST /v1/verify`
- **Request Body:**
  ```json
  {
    "image": "base64_encoded_image_string",
    "embeddings": [
      { "id": "uuid", "embedding": [...] },
      ...
    ]
  }
  ```
- **Response:**
  ```json
  {
    "verified": true,
    "best_match": { "id": "uuid", "confidence": 95.5 },
    "matches": [...]
  }
  ```
