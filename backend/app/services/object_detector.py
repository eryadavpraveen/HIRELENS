from ultralytics import YOLO

# Load model once
model = YOLO("yolov8n.pt")


def detect_objects(image_path: str):

    results = model(image_path)

    phone_detected = False
    person_count = 0
    laptop_count = 0
    book_count = 0

    for result in results:

        for box in result.boxes:

            cls = int(box.cls[0])

            class_name = model.names[cls]

            if class_name == "cell phone":
                phone_detected = True

            elif class_name == "person":
                person_count += 1

            elif class_name == "laptop":
                laptop_count += 1

            elif class_name == "book":
                book_count += 1

    return {
        "phone": phone_detected,
        "person_count": person_count,
        "laptop_count": laptop_count,
        "book_count": book_count
    }