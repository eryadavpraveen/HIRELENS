import math


def distance(p1, p2):
    return math.sqrt(
        (p1.x - p2.x) ** 2 +
        (p1.y - p2.y) ** 2
    )


def calculate_ear(
    left_corner,
    right_corner,
    upper_lid,
    lower_lid
):
    eye_width = distance(
        left_corner,
        right_corner
    )

    eye_height = distance(
        upper_lid,
        lower_lid
    )

    if eye_width == 0:
        return 0.0

    return eye_height / eye_width


def detect_eye_closure(landmarks):

    # Left eye landmarks
    left_eye_left_corner = landmarks[33]
    left_eye_right_corner = landmarks[133]
    left_eye_upper_lid = landmarks[159]
    left_eye_lower_lid = landmarks[145]

    # Right eye landmarks
    right_eye_left_corner = landmarks[362]
    right_eye_right_corner = landmarks[263]
    right_eye_upper_lid = landmarks[386]
    right_eye_lower_lid = landmarks[374]

    # Calculate EAR for left eye
    left_ear = calculate_ear(
        left_eye_left_corner,
        left_eye_right_corner,
        left_eye_upper_lid,
        left_eye_lower_lid
    )

    # Calculate EAR for right eye
    right_ear = calculate_ear(
        right_eye_left_corner,
        right_eye_right_corner,
        right_eye_upper_lid,
        right_eye_lower_lid
    )

    # Average EAR of both eyes
    ear = (left_ear + right_ear) / 2

    # Consider eyes closed if average EAR is below threshold
    eyes_closed = ear < 0.18

    return {
        "ear": round(ear, 3),
        "left_ear": round(left_ear, 3),
        "right_ear": round(right_ear, 3),
        "eyes_closed": eyes_closed
    }