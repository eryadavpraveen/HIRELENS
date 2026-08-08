def detect_mouth_open(
    landmarks
):

    upper_lip = landmarks[13]
    lower_lip = landmarks[14]

    left_eye = landmarks[33]
    right_eye = landmarks[263]

    mouth_gap = abs(
        upper_lip.y -
        lower_lip.y
    )

    face_width = abs(
        left_eye.x -
        right_eye.x
    )

    ratio = (
        mouth_gap /
        face_width
    )

    # Log to stderr only — stdout is reserved for NDJSON worker protocol.
    import sys
    print("Mouth Ratio:", round(ratio, 3), file=sys.stderr)

    return {
        "mouth_open":
            ratio > 0.04,

        "mouth_ratio":
            round(
                ratio,
                3
            )
    }