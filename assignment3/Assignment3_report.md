# Assignment 3: Deployment and Integration of AI Agents

**Student Name:** Zhan Yibo  
**Student ID:** ZY2557213  
**Date:** May 29, 2026

---

## 1. Online Agent - File Analysis & General Q&A (5 pts)

### 1.1 API Configuration

I obtained an API key for **DeepSeek** (deepseek-chat model), an OpenAI-compatible online LLM service. The API endpoint follows the standard `/v1/chat/completions` format, making it compatible with any OpenAI-style client.

### 1.2 Agent Implementation

I created a Python script ([`online_agent.py`](online_agent.py)) that supports two modes:

**File Analysis Mode:** Reads a local text-based file (Markdown, code, `.txt`, etc.) and sends its content to the LLM with a user-specified question. This is the main completed requirement for the online agent.

**General Question Answering Mode:** Sends a question directly to the online LLM, which answers using its general knowledge. This is an auxiliary function, not a real live web search engine.

### 1.3 Example Usage

```bash
# Analyze a file
python online_agent.py --file report.md --question "What is this report about?"

# General knowledge question
python online_agent.py --question "Explain the difference between Git merge and rebase"
```

### 1.4 Key Design Decisions

- Used Python's built-in `urllib` to avoid external dependencies - the script runs on any Python 3 installation
- API key stored in environment variables (`LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL`) for security and flexibility
- Supports any OpenAI-compatible API (DeepSeek, Qwen, OpenAI) by changing environment variables

---

## 2. Local Model Deployment - Ollama (4 pts)

### 2.1 Installation

I installed **Ollama** (version 0.24.0) on Windows 11 via the `winget` package manager:

```bash
winget install Ollama.Ollama
```

After installation, the Ollama service starts automatically in the background and can be accessed via CLI at `ollama` command.

### 2.2 Model Deployment

I successfully pulled **Qwen2:1.5B**, a lightweight open-source model suitable for local experimentation:

```bash
ollama pull qwen2:1.5b
```

After the model was downloaded, I ran it in the terminal:

```bash
ollama run qwen2:1.5b
```

### 2.3 Network Challenge

The model download from `registry.ollama.ai` initially timed out due to network restrictions in China. The registry domain resolved to an IPv6 address that was unreachable from the local network environment.

**Solution:** I enabled VPN TUN mode so that command-line traffic from Ollama was routed through the proxy. After this change, `ollama pull qwen2:1.5b` completed successfully, and I could interact with the model using `ollama run qwen2:1.5b`.

The screenshots in the HTML report demonstrate the successful model download and terminal interaction. I documented this as a real-world challenge in deploying AI infrastructure - network accessibility is a practical concern that affects toolchain setup.

---

## 3. IDE Integration - VSCode + Claude Code (3 pts)

### 3.1 Setup

I integrated **Claude Code** (Anthropic's AI coding assistant) into **Visual Studio Code** via the official extension (`anthropic.claude-code`). This provides:

- Inline code explanations and refactoring suggestions
- Natural language to code generation
- Real-time debugging assistance
- Multi-file editing capabilities

### 3.2 Demonstration: Code Explanation

I used Claude Code to explain the `call_llm` function in my online agent script. The AI provided a line-by-line breakdown:
- HTTP request construction with `urllib.request.Request`
- Authorization header format for Bearer token authentication
- JSON payload structure for the chat completions API
- Error handling for HTTP errors vs. general exceptions

### 3.3 Demonstration: Code Refactoring

I asked Claude Code to help refactor my website from basic HTML to a more polished design. The assistant:
- Restructured the CSS with CSS custom properties (variables) for maintainable theming
- Added responsive design with CSS Grid and media queries
- Improved typography with a serif/sans-serif pairing
- Added subtle visual effects (grain texture overlay, hover transitions)

This demonstrated how IDE-integrated AI can assist with both backend (Python) and frontend (HTML/CSS) development tasks.

### 3.4 Development Workflow

Throughout this assignment, Claude Code acted as:
- **Code explainer** - breaking down unfamiliar API patterns
- **Design assistant** - producing polished UI from natural language descriptions
- **Documentation helper** - formatting reports and suggesting structural improvements
- **Deployment assistant** - managing git commits and pushing to GitHub Pages

---

## 4. Documentation & Reflection (3 pts)

### 4.1 Online vs Local Models - Comparison

| Aspect | Online Model (DeepSeek) | Local Model (Ollama) |
|--------|------------------------|----------------------|
| **Response Speed** | Fast (~2-3s) | Slower (hardware-dependent) |
| **Accuracy** | High (large models) | Moderate (smaller models) |
| **Setup Difficulty** | Easy (API key only) | Medium (install + network issues) |
| **Internet Required** | Yes | Only for initial download |
| **Cost** | Pay-per-token | Free |
| **Privacy** | Data sent to cloud | Fully local |
| **Network Dependency** | Must access API endpoint | Must access model registry |

### 4.2 Challenges & Solutions

**Challenge 1 - API Key Security:** Initially hardcoded the API key in the script.
**Solution:** Refactored to use environment variables for secure credential management.

**Challenge 2 - Ollama Model Download:** The official Ollama model registry initially timed out due to network restrictions in China.
**Solution:** Enabled VPN TUN mode so the Ollama CLI traffic could reach the model registry. After that, Qwen2:1.5B downloaded and ran successfully.

**Challenge 3 - IDE Setup:** Learning the capabilities and boundaries of AI-assisted coding tools.
**Solution:** Started with simple tasks (code explanation) before moving to complex ones (multi-file refactoring).

### 4.3 Reflection

This assignment gave me practical experience with three tiers of AI agent deployment:

1. **Online Agents (DeepSeek API):** Most convenient for quick tasks. The API abstracts away model hosting complexity. Best for: complex reasoning, rapid prototyping.

2. **Local Models (Ollama):** Full control and privacy. The setup process teaches infrastructure fundamentals. Best for: sensitive data, offline work, learning how LLMs work under the hood.

3. **IDE Integration (Claude Code):** The most impactful for daily development. Having AI directly in the editor changes how I approach coding - from "write first, debug later" to "design with AI, then implement."

The key takeaway is that these three tiers are complementary, not competitive. A well-rounded developer should know when to use each one based on the task requirements, privacy constraints, and available infrastructure.
