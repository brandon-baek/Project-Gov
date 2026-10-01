import unittest
from pipeline.pathways import task_profile, canonical_url, guide_location

class PublicationTests(unittest.TestCase):
    def test_georgia_rule_is_not_triggered_by_other_online_services(self):
        self.assertIsNone(task_profile('Online Services', 'https://bradfordme.gov/online-services'))
        self.assertEqual(task_profile('Skip the Trip', 'https://dds.georgia.gov/')[0], 'Use Georgia driver services online')
    def test_generic_navigation_is_not_a_task(self):
        self.assertIsNone(task_profile('Apply For', 'https://town.gov/apply-for'))
        self.assertIsNone(task_profile('Report', 'https://town.gov/report'))
    def test_tracking_and_scoped_location(self):
        self.assertEqual(canonical_url('https://www.town.gov/task/?utm_source=x#top'), canonical_url('https://town.gov/task'))
        catalog={'ny.gov': {'jurisdiction':'state','state':'NY','locality':''}, 'town.ny.gov': {'jurisdiction':'local','state':'NY','locality':'Town'}}
        self.assertEqual(guide_location('https://town.ny.gov/task',catalog,None)['locality'], 'Town')
        self.assertEqual(guide_location('https://unknown.gov',catalog,None)['jurisdiction'], 'unknown')
if __name__ == '__main__': unittest.main()
