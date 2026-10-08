import copy
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

from pipeline.locations import ROOT, add_census, dataset, load_manifest
from pipeline.processes import load_processes


class ProcessPublicationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript((ROOT / "database/registry/001_registry.sql").read_text())
        dataset(self.db, "fixture", "https://www.census.gov", "Census", "fixture")
        self.db.execute("INSERT INTO places(id,name,search_name,kind,name_status,government_status,dataset_id) VALUES('country:US','United States','united states','country','official','active','fixture')")
        self.state = add_census(self.db, {"GEOID": "06", "NAME": "California", "STUSAB": "CA", "STATE": "06", "FUNCSTAT": "A"}, "state", "fixture", 80)
        load_manifest(self.db, ROOT / "data/registry/sources.json")
        self.db.commit()
        self.manifest = json.loads((ROOT / "data/registry/processes.json").read_text())

    def tearDown(self):
        self.db.close()

    def publish(self, manifest=None):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "processes.json"
            file.write_text(json.dumps(manifest or self.manifest))
            with self.db:
                return load_processes(self.db, file)

    def test_publishes_sourced_steps_with_explicit_state_and_federal_scopes(self):
        self.assertEqual(self.publish(), 2)
        self.assertEqual(self.db.execute("SELECT territory_id FROM process_publications ORDER BY process_id").fetchall(), [(self.state,), ("country:US",)])
        self.assertEqual(self.db.execute("SELECT count(*) FROM process_steps").fetchone()[0], 9)
        document = json.loads(self.db.execute("SELECT document_json FROM process_publications WHERE process_id='journey-passport-apply'").fetchone()[0])
        self.assertEqual(document["steps"][1]["dependsOn"], ["choose"])
        self.assertTrue(document["steps"][2]["fees"])
        self.assertFalse(self.db.execute("SELECT 1 FROM legal_snapshots").fetchone(), "Authored publications must not invent crawler snapshots")
        self.assertFalse(self.db.execute("PRAGMA foreign_key_check").fetchall())

    def test_missing_topic_scope_prevents_publication_and_rolls_back_all_processes(self):
        with self.db:
            self.db.execute("DELETE FROM authority_scopes WHERE authority_id='authority:ca-dmv'")
        with self.assertRaisesRegex(ValueError, "scope"):
            self.publish()
        self.assertEqual(self.db.execute("SELECT count(*) FROM process_definitions").fetchone()[0], 0)
        self.assertEqual(self.db.execute("SELECT count(*) FROM process_step_sources").fetchone()[0], 0)

    def test_unreviewed_or_wrong_authority_source_cannot_support_a_step(self):
        with self.db:
            self.db.execute("UPDATE legal_sources SET authority_id='authority:ca-dmv' WHERE id='passport-mail'")
        with self.assertRaisesRegex(ValueError, "authority and topic"):
            self.publish()

    def test_missing_source_and_future_dependency_are_rejected(self):
        for field, value, message in [("sourceIds", ["not-declared"], "cite"), ("dependsOn", ["timing"], "earlier")]:
            bad = copy.deepcopy(self.manifest)
            bad["processes"][0]["journey"]["steps"][0][field] = value
            with self.assertRaisesRegex(ValueError, message):
                self.publish(bad)
            self.assertEqual(self.db.execute("SELECT count(*) FROM process_publications").fetchone()[0], 0)

    def test_statistical_or_wrong_state_selector_cannot_publish_a_state_process(self):
        bad = copy.deepcopy(self.manifest)
        bad["processes"][1]["territory"] = {"id": "country:US"}
        with self.assertRaisesRegex(ValueError, "conflicting territory"):
            self.publish(bad)

    def test_duplicate_ids_or_steps_cannot_publish(self):
        for level in ("process", "step"):
            bad = copy.deepcopy(self.manifest)
            if level == "process":
                bad["processes"].append(bad["processes"][0])
            else:
                bad["processes"][0]["journey"]["steps"].append(bad["processes"][0]["journey"]["steps"][0])
            with self.assertRaisesRegex(ValueError, "Duplicate"):
                self.publish(bad)

    def test_review_date_mismatch_is_rejected(self):
        bad = copy.deepcopy(self.manifest)
        bad["processes"][0]["journey"]["sources"][0]["lastChecked"] = "2020-01-01"
        with self.assertRaisesRegex(ValueError, "date"):
            self.publish(bad)


if __name__ == "__main__":
    unittest.main()
