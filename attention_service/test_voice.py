from services.voice_verifier import (
    verify_voice
)

result = verify_voice(
    "voice1.wav",
    "voice3.wav"
)

print(result)