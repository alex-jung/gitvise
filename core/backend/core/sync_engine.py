"""Sync Engine – periodically fetches data from GitHub via plugin sync hooks."""
import asyncio
from datetime import datetime, UTC
from core.plugin_registry import PluginRegistry


class SyncEngine:
    def __init__(self, registry: PluginRegistry) -> None:
        self._registry = registry
        self._task: asyncio.Task | None = None
        self._last_sync: datetime | None = None
        self._status: str = "idle"  # idle | syncing | error
        self._error: str | None = None
        self._interval_seconds: int = 300  # default: 5 minutes

    def set_interval(self, seconds: int) -> None:
        self._interval_seconds = max(60, seconds)

    @property
    def status(self) -> dict:
        return {
            "status": self._status,
            "lastSync": self._last_sync.isoformat() if self._last_sync else None,
            "error": self._error,
            "intervalSeconds": self._interval_seconds,
        }

    async def start(self) -> None:
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def trigger(self) -> None:
        """Manually trigger a sync run."""
        await self._run_sync()

    async def _loop(self) -> None:
        while True:
            await asyncio.sleep(self._interval_seconds)
            await self._run_sync()

    async def _run_sync(self) -> None:
        self._status = "syncing"
        self._error = None
        try:
            plugins_with_hook = self._registry.plugins_with_hook("onSchedule")
            for plugin in plugins_with_hook:
                await self._call_plugin_sync(plugin)
            self._last_sync = datetime.now(UTC)
            self._status = "idle"
        except Exception as exc:
            self._status = "error"
            self._error = str(exc)
            print(f"[sync-engine] Sync failed: {exc}")

    async def _call_plugin_sync(self, plugin) -> None:
        import importlib
        # Use syncModule from manifest if present, else derive from id
        sync_module = (
            plugin.sync_module
            if hasattr(plugin, "sync_module") and plugin.sync_module
            else f"plugins.builtin.{plugin.id.replace('-', '_')}.sync"
        )
        print(f"[sync-engine] Syncing plugin: {plugin.id} via {sync_module}")
        try:
            mod = importlib.import_module(sync_module)
            await mod.run()
        except ModuleNotFoundError:
            print(f"[sync-engine] No sync module found for plugin: {plugin.id}")
        except Exception as exc:
            print(f"[sync-engine] Plugin {plugin.id} sync failed: {exc}")
            raise
