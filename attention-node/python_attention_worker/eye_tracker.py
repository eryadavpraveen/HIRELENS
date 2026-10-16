def get_eye_direction(landmarks):

    # Left eye landmarks
    left_eye_left = landmarks[33]
    left_eye_right = landmarks[133]
    left_iris = landmarks[468]

    # Right eye landmarks
    right_eye_left = landmarks[362]
    right_eye_right = landmarks[263]
    right_iris = landmarks[473]

    # Calculate left eye width
    left_eye_width = (
        left_eye_right.x -
        left_eye_left.x
    )

    # Calculate right eye width
    right_eye_width = (
        right_eye_right.x -
        right_eye_left.x
    )

    # Avoid division by zero
    if left_eye_width == 0 or right_eye_width == 0:
        return {
            "direction": "EYE_CENTER",
            "ratio": 0.5
        }

    # Calculate left eye iris position
    left_ratio = (
        left_iris.x -
        left_eye_left.x
    ) / left_eye_width

    # Calculate right eye iris position
    right_ratio = (
        right_iris.x -
        right_eye_left.x
    ) / right_eye_width

    # The right eye is mirrored, so reverse its ratio
    right_ratio = 1.0 - right_ratio

    # Average both eyes
    ratio = (
        left_ratio +
        right_ratio
    ) / 2

    # Determine final eye direction
    if ratio < 0.35:
        direction = "EYE_LEFT"

    elif ratio > 0.65:
        direction = "EYE_RIGHT"

    else:
        direction = "EYE_CENTER"

    return {
        "direction": direction,
        "ratio": round(ratio, 3)
    }