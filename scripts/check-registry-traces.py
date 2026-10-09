"""Check serving projection inclusion and complete archive exclusion in real traces."""
import json
from pathlib import Path
full=Path("data/govroute-locations.db")
runtime=Path("data/govroute-runtime.db")
assert full.is_file() and full.stat().st_size>200_000_000
assert runtime.is_file() and runtime.stat().st_size<=190*1024*1024
traces=list(Path(".next").rglob("*.nft.json"))
assert traces, "No production traces"
included=[]
for trace in traces:
    paths=[(trace.parent/value).resolve() for value in json.loads(trace.read_text())["files"]]
    assert all(path.name!=full.name for path in paths), f"Full archive leaked: {trace}"
    if any(path.name==runtime.name for path in paths):
        size=sum(path.stat().st_size for path in set(paths) if path.is_file())
        assert size<230*1024*1024, f"Function trace exceeds size budget: {trace}: {size}"
        included.append(str(trace))
assert any("/api/places/" in name for name in included), "Place API has no serving snapshot"
assert any("/api/chat/" in name for name in included), "Chat API has no serving snapshot"
assert any("/api/local-resources/" in name for name in included), "Local API has no serving snapshot"
print(json.dumps({"traces":len(traces),"servingBytes":runtime.stat().st_size,"included":included}))
