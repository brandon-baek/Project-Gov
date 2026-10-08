"""Check production traces with the actual national snapshot present."""
import json
from pathlib import Path

registry = Path("data/govroute-locations.db")
assert registry.is_file() and registry.stat().st_size > 200_000_000, "Use the actual national registry"
traces = list(Path(".next").rglob("*.nft.json"))
assert traces, "No production file traces found"
included = [
    str(trace)
    for trace in traces
    if any(Path(value).name == registry.name for value in json.loads(trace.read_text())["files"])
]
assert not included, f"National registry leaked into serverless traces: {included}"
print(f"Checked {len(traces)} production traces; national registry excluded")
