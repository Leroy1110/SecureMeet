def get_token_from_header(authorization: str) -> str:
    if authorization is None:
        raise ValueError("Authorization header is missing")
    if authorization.strip() == "":
        raise ValueError("Authorization header cannot be empty")

    token_list = authorization.split()
    token_firstValue = token_list[0].lower()
    
    if token_firstValue != "bearer":
        raise ValueError("Authorization header must start with 'Bearer'")
    if len(token_list) != 2:
        raise ValueError("Invalid Authorization header format")
    
    token_value = token_list[1].strip()
    return token_value