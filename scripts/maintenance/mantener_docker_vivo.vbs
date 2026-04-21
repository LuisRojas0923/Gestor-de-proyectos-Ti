Set objShell = CreateObject("WScript.Shell")
objShell.Run "wsl.exe -d Ubuntu -e bash -c ""sudo docker compose -f /mnt/c/GestorTI/docker-compose.prod.yml up -d && sleep infinity""", 0, False
