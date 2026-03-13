import asyncio
import copy
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class LocalWriteResult:
    inserted_id: Optional[str] = None
    deleted_count: int = 0
    modified_count: int = 0


def _matches(document: Dict[str, Any], filters: Dict[str, Any]) -> bool:
    return all(document.get(key) == value for key, value in filters.items())


def _apply_projection(document: Dict[str, Any], projection: Optional[Dict[str, int]]) -> Dict[str, Any]:
    result = copy.deepcopy(document)
    result.pop("_id", None)

    if not projection:
        return result

    include_fields = {key for key, value in projection.items() if key != "_id" and value}
    exclude_fields = {key for key, value in projection.items() if key != "_id" and not value}

    if include_fields:
        return {key: result[key] for key in include_fields if key in result}

    for key in exclude_fields:
        result.pop(key, None)

    return result


class LocalCursor:
    def __init__(self, database: "LocalJSONDatabase", collection_name: str, filters: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
        self._database = database
        self._collection_name = collection_name
        self._filters = filters
        self._projection = projection
        self._sort_field: Optional[str] = None
        self._sort_direction = 1
        self._limit: Optional[int] = None

    def sort(self, field: str, direction: int):
        self._sort_field = field
        self._sort_direction = direction
        return self

    def limit(self, value: int):
        self._limit = value
        return self

    async def to_list(self, length: Optional[int] = None):
        documents = await self._database.get_collection_snapshot(self._collection_name)
        filtered = [doc for doc in documents if _matches(doc, self._filters)]

        if self._sort_field:
            filtered.sort(
                key=lambda doc: doc.get(self._sort_field) or "",
                reverse=self._sort_direction < 0,
            )

        effective_limit = self._limit if self._limit is not None else length
        if effective_limit is not None:
            filtered = filtered[:effective_limit]

        return [_apply_projection(doc, self._projection) for doc in filtered]


class LocalCollection:
    def __init__(self, database: "LocalJSONDatabase", name: str):
        self._database = database
        self._name = name

    def find(self, filters: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
        return LocalCursor(self._database, self._name, filters, projection)

    async def find_one(self, filters: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
        documents = await self.find(filters, projection).limit(1).to_list(1)
        return documents[0] if documents else None

    async def insert_one(self, document: Dict[str, Any]):
        async with self._database.lock:
            self._database.data.setdefault(self._name, []).append(copy.deepcopy(document))
            self._database.persist()
        return LocalWriteResult(inserted_id=document.get("id") or document.get("user_id") or document.get("project_id"))

    async def update_one(self, filters: Dict[str, Any], update: Dict[str, Any]):
        modified_count = 0
        async with self._database.lock:
            documents = self._database.data.setdefault(self._name, [])
            for document in documents:
                if _matches(document, filters):
                    document.update(copy.deepcopy(update.get("$set", {})))
                    modified_count = 1
                    break
            if modified_count:
                self._database.persist()
        return LocalWriteResult(modified_count=modified_count)

    async def delete_one(self, filters: Dict[str, Any]):
        deleted_count = 0
        async with self._database.lock:
            documents = self._database.data.setdefault(self._name, [])
            remaining = []
            for document in documents:
                if not deleted_count and _matches(document, filters):
                    deleted_count = 1
                    continue
                remaining.append(document)
            if deleted_count:
                self._database.data[self._name] = remaining
                self._database.persist()
        return LocalWriteResult(deleted_count=deleted_count)

    async def delete_many(self, filters: Dict[str, Any]):
        deleted_count = 0
        async with self._database.lock:
            documents = self._database.data.setdefault(self._name, [])
            remaining = []
            for document in documents:
                if _matches(document, filters):
                    deleted_count += 1
                    continue
                remaining.append(document)
            if deleted_count:
                self._database.data[self._name] = remaining
                self._database.persist()
        return LocalWriteResult(deleted_count=deleted_count)


class LocalJSONDatabase:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = asyncio.Lock()
        self.data = self._load()

    def _load(self) -> Dict[str, Any]:
        if not self.path.exists():
            self.path.write_text("{}", encoding="utf-8")
            return {}

        content = self.path.read_text(encoding="utf-8").strip()
        if not content:
            return {}

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {}

    def persist(self):
        self.path.write_text(json.dumps(self.data, indent=2, sort_keys=True), encoding="utf-8")

    async def get_collection_snapshot(self, name: str):
        async with self.lock:
            return copy.deepcopy(self.data.get(name, []))

    def __getattr__(self, item: str):
        if item.startswith("_"):
            raise AttributeError(item)
        return LocalCollection(self, item)
