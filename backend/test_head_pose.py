from app.services.head_pose import (
    detect_head_direction
)

result = detect_head_direction(
    "current.jpeg"
)

print(result)