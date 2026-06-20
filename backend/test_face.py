import cv2

cascade_path = (
    cv2.data.haarcascades +
    "haarcascade_frontalface_default.xml"
)

face_cascade = cv2.CascadeClassifier(
    cascade_path
)

image = cv2.imread("p3.png")

gray = cv2.cvtColor(
    image,
    cv2.COLOR_BGR2GRAY
)

faces = face_cascade.detectMultiScale(
    gray,
    scaleFactor=1.1,
    minNeighbors=5
)

print("Faces:", len(faces))