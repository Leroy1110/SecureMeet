// Auth types
export type User = {
    id: number
    email: string
    username: string
    created_at: string
}

export type LoginRequest = {
    email: string
    password: string
}

export type RegisterRequest = {
    email: string
    username: string
    password: string
}

export type TokenResponse = {
    access_token: string
    token_type: string
}

// Room types
export type RoomCreateResponse = {
    room_code: string
    room_password: string
    expires_at: string
    room_jwt: string
}

export type RoomJoinRequest = {
    room_code: string
    room_password: string
}

export type RoomJoinResponse = {
    room_jwt: string
}