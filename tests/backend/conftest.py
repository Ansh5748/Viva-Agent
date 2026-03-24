import pytest
import asyncio
from httpx import AsyncClient
import sys
import os

# Add backend to path so we can import server
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))

from server import app

@pytest.fixture(scope="session")
def event_loop():
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
