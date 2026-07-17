import os
import json
import urllib.request
import sys

def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY no está configurado. Fallo obligatorio.")
        sys.exit(1)

    prompt_file = os.environ.get("SYSTEM_PROMPT_FILE")
    diff_file = os.environ.get("DIFF_FILE")
    agent_name = os.environ.get("AGENT_NAME")

    with open(prompt_file, "r", encoding="utf-8") as f:
        system_prompt = f.read()

    with open(diff_file, "r", encoding="utf-8") as f:
        diff_content = f.read()

    if not diff_content.strip():
        print("No hay diferencias en el PR.")
        sys.exit(0)

    system_prompt += (
        "\n\n====================\n"
        "INSTRUCCIÓN PARA GITHUB ACTIONS:\n"
        "Estás operando en modo automatizado dentro de un Pull Request de GitHub.\n"
        "1. Ignora las reglas que te impiden usar bash, no puedes usar comandos aquí.\n"
        "2. Evalúa EXCLUSIVAMENTE el siguiente 'git diff' asumiendo tu rol y reglas.\n"
        "3. Emite tu respuesta en formato Markdown para que sea un comentario legible en GitHub.\n"
    )

    data = {
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Aquí está el diff del Pull Request:\n\n```diff\n{diff_content}\n```"}
        ],
        "temperature": 0.2
    }

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            review = result["choices"][0]["message"]["content"]

            header = f"### 🤖 Revisión Automática: `{agent_name}`\n\n"

            with open("review_output.md", "w", encoding="utf-8") as f:
                f.write(header + review)

            print("Revisión completada exitosamente.")
    except Exception as e:
        print(f"Error llamando a la API: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
