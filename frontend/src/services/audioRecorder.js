export async function recordAudio(
    duration = 5000
) {

    const stream =
        await navigator.mediaDevices
            .getUserMedia({
                audio: true
            });

    const recorder =
        new MediaRecorder(stream);

    const chunks = [];

    recorder.ondataavailable =
        e => chunks.push(e.data);

    recorder.start();

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                duration
            )
    );

    recorder.stop();

    return await new Promise(
        resolve => {

            recorder.onstop =
                () => {

                    const blob =
                        new Blob(
                            chunks,
                            {
                                type:
                                "audio/webm"
                            }
                        );

                    resolve(blob);

                    stream
                    .getTracks()
                    .forEach(
                        t =>
                        t.stop()
                    );
                };
        }
    );
}

let recordingActive = false

/**
 * Record audio from an existing MediaStream (e.g. WebRTC mic).
 * Does not open a new getUserMedia session. Skips if a recording is already active.
 */
export async function recordAudioFromStream(stream, duration = 5000) {
    if (recordingActive) {
        return null
    }

    const audioTracks = stream?.getAudioTracks?.() || []
    if (!audioTracks.length) {
        return null
    }

    recordingActive = true

    const audioStream = new MediaStream(audioTracks)
    const recorder = new MediaRecorder(audioStream)
    const chunks = []

    recorder.ondataavailable = (e) => chunks.push(e.data)

    try {
        recorder.start()

        const blob = await new Promise((resolve) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' })
                resolve(blob)
            }
            setTimeout(() => {
                if (recorder.state !== 'inactive') {
                    recorder.stop()
                }
            }, duration)
        })

        return blob
    } finally {
        recordingActive = false
    }
}
