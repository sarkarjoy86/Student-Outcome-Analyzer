# Held-out benchmark -- 20260930_015344

## 1. Split (re-created exactly as in train_sbert.py)

- Total rows 7,009 in 212 Course+CO groups
- Train 6,387 rows / 191 groups
- **Held-out 622 rows / 21 groups / 20 courses** (original questions: 199) -- {'Augmented': 423, 'Original Exam': 197, 'Class Test': 2}

## 2. CO-mapping results

| Model | Subset | n | Top-1 | Top-3 | MRR | Macro-F1 | Weighted-F1 | Mean margin | Random Top-1 |
|---|---|---|---|---|---|---|---|---|---|
| base (all-MiniLM-L6-v2) | Held-out (all) | 622 | 57.9% | 94.5% | 0.757 | 26.1% | 68.0% | 0.032 | 30.3% |
| base (all-MiniLM-L6-v2) | Held-out (original questions only) | 199 | 59.8% | 94.5% | 0.766 | 30.2% | 69.5% | 0.035 | 30.5% |
| base (all-MiniLM-L6-v2) | Training sample (seen) | 622 | 49.8% | 90.0% | 0.697 | 37.2% | 51.2% | 0.006 | 27.5% |
| fine-tuned (sbert-obe-csematch) | Held-out (all) | 622 | 63.2% | 91.2% | 0.781 | 33.1% | 71.9% | 0.062 | 30.3% |
| fine-tuned (sbert-obe-csematch) | Held-out (original questions only) | 199 | 64.8% | 91.5% | 0.791 | 37.6% | 73.2% | 0.064 | 30.5% |
| fine-tuned (sbert-obe-csematch) | Training sample (seen) | 622 | 85.4% | 99.7% | 0.923 | 76.9% | 86.5% | 0.114 | 27.5% |

## 3. Similarity evidence (fine-tuned model, held-out questions)

- Paraphrase pairs (original vs augmented): **0.4043 +/- 0.2720** (n=130)
- Unrelated pairs (different courses): **0.0162 +/- 0.1085** (n=130)

## 4. Bloom classifier

### 4a. Rule engine only -- 2260 real labelled questions
- Coverage (a verb rule fired): **69.5%**
- Accuracy when fired: **55.9%**, Macro-F1 when fired: 41.6%
- Label distribution: {'C1': 38, 'C2': 456, 'C3': 1063, 'C4': 614, 'C5': 49, 'C6': 40}
- Confusion matrix (rows = true C1..C6, cols = predicted):
```
   18    11     1     0     0     0
   46   311    16     4     5     1
   78   145   335    23    29     2
   15   169    53   193    61     2
    0    12     4     1    17     0
    4     4     5     0     2     4
```

### 4b. Full production pipeline (rule + zero-shot) -- n=120 (API errors: 0)
- Accuracy: **40.0%**, Macro-F1: 38.1%  -- per level n: {'C1': 20, 'C2': 20, 'C3': 20, 'C4': 20, 'C5': 20, 'C6': 20}
```
   10     8     0     0     2     0
    3    14     1     0     1     1
    5     5     9     0     1     0
    1     7     1     8     3     0
    2     6     4     3     5     0
    5     3     7     0     3     2
```

## Notes
- Held-out = 10% Course+CO groups excluded from training (seed 42).
- CO metrics: raw cosine ranking, no production keyword boosts.