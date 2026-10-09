import csv, io, json, sqlite3, tempfile, unittest
from pathlib import Path
from pipeline.locations import ROOT, add_census, dataset
from pipeline.government_directory import import_directory, load_rows
from pipeline.local_sources import crawl_queue, store_page, validate_url, Links
from pipeline.compact_registry import compact

class NationalBackendTests(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(":memory:")
        self.db.executescript((ROOT/"database/registry/001_registry.sql").read_text())
        dataset(self.db,"fixture","https://census.gov","Census","fixture")
        for code,state,county,name in [("CA","06","06001","Oakland city"),("TX","48","48001","Oakland city")]:
            add_census(self.db,{"GEOID":state,"NAME":code,"STATE":state,"STUSAB":code,"FUNCSTAT":"A"},"state","fixture",80)
            add_census(self.db,{"GEOID":county,"NAME":"Fixture County","STATE":state,"STUSAB":code,"FUNCSTAT":"A"},"county","fixture",82)
            add_census(self.db,{"GEOID":state+"12345","NAME":name,"STATE":state,"STUSAB":code,"FUNCSTAT":"A","_layer_name":"Incorporated Places","unused":"raw "*1000},"municipality","fixture",28)
    def tearDown(self): self.db.close()
    def inventory(self,rows):
        output=io.StringIO(); writer=csv.writer(output)
        writer.writerow(["Domain name","Domain type","Organization name","Suborganization name","City","State"])
        writer.writerows(rows); return output.getvalue()
    def import_rows(self,rows): return import_directory(self.db,self.inventory(rows),minimum=1)
    def test_mailing_city_cannot_certify_the_registrant(self):
        self.import_rows([["agency.gov","City","Office of the Clerk","","Oakland","CA"]])
        self.assertEqual(self.db.execute("SELECT match_status FROM government_domains").fetchone()[0],"unmatched")
        self.assertEqual(self.db.execute("SELECT count(*) FROM authority_scopes").fetchone()[0],0)
    def test_same_name_is_state_scoped_and_never_grants_topic_scope(self):
        self.import_rows([["oakland.gov","City","City of Oakland","","Oakland","CA"]])
        self.assertEqual(self.db.execute("SELECT place_id FROM domain_places").fetchone()[0],"census:28:0612345")
        self.assertEqual(self.db.execute("SELECT count(*) FROM authority_scopes").fetchone()[0],0)
    def test_ambiguous_city_and_township_are_not_silently_linked(self):
        add_census(self.db,{"GEOID":"0600112345","NAME":"Oakland township","STATE":"06","STUSAB":"CA","FUNCSTAT":"A"},"county_subdivision","fixture",84)
        self.import_rows([["oakland.gov","City","City of Oakland","","Oakland","CA"]])
        self.assertEqual(self.db.execute("SELECT match_status FROM government_domains").fetchone()[0],"ambiguous")
        self.assertFalse(self.db.execute("SELECT 1 FROM domain_places").fetchone())
    def test_inventory_rejects_truncation_duplicates_and_changed_headers(self):
        text=self.inventory([["oakland.gov","City","City of Oakland","","Oakland","CA"]])
        with self.assertRaises(ValueError): load_rows(text,minimum=2)
        with self.assertRaises(ValueError): load_rows(text+text.splitlines()[1]+"\n",minimum=1)
        with self.assertRaises(ValueError): load_rows("domain,type\na.gov,City",minimum=1)
    def test_crawler_rotates_and_preserves_a_success_after_failure(self):
        self.import_rows([["oakland.gov","City","City of Oakland","","Oakland","CA"],["oaklandtx.gov","City","City of Oakland","","Oakland","TX"]])
        item={"domain":"oakland.gov","url":"https://oakland.gov/","status":"indexed","title":"Permits","summary":"Apply","content":"Permit instructions"}
        with self.db: store_page(self.db,item)
        with self.db: store_page(self.db,{**item,"status":"unavailable","error":"Timeout"})
        self.assertEqual(crawl_queue(self.db,1),["oaklandtx.gov"])
        self.assertEqual(self.db.execute("SELECT content FROM directory_pages").fetchone()[0],"Permit instructions")
        self.assertEqual(self.db.execute("SELECT review_status FROM directory_pages").fetchone()[0],"machine_indexed")
        self.assertEqual(self.db.execute("SELECT count(*) FROM directory_search WHERE directory_search MATCH 'Permit'").fetchone()[0],1)
    def test_redirects_and_action_links_stay_inside_the_registered_site(self):
        for url in ["http://oakland.gov","https://oakland.gov.evil.test","https://evil.test","https://user@oakland.gov","https://oakland.gov:8080"]:
            with self.assertRaises(ValueError): validate_url(url,"oakland.gov")
        self.assertEqual(validate_url("https://www.oakland.gov/permits","oakland.gov"),"https://www.oakland.gov/permits")
        links=Links("https://oakland.gov/","oakland.gov")
        links.feed('<a href="/permits">Apply for a permit</a><a href="https://evil.test/license">License</a>')
        self.assertEqual(list(links.links),["https://oakland.gov/permits"])
    def test_serving_projection_preserves_identity_scope_names_and_search(self):
        self.import_rows([["oakland.gov","City","City of Oakland","","Oakland","CA"]])
        with self.db: store_page(self.db,{"domain":"oakland.gov","url":"https://oakland.gov/permits","status":"indexed","title":"Permits","summary":"Apply","content":"Permit instructions"})
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/"full.db"; output=Path(folder)/"runtime.db"
            disk=sqlite3.connect(source); self.db.backup(disk); disk.close()
            manifest=compact(source,output)
            runtime=sqlite3.connect(output)
            self.assertEqual(runtime.execute("SELECT count(*) FROM places").fetchone(),self.db.execute("SELECT count(*) FROM places").fetchone())
            self.assertEqual(runtime.execute("SELECT count(*) FROM authority_scopes").fetchone()[0],0)
            raw=json.loads(runtime.execute("SELECT attributes_json FROM places WHERE kind='municipality' LIMIT 1").fetchone()[0])
            self.assertEqual(raw,{"_layer_name":"Incorporated Places"})
            self.assertEqual(runtime.execute("SELECT count(*) FROM directory_search WHERE directory_search MATCH 'Permit'").fetchone()[0],1)
            self.assertEqual(manifest["schemaVersion"],1)
            runtime.close()

if __name__=="__main__": unittest.main()
