from app.services.object_detector import (
    detect_objects
)

result = detect_objects(
    "test4.jpg"
)

print(result)