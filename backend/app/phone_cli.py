"""python backend/run.py link-phone you@example.com +6591234567   let this number phone Interchange and reach this account (owner use: for a number you know is theirs)."""
import sys

from sqlalchemy import text

from .core.db import engine
from .modules.channels import core


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        print(__doc__)
        return
    with engine().connect() as conn:
        uid = conn.execute(text("select id from users where lower(email) = :e"), {"e": argv[0].strip().lower()}).scalar()
    if uid is None:
        print("No account with that email.")
    elif core.link_phone(str(uid), argv[1]):
        print("Linked. That number can now phone Interchange.")
    else:
        print("The number must be in international form, like +6591234567.")


if __name__ == "__main__":
    main(sys.argv[1:])
