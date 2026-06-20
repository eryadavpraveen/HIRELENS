"""
Real-time WebSocket signaling for HIRELENS interview rooms.

Endpoint:
    /ws/interview/{interview_id}?role=<student|recruiter>

Responsibilities:
    * Room-based architecture (one room per interview_id, many rooms)
    * Connection manager (join / leave / broadcast)
    * Relay WebRTC signaling (offer / answer / ice-candidate)
    * Relay live monitoring messages (monitoring-event / status-update)

This is a pure relay: media never flows through the server (that is handled
peer-to-peer by WebRTC). The server only forwards small JSON control messages
to the *other* participants in the same room.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional, Tuple, Type

from app.database.database import SessionLocal
from app.models.interview import Interview
from app.models.participant import Participant
from app.models.user import User
from app.auth.auth import decode_access_token

router = APIRouter()

# Exceptions raised when a client disconnects mid-send (no stack trace needed).
_SEND_DISCONNECT_ERRORS: Tuple[Type[BaseException], ...] = (WebSocketDisconnect,)

try:
    from uvicorn.protocols.utils import ClientDisconnected

    _SEND_DISCONNECT_ERRORS = (*_SEND_DISCONNECT_ERRORS, ClientDisconnected)
except ImportError:
    pass

try:
    from websockets.exceptions import ConnectionClosedError

    _SEND_DISCONNECT_ERRORS = (*_SEND_DISCONNECT_ERRORS, ConnectionClosedError)
except ImportError:
    pass


async def _safe_send_json(websocket: WebSocket, message: dict) -> bool:
    """Send JSON to one peer; return False if the socket is already closed."""
    try:
        await websocket.send_json(message)
        return True
    except _SEND_DISCONNECT_ERRORS:
        return False
    except Exception:
        return False


class ConnectionManager:
    """Tracks active WebSocket connections grouped by interview room."""

    def __init__(self):
        # interview_id -> list of {"ws": WebSocket, "role": str}
        self.rooms: Dict[str, List[dict]] = {}

    async def connect(self, interview_id: str, websocket: WebSocket, role: str):
        await websocket.accept()
        self.rooms.setdefault(interview_id, []).append(
            {"ws": websocket, "role": role}
        )

    def disconnect(self, interview_id: str, websocket: WebSocket) -> Optional[str]:
        room = self.rooms.get(interview_id)
        if not room:
            return None

        role = None
        for member in list(room):
            if member["ws"] is websocket:
                role = member["role"]
                room.remove(member)
                break

        if not room:
            self.rooms.pop(interview_id, None)

        return role

    def participants(self, interview_id: str, exclude: WebSocket = None) -> List[str]:
        return [
            m["role"]
            for m in self.rooms.get(interview_id, [])
            if m["ws"] is not exclude
        ]

    def evict_room(self, interview_id: str) -> int:
        """Remove in-memory room state for an interview (e.g. on cascade delete)."""
        room = self.rooms.pop(interview_id, None)
        if not room:
            return 0
        return len(room)

    async def close_room(self, interview_id: str, reason: str = "RECRUITER") -> int:
        """Notify all peers with role-specific messages, close sockets, remove room."""
        from app.services.interview_complete import completion_ws_payload

        room = self.rooms.pop(interview_id, None)
        if not room:
            return 0

        count = len(room)
        for member in room:
            ws = member["ws"]
            payload = completion_ws_payload(interview_id, reason, member["role"])
            try:
                await ws.send_json(payload)
                await ws.close()
            except Exception:
                pass

        return count

    async def broadcast(self, interview_id: str, message: dict, exclude: WebSocket = None):
        room = self.rooms.get(interview_id)
        if not room:
            return

        dead: List[WebSocket] = []
        for member in list(room):
            if member["ws"] is exclude:
                continue
            if not await _safe_send_json(member["ws"], message):
                dead.append(member["ws"])

        for ws in dead:
            self.disconnect(interview_id, ws)


manager = ConnectionManager()

# Message types relayed verbatim to other room participants.
RELAY_TYPES = {
    "offer",
    "answer",
    "ice-candidate",
    "monitoring-event",
    "status-update",
}


def _authorize_websocket(db, interview: Interview, role: str, token: str) -> bool:
    if role not in ("recruiter", "student"):
        return False

    payload = decode_access_token(token or "")
    if not payload:
        return False

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or user.role != role:
        return False

    if role == "recruiter":
        return str(interview.recruiter_id) == str(user.id)

    participant = (
        db.query(Participant)
        .filter(
            Participant.interview_id == str(interview.id),
            Participant.student_id == str(user.id),
        )
        .first()
    )
    return participant is not None


@router.websocket("/ws/interview/{interview_id}")
async def interview_socket(websocket: WebSocket, interview_id: str):
    role = websocket.query_params.get("role", "guest")
    token = websocket.query_params.get("token")

    db = SessionLocal()
    try:
        interview = (
            db.query(Interview)
            .filter(Interview.id == interview_id)
            .first()
        )
        if not interview:
            await websocket.close(code=4004, reason="Interview not found")
            return
        if interview.status == "completed":
            await websocket.accept()
            sent = await _safe_send_json(
                websocket,
                {
                    "type": "interview-completed",
                    "interview_id": str(interview_id),
                    "message": "This interview has already been completed.",
                },
            )
            if sent:
                try:
                    await websocket.close()
                except Exception:
                    pass
            return

        if not _authorize_websocket(db, interview, role, token):
            await websocket.close(code=4401, reason="Unauthorized")
            return
    finally:
        db.close()

    await manager.connect(interview_id, websocket, role)

    if not await _safe_send_json(
        websocket,
        {
            "type": "room-joined",
            "role": role,
            "participants": manager.participants(interview_id, exclude=websocket),
        },
    ):
        manager.disconnect(interview_id, websocket)
        return

    await manager.broadcast(
        interview_id,
        {"type": "peer-joined", "role": role},
        exclude=websocket,
    )

    try:
        while True:
            data = await websocket.receive_json()

            msg_type = data.get("type")
            data.setdefault("from", role)

            if msg_type in RELAY_TYPES:
                await manager.broadcast(interview_id, data, exclude=websocket)
            # Unknown message types are ignored (forward-compatible).

    except WebSocketDisconnect:
        left_role = manager.disconnect(interview_id, websocket)
        if left_role:
            await manager.broadcast(
                interview_id,
                {"type": "peer-left", "role": left_role},
            )
    except Exception:
        manager.disconnect(interview_id, websocket)
