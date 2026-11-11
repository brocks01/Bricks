from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import Connection

from ...core import auth_state
from ...core.config import get_settings
from ...core.db import get_conn
from . import service
from .schemas import CodeSentOut, GoogleIn, ProfilePatch, ProvidersOut, RefreshIn, RequestCodeIn, SessionOut, UserOut, VerifyCodeIn

router = APIRouter(prefix="/v1")


def _refuse(e: service.AuthError) -> JSONResponse:
    # Returned, not raised, so the request's database changes (such as a counted wrong attempt) are still saved.
    return JSONResponse(status_code=e.status, content={"detail": {"code": e.code, **e.extra}})


def _on_this_computer(request: Request) -> bool:
    """The test-mode code is shown only to a caller who reached us directly (this computer or its own network), never through a public
    tunnel or proxy, which always add X-Forwarded-For. Otherwise anyone with the public address could sign in as anyone."""
    return not (request.headers.get("x-forwarded-for") or request.headers.get("forwarded"))


def current_user_id(authorization: str | None = Header(default=None)) -> str:
    """Stateless check: signature, expiry and claims, then the in-memory logged-out list and "changed at". `token_expired` makes the app refresh once and retry."""
    token = (authorization or "").removeprefix("Bearer ").strip()
    try:
        claims, why = auth_state.verify(token) if token else (None, "invalid")
    except auth_state.Unavailable:
        raise HTTPException(status_code=503, detail={"code": "auth_unavailable"})
    if not claims:
        raise HTTPException(status_code=401, detail={"code": "token_expired" if why == "expired" else "unauthorized"})
    return str(claims["sub"])


@router.post("/auth/request-code", response_model=CodeSentOut)
def request_code(body: RequestCodeIn, request: Request, conn: Connection = Depends(get_conn)):
    try:
        code, expires_in = service.request_code(conn, body.email)
    except service.AuthError as e:
        return _refuse(e)
    return CodeSentOut(sent=True, expires_in=expires_in, dev_code=code if get_settings().is_dev and _on_this_computer(request) else None)


@router.post("/auth/verify-code", response_model=SessionOut)
def verify_code(body: VerifyCodeIn, request: Request, conn: Connection = Depends(get_conn)):
    try:
        return service.verify_code(conn, body.email, body.code, request.headers.get("user-agent", ""))
    except service.AuthError as e:
        return _refuse(e)


@router.get("/auth/providers", response_model=ProvidersOut)
def auth_providers():
    return service.providers()


@router.post("/auth/google", response_model=SessionOut)
def google(body: GoogleIn, request: Request, conn: Connection = Depends(get_conn)):
    try:
        return service.google_sign_in(conn, body.id_token, request.headers.get("user-agent", ""))
    except service.AuthError as e:
        return _refuse(e)


@router.post("/auth/refresh", response_model=SessionOut)
def refresh(body: RefreshIn, request: Request, conn: Connection = Depends(get_conn)):
    try:
        return service.refresh_session(conn, body.refresh_token, request.headers.get("user-agent", ""))
    except service.AuthError as e:
        return _refuse(e)


@router.post("/auth/sign-out", status_code=204)
def sign_out(body: RefreshIn, conn: Connection = Depends(get_conn)):
    service.sign_out(conn, body.refresh_token)


@router.get("/me", response_model=UserOut)
def get_me(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    row = service.get_user(conn, user_id)
    if row is None:
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})
    return service.user_dict(row)


@router.patch("/me", response_model=UserOut)
def patch_me(body: ProfilePatch, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.update_profile(conn, user_id, body.model_dump(exclude_unset=True))
    except service.AuthError as e:
        return _refuse(e)
