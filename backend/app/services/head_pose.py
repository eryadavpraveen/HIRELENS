import cv2
import mediapipe as mp

mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True
)


def detect_head_direction(image_path):

    image = cv2.imread(image_path)

    if image is None:
        return "NO_FACE"

    rgb = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2RGB
    )

    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return "NO_FACE"

    landmarks = (
        results
        .multi_face_landmarks[0]
        .landmark
    )

    nose = landmarks[1]

    x = nose.x

    if x < 0.40:
        return "HEAD_LEFT"

    elif x > 0.60:
        return "HEAD_RIGHT"

    else:
        return "CENTER"