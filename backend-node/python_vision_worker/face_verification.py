from deepface import DeepFace

def verify_faces(
    reference_image: str,
    current_image: str
):

    result = DeepFace.verify(
        img1_path=reference_image,
        img2_path=current_image,
        model_name="Facenet",
        detector_backend="opencv",
        enforce_detection=False
    )

    return result["verified"]