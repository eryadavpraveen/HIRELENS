import math


def distance(p1, p2):

    return math.sqrt(
        (
            p1.x - p2.x
        ) ** 2
        +
        (
            p1.y - p2.y
        ) ** 2
    )


def detect_eye_closure(
    landmarks
):

    left_corner = (
        landmarks[33]
    )

    right_corner = (
        landmarks[133]
    )

    upper_lid = (
        landmarks[159]
    )

    lower_lid = (
        landmarks[145]
    )

    eye_width = distance(
        left_corner,
        right_corner
    )

    eye_height = distance(
        upper_lid,
        lower_lid
    )

    ear = (
        eye_height /
        eye_width
    )

    eyes_closed = (
        ear < 0.18
    )

    return {
        "ear": round(
            ear,
            3
        ),
        "eyes_closed":
            eyes_closed
    }