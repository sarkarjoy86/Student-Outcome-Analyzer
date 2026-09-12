import unittest
import os
import sys

# Ensure ml-service root is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ROOT = os.path.dirname(CURRENT_DIR)
if SERVICE_ROOT not in sys.path:
    sys.path.insert(0, SERVICE_ROOT)

from services.bloom_service import detect_action_verb, classify_bloom, sanitize_question_text


class TestAdvancedBloomClassifier(unittest.TestCase):
    """
    Unit test suite verifying the Advanced Context-Aware Pedagogical Bloom Classifier
    for Computer Science and Software Engineering assessments.
    """

    def setUp(self):
        self.edge_cases = [
            (
                "Use a friend function to overload any Binary operator.",
                "C3",
                "Apply",
                "Context Guard 1: Imperative 'Use ... to/for' -> C3"
            ),
            (
                "Why does the following code produce an error? Explain how to fix it: class MyClass { private: int y; };",
                "C4",
                "Analyze",
                "Context Guard: Error debugging & fix analysis takes precedence over 'explain' (C4 > C2)"
            ),
            (
                "Define data abstraction in OOP.",
                "C1",
                "Remember",
                "Context Guard: 'define [concept]' -> C1"
            ),
            (
                "Define a class named Employee with salary attributes.",
                "C3",
                "Apply",
                "Context Guard: 'define a class' routes to C3 (Apply) instead of C1"
            ),
            (
                "What is the output of the following recursive function?",
                "C3",
                "Apply",
                "Context Guard 3: Output tracing ('what is the output of') -> C3 (Apply)"
            ),
            (
                "Explain the differences between procedural and OOP paradigms.",
                "C2",
                "Understand",
                "Comprehension: 'explain differences between' -> C2"
            ),
            (
                "Critique the decision to use deep inheritance over composition in large-scale systems.",
                "C5",
                "Evaluate",
                "Evaluation & Judgment: 'critique the decision' -> C5"
            ),
            (
                "Design an extensible, decoupled microservice architecture for banking transactions.",
                "C6",
                "Create",
                "Architectural Synthesis: high-level architecture design -> C6"
            ),
            (
                "3. a. Compare association, aggregation, and composition using UML class diagrams and suitable real-life examples, and examine their importance in object-oriented system design.",
                "C4",
                "Analyze",
                "Structural/Design comparison with UML and multi-clause analytical 'examine' directive -> C4"
            )
        ]

    def test_detect_action_verb_edge_cases(self):
        """Verify that detect_action_verb correctly routes each of the 8 required edge cases."""
        for question, expected_code, expected_name, description in self.edge_cases:
            cleaned = sanitize_question_text(question)
            verb_code, verb_name, matched_verb, word_idx = detect_action_verb(cleaned)
            self.assertEqual(
                verb_code,
                expected_code,
                f"Failed: {description}\nQuestion: '{question}'\nExpected: {expected_code}, Got: {verb_code} (verb: '{matched_verb}')"
            )
            self.assertEqual(verb_name, expected_name)

    def test_classify_bloom_edge_cases_and_confidence(self):
        """Verify that classify_bloom returns expected Bloom levels and calibrated confidence (78%-94%)."""
        for question, expected_code, expected_name, description in self.edge_cases:
            result = classify_bloom(question)
            self.assertEqual(
                result.suggested,
                expected_code,
                f"classify_bloom failed: {description}\nQuestion: '{question}'\nExpected: {expected_code}, Got: {result.suggested}"
            )
            self.assertEqual(result.level, expected_code)
            self.assertEqual(result.name, expected_name)

            # Confidence check: must be in 78% - 94% calibrated window
            confidence_pct = int(round(result.confidence * 100))
            self.assertGreaterEqual(
                confidence_pct,
                78,
                f"Confidence {confidence_pct}% is below minimum 78% for question: '{question}'"
            )
            self.assertLessEqual(
                confidence_pct,
                94,
                f"Confidence {confidence_pct}% exceeds maximum 94% for question: '{question}'"
            )

            # Ensure rankings list is populated and starts with the suggested level
            self.assertGreater(len(result.rankings), 0)
            self.assertEqual(result.rankings[0].level, expected_code)

    def test_compound_hierarchy_priority(self):
        """Verify that compound questions resolve to the highest Bloom cognitive level present: C6 > C5 > C4 > C3 > C2 > C1."""
        compound_test_cases = [
            # C2 ("explain") vs C3 ("implement") -> C3 wins
            ("Explain the concept of encapsulation and implement a banking account class.", "C3"),
            # C2 ("describe") vs C4 ("debug") -> C4 wins
            ("Describe the program flow and debug the infinite loop error.", "C4"),
            # C3 ("write a script") vs C5 ("critique the design") -> C5 wins
            ("Write a script to test the cache and critique the design decisions made.", "C5"),
            # C3 ("implement") vs C6 ("design an architecture") -> C6 wins
            ("Implement the database connector and design an extensible decoupled event-driven architecture.", "C6"),
        ]

        for q, expected in compound_test_cases:
            cleaned = sanitize_question_text(q)
            verb_code, _, matched_verb, _ = detect_action_verb(cleaned)
            self.assertEqual(
                verb_code,
                expected,
                f"Compound hierarchy violation: Q: '{q}', expected {expected}, got {verb_code} ('{matched_verb}')"
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
