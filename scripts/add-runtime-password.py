#!/usr/bin/env python3
"""Add a new runtime credential to an existing private .env without printing it."""
import pathlib,os,secrets,fcntl
root=pathlib.Path(__file__).resolve().parent.parent
target=root/".env"
with target.open("r+") as f:
    fcntl.flock(f,fcntl.LOCK_EX)
    content=f.read()
    if any(line.split("=",1)[0].strip()=="APP_DATABASE_PASSWORD" for line in content.splitlines() if "=" in line and not line.lstrip().startswith("#")):
        print("Runtime database credential already configured; unchanged.")
    else:
        os.fchmod(f.fileno(),0o600)
        f.seek(0,os.SEEK_END)
        f.write("\nAPP_DATABASE_PASSWORD="+secrets.token_hex(32)+"\n")
        f.flush();os.fsync(f.fileno())
        print("Added a private independent runtime database credential. Existing secrets unchanged.")
