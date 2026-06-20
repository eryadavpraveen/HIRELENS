def get_head_pose(matrix):

    yaw = float(
        matrix[0][2]
    )

    pitch = float(
        matrix[2][1]
    )

    horizontal = "CENTER"

    if yaw < -0.20:
        horizontal = "LEFT"

    elif yaw > 0.20:
        horizontal = "RIGHT"

    vertical = "CENTER"

    if pitch < -0.10:
        vertical = "UP"

    elif pitch > 0.25:
        vertical = "DOWN"

    return {
        "horizontal": horizontal,
        "vertical": vertical,
        "yaw": round(
            yaw,
            3
        ),
        "pitch": round(
            pitch,
            3
        )
    }