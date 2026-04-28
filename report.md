# Remote Development Project Report

**Student Name:** Zhan Yibo  
**Student ID:** ZY2557213

---
## 1. System Configuration
| Item | Details |
| :--- | :--- |
| **CPU Model** | AMD Ryzen 7 4800H with Radeon Graphics |
| **Memory Size** | 15Gi |
| **Operating System** | Linux DESKTOP-4GATJ5P 4.4.0-19041-Microsoft #5794-Microsoft Mon Apr 07 17:55:00 PST 2025 x86_64 x86_64 x86_64 GNU/Linux |
| **Compiler Version** | gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0 |
| **Python Version** | Python 3.12.3 |
---
## 2. Objective
1. Familiarize with Unix/Linux command line operations for remote development.  
2. Develop proficiency in Markdown for professional technical documentation.  
3. Implement a matrix multiplication algorithm using an interpreted language (Python).  
4. Validate the correctness of the algorithm through manual verification.
---
## 3. Implementation Details (Python)
### Source Code
The following Python script implements the matrix multiplication algorithm using nested loops.
```python
# matrix.py - A simple script to multiply two matrices

# Define two matrices (A: 2x3, B: 3x2)
matrix_a = [
    [1, 2, 3],
    [4, 5, 6]
]

matrix_b = [
    [7, 8],
    [9, 10],
    [11, 12]
]

# The resulting matrix will be 2x2
result = [[0, 0], [0, 0]]

# Matrix multiplication logic: Row of A * Column of B
for i in range(len(matrix_a)):
    for j in range(len(matrix_b[0])):
        for k in range(len(matrix_b)):
            result[i][j] += matrix_a[i][k] * matrix_b[k][j]

# Output the results
print("Matrix Multiplication Result:")
for row in result:
    print(row)
```
### Execution Command
```bash
python3 matrix.py
```
---
## 4. Algorithm Verification
### Test Case
- Matrix A: 2 × 3  
- Matrix B: 3 × 2
### Manual Calculation
To verify the result, I calculated the first element (Row 1, Column 1) manually:
```
1 × 7 + 2 × 9 + 3 × 11 = 7 + 18 + 33 = 58
```
### Result Comparison
The program outputted:
```
[58, 64]
[139, 154]
```
The program's output matches the manual calculation, confirming the implementation's correctness.
---
---
## 5. Conclusion & Observations
Through this assignment, I successfully set up a Linux development environment using WSL on Windows. I learned how to:
- Navigate between Windows and Linux file systems using the `/mnt/` path.  
- Use basic Unix commands like `ls`, `cd`, `mkdir`, and `python3`.  
- Write and format technical reports using Markdown, which is essential for software documentation.  
- Implement and verify a mathematical algorithm in Python.
---
## 6. References
- Markdown Guide: https://www.markdownguide.org/  
- Python 3 Documentation: https://docs.python.org/3/