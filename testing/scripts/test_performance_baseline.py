from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "performance_baseline.ps1"


def test_performance_baseline_self_test() -> None:
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(SCRIPT),
            "-SelfTest",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )

    assert result.returncode == 0, result.stderr
    assert "SELF_TEST_OK" in result.stdout


def test_performance_baseline_does_not_serialize_sensitive_values() -> None:
    source = SCRIPT.read_text(encoding="utf-8")

    assert "PERF_AUTH_TOKEN" in source
    assert 'AuthenticationHeaderValue("Bearer", $token)' in source
    assert "response_body" not in source.lower()
    assert "authorization_header" not in source.lower()
    assert "ConvertTo-SecureString" not in source
    assert "$env:COMPUTERNAME" not in source
    assert "SetEnvironmentVariable('PERF_AUTH_TOKEN', $null, 'Process')" in source
    assert "Assert-SafeBaseUrl" in source
    assert "AllowAutoRedirect = $false" in source
