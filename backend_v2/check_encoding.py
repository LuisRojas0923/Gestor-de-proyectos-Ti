
import os

def check_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                try:
                    with open(path, "rb") as f:
                        content = f.read()
                    content.decode("utf-8")
                except UnicodeDecodeError as e:
                    print(f"Error in {path}: {e}")

check_files("app")
