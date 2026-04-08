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
                # Phase 2: call plugin-specific sync logic here
                print(f"[sync-engine] Syncing plugin: {plugin.id}")
            self._last_sync = datetime.now(UTC)
            self._status = "idle"
        except Exception as exc:
            self._status = "error"
            self._error = str(exc)
            print(f"[sync-engine] Sync failed: {exc}")
