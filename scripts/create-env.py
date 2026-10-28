#!/usr/bin/env python3
"""Create independent local secrets. Never overwrite an existing configuration."""
import os, secrets, pathlib, argparse
from urllib.parse import urlparse
parser=argparse.ArgumentParser()
parser.add_argument("--url",default="http://localhost:3000")
args=parser.parse_args()
url=urlparse(args.url)
if url.scheme not in ("http","https") or not url.hostname or url.username or url.password or url.path not in ("","/") or url.query or url.fragment:
    parser.error("Use the exact http(s) application origin, without credentials, paths or queries.")
root=pathlib.Path(__file__).resolve().parent.parent
password=secrets.token_hex(32)
content=(root/".env.example").read_text()
content=content.replace("COMPOSE_PROJECT_NAME=penge-your-unique-instance","COMPOSE_PROJECT_NAME=penge-"+secrets.token_hex(4))
content=content.replace("generate-a-random-64-character-hex-value",password)
content=content.replace("generate-a-different-random-64-character-hex-value",secrets.token_hex(32))
content=content.replace("generate-an-independent-runtime-password",secrets.token_hex(32))
content=content.replace("http://localhost:3000",args.url.rstrip("/"))
content=content.replace("your-postgres-password",password)
fd=os.open(root/".env",os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,"w") as f:f.write(content)
print("Created private .env with fresh independent secrets. Configure email and backup settings privately.")
