def analyze_attention(
    horizontal,
    vertical,
    eye_direction,
    eyes_closed
):

    attention_loss = False

    drowsiness_alert = False

    reasons = []

    # Head Movement

    if horizontal != "CENTER":

        attention_loss = True

        reasons.append(
            f"HEAD_{horizontal}"
        )

    if vertical != "CENTER":

        attention_loss = True

        reasons.append(
            f"HEAD_{vertical}"
        )

    # Eye Movement

    if eye_direction != "EYE_CENTER":

        attention_loss = True

        reasons.append(
            eye_direction
        )

    # Eye Closure

    if eyes_closed:

        drowsiness_alert = True

        reasons.append(
            "EYES_CLOSED"
        )

    return {
        "attention_loss":
            attention_loss,

        "drowsiness_alert":
            drowsiness_alert,

        "reasons":
            reasons
    }