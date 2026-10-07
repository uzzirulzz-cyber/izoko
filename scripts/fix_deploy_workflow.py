# Fix the deploy.yml branches selector directly on GitHub, fully in-memory.
# The local sandbox corrupts the literal "[m" byte sequence on file reads and
# writes, so this script never touches the filesystem.
import json, base64, urllib.request, os

TOKEN = os.environ["GH_TOKEN"]
REPO = "uzzirulzz-cyber/izoko"
PATH = ".github/workflows/deploy.yml"
HDR = { "Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json", "Content-Type": "application/json" }

def api(url, data=None, method="GET"):
    req = urllib.request.Request(url, headers=HDR, method=method)
    body = json.dumps(data).encode() if data is not None else None
    with urllib.request.urlopen(req, body) as r:
        return json.load(r)

# 1. current file metadata + content (from the API — clean network bytes)
meta = api(f"https://api.github.com/repos/{REPO}/contents/{PATH}?ref=main")
raw = base64.b64decode(meta["content"])
print("before:", [l for l in raw.decode().split("\n") if "branches" in l])

# 2. fix in memory — construct target without the cursed byte pair appearing
#    in any literal of this script
bracket_open = chr(0x5B)          # [
fixed = raw.decode().replace("branches: " + bracket_open + "main" + chr(0x5D), "branches: " + bracket_open + "m" + "ain" + chr(0x5D))
# the above is a no-op if already fixed; the real fix for the broken variant:
fixed = fixed.replace("branches: ain" + chr(0x5D), "branches: " + bracket_open + "m" + "ain" + chr(0x5D))
after = [l for l in fixed.split("\n") if "branches" in l][0]
print("after: ", repr(after))
assert "main" in after and "ain" + chr(0x5D) in after, "fix failed"

# 3. commit via Contents API — direct HTTP, no intermediate files
resp = api(f"https://api.github.com/repos/{REPO}/contents/{PATH}", {
    "message": "fix(ci): restore production deploy trigger on push",
    "content": base64.b64encode(fixed.encode()).decode(),
    "sha": meta["sha"],
    "branch": "main",
}, method="PUT")
print("commit:", resp.get("commit", {}).get("sha", "?")[:7])

# 4. verify by re-fetching
check = api(f"https://api.github.com/repos/{REPO}/contents/{PATH}?ref=main")
line = [l for l in base64.b64decode(check["content"]).decode().split("\n") if "branches" in l][0]
print("verify:", repr(line), "| new sha:", check["sha"][:7])
print("OK" if ("m" + "ain") in line else "STILL BROKEN")
