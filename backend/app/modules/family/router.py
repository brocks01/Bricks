"""Family and supported-member routes. Every route needs the caller's own access token; an assisted
profile has none of its own, so it cannot call any of these until it is claimed."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service
from .schemas import AssistedIn, ClaimIn, ClaimOut, DelegationsOut, DelegationGrantIn, DelegationLevelIn, DelegationOut, FamilyIn, FamilyOut, FamiliesOut, InviteAcceptIn, InviteIn, InviteOut, MemberRoleIn, PermissionEventsOut

router = APIRouter(prefix="/v1")


def _refuse(e: service.FamilyError):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=e.status, content={"detail": {"code": e.code, **e.extra}})


@router.post("/families", response_model=FamilyOut)
def create_family(body: FamilyIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.create_family(conn, user_id, body.name)
    except service.FamilyError as e:
        return _refuse(e)


@router.get("/families/mine", response_model=FamiliesOut)
def my_families(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"families": service.my_families(conn, user_id)}


@router.get("/families/{family_id}", response_model=FamilyOut)
def get_family(family_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.family_dict(conn, family_id, user_id)
    except service.FamilyError as e:
        return _refuse(e)


@router.patch("/families/{family_id}", response_model=FamilyOut)
def rename_family(family_id: str, body: FamilyIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.rename_family(conn, family_id, user_id, body.name)
    except service.FamilyError as e:
        return _refuse(e)


@router.post("/families/{family_id}/invites", response_model=InviteOut)
def send_invite(family_id: str, body: InviteIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.send_invite(conn, family_id, user_id, body.contact, body.role)
    except service.FamilyError as e:
        return _refuse(e)


@router.post("/family-invites/accept", response_model=FamilyOut)
def accept_invite(body: InviteAcceptIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.accept_invite(conn, user_id, body.code)
    except service.FamilyError as e:
        return _refuse(e)


@router.patch("/families/{family_id}/members/{member_id}", response_model=FamilyOut)
def change_role(family_id: str, member_id: str, body: MemberRoleIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.change_role(conn, family_id, user_id, member_id, body.role)
    except service.FamilyError as e:
        return _refuse(e)


@router.delete("/families/{family_id}/members/{member_id}", status_code=204)
def leave_or_remove(family_id: str, member_id: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        service.leave_or_remove(conn, family_id, user_id, member_id)
    except service.FamilyError as e:
        return _refuse(e)


@router.post("/families/{family_id}/assisted", response_model=FamilyOut)
def create_assisted(family_id: str, body: AssistedIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.create_assisted(conn, family_id, user_id, body.model_dump())
    except service.FamilyError as e:
        return _refuse(e)


# ---------------------------------------------------------------- delegated access


@router.post("/delegations", response_model=DelegationOut)
def grant(body: DelegationGrantIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.grant(conn, user_id, body.helper_id, body.level)
    except service.FamilyError as e:
        return _refuse(e)


@router.get("/delegations/mine", response_model=DelegationsOut)
def delegations_held(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"delegations": service.delegations_held(conn, user_id)}


@router.get("/me/delegations", response_model=DelegationsOut)
def delegations_about_me(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"delegations": service.delegations_about_me(conn, user_id)}


@router.get("/me/permission-events", response_model=PermissionEventsOut)
def permission_events(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"events": service.history(conn, user_id)}


@router.patch("/delegations/{delegation_id}", response_model=DelegationOut)
def change_level(delegation_id: str, body: DelegationLevelIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.change_level(conn, delegation_id, user_id, body.level)
    except service.FamilyError as e:
        return _refuse(e)


@router.delete("/delegations/{delegation_id}", status_code=204)
def revoke(delegation_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        service.revoke(conn, delegation_id, user_id)
    except service.FamilyError as e:
        return _refuse(e)


# ---------------------------------------------------------------- the person claims their own account


@router.post("/families/{family_id}/assisted/{person_id}/claim-code")
def start_claim(family_id: str, person_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.start_claim(conn, family_id, user_id, person_id)
    except service.FamilyError as e:
        return _refuse(e)


@router.post("/auth/claim", response_model=ClaimOut)
def claim(body: ClaimIn, request: Request, conn: Connection = Depends(get_conn)):
    try:
        return service.claim(conn, body.code, body.email, request.headers.get("user-agent", ""))
    except service.FamilyError as e:
        return _refuse(e)
