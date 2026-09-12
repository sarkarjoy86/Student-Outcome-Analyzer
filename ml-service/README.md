# Local NLP Microservice (OBE Question Paper Intelligence)

This is a local Python FastAPI microservice providing Outcome-Based Education (OBE) intelligent NLP features:
1. **Bloom's Taxonomy Classification (C1-C6)** using Hugging Face Zero-Shot Classification (`valhalla/distilbart-mnli-12-3`).
2. **Course Outcome (CO) Mapping** using Sentence-BERT semantic similarity (`all-MiniLM-L6-v2`).
3. **Question Paper Similarity Checker** computing cosine similarity across exam questions to detect overlap against archived papers (drop-in replacement for Gemini API).

---

## Hardware Acceleration (CUDA / GPU)
The microservice automatically checks if CUDA (NVIDIA GPU, such as GeForce RTX series) is available on the machine:
- **CUDA Available**: Automatically maps models and embeddings to the GPU for ultra-fast inference.
- **CPU Fallback**: If CUDA is not detected, it gracefully falls back to CPU execution without breaking.

---

## Setup & Installation

### 1. Create Virtual Environment
```bash
cd ml-service
python -m venv venv
```

### 2. Activate Virtual Environment
- **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt)**:
  ```cmd
  .\venv\Scripts\activate.bat
  ```

### 3. Install PyTorch with CUDA Support (Recommended for RTX GPUs)
For NVIDIA GPUs with CUDA support:
```bash
pip install torch --index-url https://download.pytorch.org/whl/cu124
```
*(Or standard CPU install if GPU is not required: `pip install torch`)*

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## Running the Service

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
or simply:
```bash
python main.py
```

The interactive Swagger UI documentation is available at:
`http://localhost:8000/docs`

---

## API Reference

### 1. Health Check
- **Endpoint**: `GET /health` or `GET /`
- **Response**:
  ```json
  {
    "status": "online",
    "device": "cuda",
    "cuda_available": true,
    "gpu_name": "NVIDIA GeForce RTX 4050 Laptop GPU",
    "models": {
      "sentence_bert": true,
      "zero_shot_classifier": true
    }
  }
  ```

---

### 2. Suggest Bloom & CO Metadata
- **Endpoint**: `POST /suggest-metadata`
- **Request Body**:
  ```json
  {
    "questionText": "Explain the four fundamental principles of Object-Oriented Programming with real-life code examples.",
    "courseOutcomes": [
      { "code": "CO1", "description": "Understand core object-oriented programming concepts, inheritance, and polymorphism." },
      { "code": "CO2", "description": "Implement data structures and dynamic memory management in C++." },
      { "code": "CO3", "description": "Analyze algorithmic complexity and optimize system performance." }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "bloom": {
      "suggested": "C2",
      "confidence": 0.8845,
      "level": "C2",
      "name": "Understand",
      "rankings": [
        { "level": "C2", "name": "Understand", "score": 0.8845 },
        { "level": "C4", "name": "Analyze", "score": 0.0612 },
        { "level": "C1", "name": "Remember", "score": 0.0321 },
        { "level": "C3", "name": "Apply", "score": 0.0150 },
        { "level": "C5", "name": "Evaluate", "score": 0.0051 },
        { "level": "C6", "name": "Create", "score": 0.0021 }
      ]
    },
    "co": {
      "suggested": "CO1",
      "confidence": 0.8234,
      "rankings": [
        { "code": "CO1", "score": 0.8234, "description": "Understand core object-oriented programming concepts, inheritance, and polymorphism." },
        { "code": "CO2", "score": 0.3812, "description": "Implement data structures and dynamic memory management in C++." },
        { "code": "CO3", "score": 0.2415, "description": "Analyze algorithmic complexity and optimize system performance." }
      ]
    }
  }
  ```

---

### 3. Exam Paper Similarity Check
- **Endpoint**: `POST /similarity-check`
- **Request Body** *(Directly matches `server/routes/aiRoutes.js` schema)*:
  ```json
  {
    "currentPaperText": "1. Explain polymorphism in C++ with an example.\n2. Construct an AVL tree from the given sequence.",
    "archivedPapers": [
      {
        "id": "arch-01",
        "assessmentName": "Spring 2024 Midterm",
        "semester": "Spring 2024",
        "section": "A",
        "batch": "58",
        "isCurrentSemester": false,
        "text": "1. What is polymorphism? Illustrate with a C++ code snippet.\n2. Write a program to implement bubble sort."
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "maxSimilarity": 88,
    "totalArchivesCompared": 1,
    "results": [
      {
        "archiveId": "arch-01",
        "assessmentName": "Spring 2024 Midterm",
        "semester": "Spring 2024",
        "section": "A",
        "batch": "58",
        "isCurrentSemester": false,
        "overallSimilarity": 88,
        "verdict": "High Overlap",
        "matchedQuestions": [
          {
            "currentQ": "1. Explain polymorphism in C++ with an example.",
            "archivedQ": "1. What is polymorphism? Illustrate with a C++ code snippet.",
            "similarity": 91,
            "explanation": "High semantic overlap (91%) detected with question #1 of the archived paper."
          }
        ],
        "summary": "Detected 1 matched question topic(s) with 88% overall similarity."
      }
    ]
  }
  ```
