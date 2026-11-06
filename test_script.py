import unittest


class SmokeTest(unittest.TestCase):
    def test_basic_arithmetic(self):
        self.assertEqual(2 + 2, 4)


if __name__ == "__main__":
    unittest.main()