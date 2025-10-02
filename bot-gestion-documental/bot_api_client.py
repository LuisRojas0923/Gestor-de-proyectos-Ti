from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import requests


@dataclass
class APIClientConfig:
    base_url: str
    timeout_seconds: int = 15


class APIClient:
    def __init__(self, config: APIClientConfig) -> None:
        self.config = config
        self._session = requests.Session()
        self._resolved_prefix: Optional[str] = None

    @staticmethod
    def from_env_or_file() -> "APIClient":
        base_url = os.environ.get("BOT_API_BASE_URL")
        if not base_url:
            config_path = os.path.join(os.getcwd(), "config.json")
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    base_url = cfg.get("api_base_url")
        if not base_url:
            base_url = "http://localhost:8000"  # valor por defecto
        return APIClient(APIClientConfig(base_url=base_url))

    def _resolve_prefix(self) -> str:
        if self._resolved_prefix is not None:
            return self._resolved_prefix
        # Intentar en orden: /api/v2, /api/v1, ""
        for prefix in ("/api/v2", "/api/v1", ""):
            try:
                url = f"{self.config.base_url.rstrip('/')}{prefix}/developments"
                resp = self._session.get(url, timeout=self.config.timeout_seconds)
                if resp.status_code in (200, 204):
                    self._resolved_prefix = prefix
                    return prefix
            except requests.RequestException:
                continue
        # Si nada responde exitosamente, usar /api/v2 por convención
        self._resolved_prefix = "/api/v2"
        return self._resolved_prefix

    def _build_url(self, path: str) -> str:
        prefix = self._resolve_prefix()
        return f"{self.config.base_url.rstrip('/')}{prefix}{path}"

    # ============ Developments ============
    def list_developments(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        phase_id: Optional[int] = None,
        stage_id: Optional[int] = None,
        provider: Optional[str] = None,
        module: Optional[str] = None,
        type: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        params: Dict[str, Any] = {"skip": skip, "limit": limit}
        if phase_id is not None:
            params["phase_id"] = phase_id
        if stage_id is not None:
            params["stage_id"] = stage_id
        if provider:
            params["provider"] = provider
        if module:
            params["module"] = module
        if type:
            params["type"] = type

        url = self._build_url("/developments")
        try:
            resp = self._session.get(url, params=params, timeout=self.config.timeout_seconds)
            resp.raise_for_status()
            return resp.json(), None
        except requests.HTTPError as e:
            return [], f"HTTP {resp.status_code}: {e}"
        except requests.RequestException as e:
            return [], f"Error de red: {e}"

    def get_development(self, development_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        url = self._build_url(f"/developments/{development_id}")
        try:
            resp = self._session.get(url, timeout=self.config.timeout_seconds)
            if resp.status_code == 404:
                return None, "No encontrado"
            resp.raise_for_status()
            return resp.json(), None
        except requests.HTTPError as e:
            return None, f"HTTP {resp.status_code}: {e}"
        except requests.RequestException as e:
            return None, f"Error de red: {e}"

    def change_stage(
        self,
        development_id: str,
        new_stage_id: int,
        progress_percentage: Optional[float] = None,
        notes: Optional[str] = None,
        changed_by: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        # v2 usa PUT /{id}/stage con schema DevelopmentStageUpdate(new_stage_id)
        # v1 usa PATCH /{id}/stage con stage_id
        prefix = self._resolve_prefix()
        if prefix.endswith("/v2"):
            path = f"/developments/{development_id}/stage"
            payload = {
                "new_stage_id": new_stage_id,
                "progress_percentage": progress_percentage,
                "notes": notes,
                "changed_by": changed_by or "Bot",
            }
            method = "put"
        else:
            path = f"/developments/{development_id}/stage"
            payload = {
                "stage_id": new_stage_id,
                "progress_percentage": progress_percentage,
                "notes": notes,
                "changed_by": changed_by or "Bot",
            }
            method = "patch"

        url = self._build_url(path)
        try:
            if method == "put":
                resp = self._session.put(url, json=payload, timeout=self.config.timeout_seconds)
            else:
                resp = self._session.patch(url, json=payload, timeout=self.config.timeout_seconds)
            resp.raise_for_status()
            return True, None
        except requests.HTTPError as e:
            return False, f"HTTP {resp.status_code}: {e}"
        except requests.RequestException as e:
            return False, f"Error de red: {e}"

    def list_observations(
        self, development_id: str, *, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        url = self._build_url(f"/developments/{development_id}/observations")
        try:
            resp = self._session.get(url, params={"skip": skip, "limit": limit}, timeout=self.config.timeout_seconds)
            resp.raise_for_status()
            return resp.json(), None
        except requests.HTTPError as e:
            return [], f"HTTP {resp.status_code}: {e}"
        except requests.RequestException as e:
            return [], f"Error de red: {e}"


