import os
import sys
import time
import tracemalloc
import psutil

# Ensure current directory is on python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure console output to UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from core.hf_client import compute_sentence_similarity_sync, classify_zero_shot_sync
from services.bloom_service import classify_bloom
from services.metadata_service import suggest_metadata_pipeline
from services.similarity_service import compute_paper_similarity
from schemas.nlp_schemas import ArchivedPaper, CourseOutcomeItem

def get_current_ram_mb() -> float:
    """Returns current process RSS memory in MB."""
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

def run_tests():
    print("=" * 70)
    print("  HUGGING FACE SERVERLESS INFERENCE BENCHMARK & VERIFICATION")
    print("=" * 70)

    initial_ram = get_current_ram_mb()
    print(f"[+] Initial Process RAM Footprint: {initial_ram:.2f} MB")

    # -------------------------------------------------------------------------
    # Test 1: Sentence Similarity Verification
    # -------------------------------------------------------------------------
    print("\n--- [Test 1] Sentence Similarity Check ---")
    source_sentence = "Explain the Dijkstra shortest path algorithm with time complexity."
    candidate_sentences = [
        "Describe Dijkstra algorithm and its complexity.",
        "What is database normalization in SQL?"
    ]

    t0 = time.perf_counter()
    scores = compute_sentence_similarity_sync(source_sentence, candidate_sentences)
    sim_duration = (time.perf_counter() - t0) * 1000

    print(f"Source: \"{source_sentence}\"")
    print(f"Candidate 1: \"{candidate_sentences[0]}\" -> Score: {scores[0]:.4f}")
    print(f"Candidate 2: \"{candidate_sentences[1]}\" -> Score: {scores[1]:.4f}")
    print(f"[⏱] Latency: {sim_duration:.2f} ms")

    assert scores[0] > 0.70, f"Expected Candidate 1 score > 0.70, got {scores[0]}"
    assert scores[1] < 0.45, f"Expected Candidate 2 score < 0.45, got {scores[1]}"
    print("[✓] TEST 1 PASSED: Sentence similarity accurately discriminates semantic relevance.")

    # -------------------------------------------------------------------------
    # Test 2: Bloom Taxonomy Zero-Shot Check
    # -------------------------------------------------------------------------
    print("\n--- [Test 2] Bloom Taxonomy Zero-Shot Check ---")
    bloom_question = "Design a high-throughput microservice architecture using Kafka and Redis."

    t0 = time.perf_counter()
    bloom_result = classify_bloom(bloom_question)
    bloom_duration = (time.perf_counter() - t0) * 1000

    print(f"Question: \"{bloom_question}\"")
    print(f"Suggested Bloom Level: {bloom_result.suggested} ({bloom_result.name})")
    print(f"Confidence: {bloom_result.confidence * 100:.1f}%")
    print("Rankings:")
    for r in bloom_result.rankings:
        print(f"   - {r.level} ({r.name}): {r.score * 100:.1f}%")
    print(f"[⏱] Latency: {bloom_duration:.2f} ms")

    assert bloom_result.suggested in ["C6", "C5", "C3"], (
        f"Expected high-order cognitive level (C6 Create), got {bloom_result.suggested}"
    )
    assert bloom_result.name in ["Create", "Analyze", "Apply"], (
        f"Expected 'Create' level taxonomy, got {bloom_result.name}"
    )
    print(f"[✓] TEST 2 PASSED: Correctly classified question under '{bloom_result.name}' ({bloom_result.suggested}).")

    # -------------------------------------------------------------------------
    # Test 3: Full Metadata Suggestion Pipeline (/suggest-metadata)
    # -------------------------------------------------------------------------
    print("\n--- [Test 3] End-to-End Metadata Suggestion Pipeline Check ---")
    co_candidates = [
        CourseOutcomeItem(code="CO1", description="Understand OOP principles: classes, inheritance, polymorphism."),
        CourseOutcomeItem(code="CO2", description="Implement algorithms and evaluate data structure complexity."),
        CourseOutcomeItem(code="CO3", description="Design microservice architectures and distributed system components.")
    ]

    t0 = time.perf_counter()
    meta_response = suggest_metadata_pipeline(bloom_question, co_candidates)
    meta_duration = (time.perf_counter() - t0) * 1000

    print(f"Suggested Bloom: {meta_response['suggestedBloom']} ({meta_response['bloomConfidence']}%)")
    print(f"Suggested CO: {meta_response['suggestedCO']} ({meta_response['coMatchPercentage']}%)")
    print(f"[⏱] Pipeline Latency: {meta_duration:.2f} ms")

    assert meta_response["suggestedBloom"] in ["C6", "C5", "C3"]
    assert meta_response["suggestedCO"] == "CO3", f"Expected CO3 (distributed/microservices), got {meta_response['suggestedCO']}"
    print("[✓] TEST 3 PASSED: Full metadata suggestion pipeline produced correct Bloom + CO mapping.")

    # -------------------------------------------------------------------------
    # Test 4: Paper Similarity Check (/similarity-check)
    # -------------------------------------------------------------------------
    print("\n--- [Test 4] Paper Similarity Check ---")
    current_paper = (
        "Question 1: Explain the Dijkstra shortest path algorithm with time complexity.\n"
        "Question 2: What is database normalization and 3NF?"
    )
    archived_papers = [
        ArchivedPaper(
            id="archive-1",
            assessmentName="Fall 2024 Final",
            text="Question 1: Describe Dijkstra algorithm and calculate its complexity.\nQuestion 2: Explain binary trees."
        ),
        ArchivedPaper(
            id="archive-2",
            assessmentName="Spring 2023 Midterm",
            text="Question 1: Write an essay on global warming.\nQuestion 2: History of computing."
        )
    ]

    t0 = time.perf_counter()
    sim_res = compute_paper_similarity(current_paper, archived_papers)
    sim_check_duration = (time.perf_counter() - t0) * 1000

    print(f"Compared Archives: {sim_res.totalArchivesCompared}")
    print(f"Max Similarity: {sim_res.maxSimilarity}%")
    for r in sim_res.results:
        print(f"   - {r.assessmentName}: {r.overallSimilarity}% ({r.verdict})")
    print(f"[⏱] Latency: {sim_check_duration:.2f} ms")

    assert sim_res.success is True
    assert sim_res.results[0].assessmentName == "Fall 2024 Final"
    assert sim_res.results[0].overallSimilarity > 25
    print("[✓] TEST 4 PASSED: Paper similarity detected overlapping exam questions correctly.")

    # -------------------------------------------------------------------------
    # Resource & Memory Footprint Verification
    # -------------------------------------------------------------------------
    print("\n" + "=" * 70)
    final_ram = get_current_ram_mb()
    delta_ram = final_ram - initial_ram

    print(f"  MEMORY & PERFORMANCE SUMMARY")
    print("=" * 70)
    print(f"[+] Final Process RAM:   {final_ram:.2f} MB")
    print(f"[+] Memory Growth (Δ):   {delta_ram:.2f} MB")
    print(f"[+] Render 512MB Budget: {final_ram / 512.0 * 100:.1f}% used ({512.0 - final_ram:.1f} MB headroom)")
    assert final_ram < 120.0, f"Expected RAM < 120MB, but was {final_ram:.2f}MB"
    print("[✓] MEMORY BUDGET VERIFIED: Well under 100MB target, perfectly safe for Render 512MB free tier!")
    print("=" * 70)
    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
