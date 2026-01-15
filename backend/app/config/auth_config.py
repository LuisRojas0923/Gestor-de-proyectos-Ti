import os
from datetime import timedelta

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "b3d8f7e2c9a1b4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day
REFRESH_TOKEN_EXPIRE_DAYS = 7
