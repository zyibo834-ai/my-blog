"""
Assignment 3 — Online Agent: File Analysis & Web Search
Uses an OpenAI-compatible API (DeepSeek / Qwen / OpenAI) to:
  1. Analyze a local file (Markdown, PDF, code, etc.)
  2. Answer questions about its contents

Usage:
  python online_agent.py --file report.md
  python online_agent.py --file report.md --question "Summarize the key findings"
  python online_agent.py --question "What is Python?"  (web-search mode without file)
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error


# ── Configuration ──────────────────────────────────────────────
# Set your API key via environment variable, or replace the placeholder below.
API_KEY = os.environ.get("LLM_API_KEY", "your-api-key-here")
API_URL = os.environ.get("LLM_API_URL", "https://api.deepseek.com/v1/chat/completions")
MODEL   = os.environ.get("LLM_MODEL",   "deepseek-chat")


def call_llm(messages: list, temperature: float = 0.3) -> str:
    """Send a chat completion request to the LLM API."""
    payload = json.dumps({
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 2048,
    }).encode("utf-8")

    req = urllib.request.Request(API_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {API_KEY}")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode())
            return body["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        return f"[API Error {e.code}] {e.read().decode()}"
    except Exception as e:
        return f"[Error] {str(e)}"


def read_file(path: str, max_chars: int = 8000) -> str:
    """Read a text file, truncating if too long."""
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        if len(content) > max_chars:
            content = content[:max_chars] + "\n\n[... truncated due to length ...]"
        return content
    except Exception as e:
        return f"[Cannot read file] {e}"


def analyze_file(file_path: str, user_question: str | None) -> str:
    """Read a file and ask the LLM to analyze it."""
    content = read_file(file_path)
    question = user_question or "Please summarize this file and highlight the key points."

    messages = [
        {"role": "system", "content": "You are a helpful assistant. Analyze the provided document and answer the user's question accurately and concisely."},
        {"role": "user", "content": f"Document content:\n\n{content}\n\n---\n\nQuestion: {question}"},
    ]
    return call_llm(messages)


def web_search_agent(question: str) -> str:
    """Ask the LLM a question that may require general knowledge (simulates web search via LLM)."""
    messages = [
        {"role": "system", "content": (
            "You are a helpful research assistant with access to general knowledge up to 2024. "
            "Answer the user's question thoroughly. If you are unsure about specific details, "
            "state your level of confidence clearly. Structure your answer with bullet points "
            "when listing multiple items."
        )},
        {"role": "user", "content": question},
    ]
    return call_llm(messages)


def main():
    parser = argparse.ArgumentParser(description="Online LLM Agent — File Analysis & Web Search")
    parser.add_argument("--file", "-f", help="Path to a file to analyze")
    parser.add_argument("--question", "-q", help="Question to ask about the file or general knowledge")
    args = parser.parse_args()

    if not args.file and not args.question:
        parser.print_help()
        print("\nExample: python online_agent.py --file report.md --question \"Summarize this\"")
        sys.exit(1)

    print(f"Model: {MODEL}")
    print(f"API:   {API_URL}")
    print("-" * 50)

    if args.file:
        print(f"Analyzing file: {args.file}")
        result = analyze_file(args.file, args.question)
    else:
        print(f"Question: {args.question}")
        result = web_search_agent(args.question)

    print("-" * 50)
    print(result)


if __name__ == "__main__":
    main()
