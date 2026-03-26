from pydantic import BaseModel, Field, model_validator
from datetime import datetime

ROOM_DISPLAY_NAME_MAX_LENGTH = 64


def normalize_room_display_name(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    if not normalized:
        raise ValueError("Display name cannot be empty.")

    if len(normalized) > ROOM_DISPLAY_NAME_MAX_LENGTH:
        raise ValueError(
            f"Display name cannot exceed {ROOM_DISPLAY_NAME_MAX_LENGTH} characters.")

    return normalized


class RoomCreateResponse(BaseModel):
    room_code: str
    room_password: str
    expires_at: datetime
    room_jwt: str


class RoomJoinRequest(BaseModel):
    room_code: str
    room_password: str
    display_name: str | None = Field(default=None)
    nickname: str | None = Field(default=None)

    @model_validator(mode="after")
    def validate_and_normalize(self) -> "RoomJoinRequest":
        self.room_code = self.room_code.strip()
        self.room_password = self.room_password.strip()

        self.display_name = normalize_room_display_name(self.display_name)
        self.nickname = normalize_room_display_name(self.nickname)

        if self.display_name is None and self.nickname is not None:
            self.display_name = self.nickname

        return self


class RoomJoinResponse(BaseModel):
    room_jwt: str


class RoomDisplayNameUpdateRequest(BaseModel):
    room_code: str
    display_name: str

    @model_validator(mode="after")
    def validate_and_normalize(self) -> "RoomDisplayNameUpdateRequest":
        self.room_code = self.room_code.strip()
        if not self.room_code:
            raise ValueError("Room code cannot be empty.")

        normalized_display_name = normalize_room_display_name(self.display_name)
        if normalized_display_name is None:
            raise ValueError("Display name is required.")

        self.display_name = normalized_display_name
        return self


class RoomDisplayNameUpdateResponse(BaseModel):
    display_name: str
