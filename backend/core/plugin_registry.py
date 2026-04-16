"""Plugin Registry – scans /plugins for plugin.json manifests."""
import json
import os
from dataclasses import dataclass, field
from typing import Any


PLUGINS_DIR = os.getenv("PLUGINS_DIR", "/app/plugins")


@dataclass
class PluginManifest:
    id: str
    name: str
    version: str
    tier: str  # community | pro
    description: str
    plugin_dir: str = ""   # absolute path to the directory containing plugin.json
    nav_item: dict[str, Any] = field(default_factory=dict)
    widgets: list[dict] = field(default_factory=list)        # full widget defs with config schema
    default_dashboard: dict = field(default_factory=dict)    # optional per-plugin default layout
    backend_routes: list[dict] = field(default_factory=list)
    sync_hooks: list[str] = field(default_factory=list)
    sync_module: str = ""
    requires_license: bool = False

    @property
    def bundle_path(self) -> str | None:
        """Absolute path to dist/bundle.js, or None if no bundle exists."""
        if not self.plugin_dir:
            return None
        path = os.path.join(self.plugin_dir, "dist", "bundle.js")
        return path if os.path.isfile(path) else None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "version": self.version,
            "tier": self.tier,
            "description": self.description,
            "hasBundle": self.bundle_path is not None,
            "widgets": self.widgets,
            "defaultDashboard": self.default_dashboard,
            "ui": {
                "navItem": self.nav_item,
            },
            "backend": {
                "routes": self.backend_routes,
                "syncHooks": self.sync_hooks,
            },
            "license": {"required": self.requires_license},
        }


class PluginRegistry:
    def __init__(self) -> None:
        self._plugins: dict[str, PluginManifest] = {}

    def scan(self) -> None:
        """Scan plugin directories and register manifests. Called at startup."""
        self._plugins.clear()
        for directory in (PLUGINS_DIR,):
            if not os.path.isdir(directory):
                continue
            for plugin_dir in os.scandir(directory):
                if not plugin_dir.is_dir():
                    continue
                manifest_path = os.path.join(plugin_dir.path, "plugin.json")
                if not os.path.isfile(manifest_path):
                    continue
                try:
                    self._load_manifest(manifest_path)
                except Exception as exc:
                    print(f"[plugin-registry] Failed to load {manifest_path}: {exc}")

        print(f"[plugin-registry] Registered {len(self._plugins)} plugin(s): "
              f"{', '.join(self._plugins) or 'none'}")

    def _load_manifest(self, path: str) -> None:
        with open(path) as f:
            data: dict = json.load(f)

        ui = data.get("ui", {})
        backend = data.get("backend", {})
        plugin = PluginManifest(
            id=data["id"],
            name=data["name"],
            version=data["version"],
            tier=data.get("tier", "community"),
            description=data.get("description", ""),
            plugin_dir=os.path.dirname(os.path.abspath(path)),
            nav_item=ui.get("navItem", {}),
            widgets=data.get("widgets", []),
            default_dashboard=data.get("defaultDashboard", {}),
            backend_routes=backend.get("routes", []),
            sync_hooks=backend.get("syncHooks", []),
            sync_module=backend.get("syncModule", ""),
            requires_license=data.get("license", {}).get("required", False),
        )
        self._plugins[plugin.id] = plugin

    def all(self) -> list[PluginManifest]:
        return list(self._plugins.values())

    def get(self, plugin_id: str) -> PluginManifest | None:
        return self._plugins.get(plugin_id)

    def plugins_with_hook(self, hook: str) -> list[PluginManifest]:
        return [p for p in self._plugins.values() if hook in p.sync_hooks]
