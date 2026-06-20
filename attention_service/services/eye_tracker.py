def get_eye_direction(
    landmarks
):

    left_corner = (
        landmarks[33]
    )

    right_corner = (
        landmarks[133]
    )

    iris = (
        landmarks[468]
    )

    eye_width = (
        right_corner.x -
        left_corner.x
    )

    ratio = (
        iris.x -
        left_corner.x
    ) / eye_width

    if ratio < 0.35:
        direction = "EYE_LEFT"

    elif ratio > 0.55:
        direction = "EYE_RIGHT"

    else:
        direction = "EYE_CENTER"

    return {
        "direction": direction,
        "ratio": round(
            ratio,
            3
        )
    }