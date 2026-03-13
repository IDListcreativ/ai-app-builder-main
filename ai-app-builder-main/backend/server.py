from fastapi import FastAPI, APIRouter, HTTPException, Header, Cookie, Response, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import requests
from openai import AsyncOpenAI
import json
import asyncio
from github import Github, GithubException
import base64
import secrets
import string
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from local_store import LocalJSONDatabase

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME", "test_database")
client = None


def initialize_database():
    global client

    if mongo_url:
        try:
            probe_client = MongoClient(
                mongo_url,
                serverSelectionTimeoutMS=1500,
                connectTimeoutMS=1500,
            )
            probe_client.admin.command("ping")
            probe_client.close()
            client = AsyncIOMotorClient(mongo_url)
            logger.info("Using MongoDB backend for %s", db_name)
            return client[db_name]
        except PyMongoError as exc:
            logger.warning("MongoDB is unavailable, using local JSON storage instead: %s", exc)

    local_db_path = ROOT_DIR / "data" / f"{db_name}.json"
    logger.info("Using local JSON backend at %s", local_db_path)
    return LocalJSONDatabase(local_db_path)


db = initialize_database()

app = FastAPI()
api_router = APIRouter(prefix="/api")

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_MODEL_DEFAULT = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')
PROJECT_URL = os.environ.get('PROJECT_URL', 'https://github.com/IDListcreativ/ai-app-builder')


def resolve_openai_model(project: Dict[str, Any]) -> str:
    model = project.get("llm_model") or OPENAI_MODEL_DEFAULT
    provider = (project.get("llm_provider") or "openai").lower()

    if provider != "openai":
        return OPENAI_MODEL_DEFAULT

    lowered = model.lower()
    if "claude" in lowered or "gemini" in lowered:
        return OPENAI_MODEL_DEFAULT

    return model

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class EmailAuthRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class EmailAuthLogin(BaseModel):
    email: EmailStr
    password: str

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    llm_provider: str = "openai"
    llm_model: str = "gpt-5.2"
    created_at: datetime
    updated_at: datetime

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    llm_provider: str = "openai"
    llm_model: str = "gpt-5.2"

class ProjectMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str
    project_id: str
    role: str
    content: str
    timestamp: datetime

class ProjectFile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    file_id: str
    project_id: str
    path: str
    content: str
    language: Optional[str] = None

class Template(BaseModel):
    model_config = ConfigDict(extra="ignore")
    template_id: str
    name: str
    description: str
    preview_image: Optional[str] = None
    initial_prompt: str
    tags: List[str] = []

class GenerateRequest(BaseModel):
    project_id: str
    prompt: str


def is_secure_request(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto")
    scheme = forwarded_proto.split(",")[0].strip() if forwarded_proto else request.url.scheme
    return scheme == "https"


def set_session_cookie(response: Response, request: Request, session_token: str):
    secure = is_secure_request(request)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        path="/",
        max_age=7 * 24 * 60 * 60
    )


def clear_session_cookie(response: Response, request: Request):
    secure = is_secure_request(request)
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=secure,
        samesite="none" if secure else "lax",
    )

async def get_current_user(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)) -> User:
    token = None
    if session_token:
        token = session_token
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

@api_router.post("/auth/session")
async def handle_oauth_session(x_session_id: Optional[str] = Header(None)):
    raise HTTPException(
        status_code=410,
        detail="OAuth session exchange is disabled in self-hosted mode. Use email login instead.",
    )
@api_router.post("/auth/register")
async def register_email(data: EmailAuthRegister, request: Request, response: Response):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt())
    
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hashed_password.decode('utf-8'),
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    session_token = f"jwt_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)

    set_session_cookie(response, request, session_token)
    
    return {"session_token": session_token, "user": {"user_id": user_id, "email": data.email, "name": data.name}}

@api_router.post("/auth/login")
async def login_email(data: EmailAuthLogin, request: Request, response: Response):
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc or "password_hash" not in user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(data.password.encode('utf-8'), user_doc["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    session_token = f"jwt_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)

    set_session_cookie(response, request, session_token)
    
    return {"session_token": session_token, "user": {"user_id": user_doc["user_id"], "email": user_doc["email"], "name": user_doc["name"]}}

@api_router.get("/auth/me")
async def get_me(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    token = session_token or (authorization.replace("Bearer ", "") if authorization else None)
    if token:
        await db.user_sessions.delete_many({"session_token": token})

    clear_session_cookie(response, request)
    return {"message": "Logged out"}

@api_router.get("/projects", response_model=List[Project])
async def get_projects(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    projects = await db.projects.find({"user_id": user.user_id}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    
    for proj in projects:
        if isinstance(proj['created_at'], str):
            proj['created_at'] = datetime.fromisoformat(proj['created_at'])
        if isinstance(proj['updated_at'], str):
            proj['updated_at'] = datetime.fromisoformat(proj['updated_at'])
    
    return projects

@api_router.post("/projects", response_model=Project)
async def create_project(data: ProjectCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    
    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    project_doc = {
        "project_id": project_id,
        "user_id": user.user_id,
        "name": data.name,
        "description": data.description,
        "llm_provider": data.llm_provider,
        "llm_model": data.llm_model,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    await db.projects.insert_one(project_doc)
    
    project_doc['created_at'] = now
    project_doc['updated_at'] = now
    return Project(**project_doc)

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    project_doc = await db.projects.find_one({"project_id": project_id, "user_id": user.user_id}, {"_id": 0})
    
    if not project_doc:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if isinstance(project_doc['created_at'], str):
        project_doc['created_at'] = datetime.fromisoformat(project_doc['created_at'])
    if isinstance(project_doc['updated_at'], str):
        project_doc['updated_at'] = datetime.fromisoformat(project_doc['updated_at'])
    
    return Project(**project_doc)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    result = await db.projects.delete_one({"project_id": project_id, "user_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.project_messages.delete_many({"project_id": project_id})
    await db.project_files.delete_many({"project_id": project_id})
    
    return {"message": "Project deleted"}

@api_router.get("/projects/{project_id}/messages", response_model=List[ProjectMessage])
async def get_messages(project_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    project = await db.projects.find_one({"project_id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    messages = await db.project_messages.find({"project_id": project_id}, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    
    for msg in messages:
        if isinstance(msg['timestamp'], str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    
    return messages

@api_router.get("/projects/{project_id}/files", response_model=List[ProjectFile])
async def get_files(project_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    project = await db.projects.find_one({"project_id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    files = await db.project_files.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    return files

@api_router.post("/generate")
async def generate_code(data: GenerateRequest, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    project = await db.projects.find_one({"project_id": data.project_id, "user_id": user.user_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    user_message_doc = {
        "message_id": message_id,
        "project_id": data.project_id,
        "role": "user",
        "content": data.prompt,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.project_messages.insert_one(user_message_doc)
    
    existing_files = await db.project_files.find({"project_id": data.project_id}, {"_id": 0}).to_list(1000)
    
    current_code_context = ""
    if existing_files:
        current_code_context = "\n\nCurrent project files:\n"
        for f in existing_files[:20]:
            current_code_context += f"\n--- {f['path']} ---\n{f['content'][:500]}...\n"
    
    system_prompt = f"""You are an expert full-stack developer building production-ready React applications. You generate clean, modern, production-ready code.

CRITICAL: Always respond with valid JSON in this EXACT format (no markdown, no code blocks):
{{
  "files": [
    {{"path": "src/App.jsx", "content": "complete file content", "language": "javascript"}},
    {{"path": "src/components/Feature.jsx", "content": "complete file content", "language": "javascript"}}
  ],
  "explanation": "Clear explanation of what you built/changed (2-3 sentences)",
  "changes_summary": "List of specific changes: Created X.jsx, Updated Y.jsx, Added Z feature"
}}

GUIDELINES:
1. Code Quality:
   - Use .jsx extension (not .tsx)
   - Include ALL necessary imports (React, hooks, components)
   - Use Tailwind CSS + shadcn/ui components for styling
   - Make UI responsive (mobile-first) and accessible
   - Add proper error handling and loading states

2. For NEW apps: Generate complete structure (App.jsx + any components)
3. For ITERATIONS: Review existing code, make targeted changes, include ALL files
4. Style: Modern, clean UI with good spacing, rounded corners, shadows
5. Functionality: Working code with proper state management, no placeholders

CURRENT PROJECT CODE:
{current_code_context}

Generate complete, working code. Be comprehensive but concise."""
    
    messages_history = await db.project_messages.find(
        {"project_id": data.project_id}, 
        {"_id": 0}
    ).sort("timestamp", 1).to_list(50)
    
    conversation_context = ""
    for msg in messages_history[-10:]:
        conversation_context += f"\n{msg['role'].upper()}: {msg['content'][:300]}"
    
    full_prompt = f"{conversation_context}\n\nUSER: {data.prompt}\n\nRemember to respond with valid JSON containing the 'files' array."
    
    try:
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

        model = resolve_openai_model(project)
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        completion = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt},
            ],
        )

        response = completion.choices[0].message.content or ""
        if isinstance(response, list):
            response = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in response
            )
        response = response.strip()
        if not response:
            raise HTTPException(status_code=502, detail="OpenAI returned an empty response")

        assistant_message_id = f"msg_{uuid.uuid4().hex[:12]}"
        assistant_message_doc = {
            "message_id": assistant_message_id,
            "project_id": data.project_id,
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.project_messages.insert_one(assistant_message_doc)
        
        explanation = ""
        changes_summary = ""
        files_updated = []
        
        try:
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
            
            parsed_response = json.loads(cleaned_response)
            
            explanation = parsed_response.get("explanation", "Code generated successfully")
            changes_summary = parsed_response.get("changes_summary", "Files updated")
            
            if "files" in parsed_response and isinstance(parsed_response["files"], list):
                old_files = {f["path"]: f for f in existing_files}
                
                for file_data in parsed_response["files"]:
                    file_path = file_data["path"]
                    file_content = file_data["content"]
                    
                    existing_file = await db.project_files.find_one(
                        {"project_id": data.project_id, "path": file_path},
                        {"_id": 0}
                    )
                    
                    if existing_file:
                        old_content = existing_file.get("content", "")
                        if old_content != file_content:
                            await db.project_files.update_one(
                                {"project_id": data.project_id, "path": file_path},
                                {"$set": {
                                    "content": file_content,
                                    "language": file_data.get("language", "javascript"),
                                    "previous_content": old_content
                                }}
                            )
                            files_updated.append({"path": file_path, "type": "modified"})
                    else:
                        file_id = f"file_{uuid.uuid4().hex[:12]}"
                        file_doc = {
                            "file_id": file_id,
                            "project_id": data.project_id,
                            "path": file_path,
                            "content": file_content,
                            "language": file_data.get("language", "javascript"),
                            "previous_content": None
                        }
                        await db.project_files.insert_one(file_doc)
                        files_updated.append({"path": file_path, "type": "created"})
                        
        except json.JSONDecodeError as e:
            logging.error(f"JSON parse error: {str(e)}, Response: {response[:500]}")
            explanation = "Generated code (parsing issue - check manually)"
            changes_summary = "Files may need review"
        
        await db.projects.update_one(
            {"project_id": data.project_id},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "success": True,
            "explanation": explanation,
            "changes_summary": changes_summary,
            "files_updated": files_updated,
            "total_files": len(files_updated)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"LLM generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@api_router.get("/templates", response_model=List[Template])
async def get_templates():
    templates = [
        {
            "template_id": "tmpl_001",
            "name": "Todo App",
            "description": "A simple task management app with CRUD operations",
            "preview_image": None,
            "initial_prompt": "Build a todo app with React and TypeScript. Include add, edit, delete, and mark as complete functionality. Use Tailwind CSS for styling.",
            "tags": ["productivity", "basic"]
        },
        {
            "template_id": "tmpl_002",
            "name": "SaaS Dashboard",
            "description": "Modern dashboard with charts, tables, and user management",
            "preview_image": None,
            "initial_prompt": "Create a SaaS dashboard with user authentication, data visualization charts, user management table, and settings page. Use React, TypeScript, and Tailwind CSS.",
            "tags": ["saas", "business"]
        },
        {
            "template_id": "tmpl_003",
            "name": "AI Chatbot",
            "description": "Conversational AI interface with message history",
            "preview_image": None,
            "initial_prompt": "Build an AI chatbot interface with message history, streaming responses, and a clean chat UI. Include user authentication and conversation persistence.",
            "tags": ["ai", "chat"]
        },
        {
            "template_id": "tmpl_004",
            "name": "E-commerce Store",
            "description": "Product catalog with cart and checkout",
            "preview_image": None,
            "initial_prompt": "Create an e-commerce store with product listing, shopping cart, checkout flow, and order history. Include product search and filtering.",
            "tags": ["ecommerce", "shopping"]
        }
    ]
    return templates

def generate_share_slug():
    chars = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))

class ShareProjectRequest(BaseModel):
    project_id: str

@api_router.post("/projects/{project_id}/share")
async def share_project(
    project_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(authorization, session_token)
    
    project = await db.projects.find_one({"project_id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("shareable"):
        share_slug = project.get("share_slug")
    else:
        share_slug = generate_share_slug()
        
        existing = await db.projects.find_one({"share_slug": share_slug}, {"_id": 0})
        while existing:
            share_slug = generate_share_slug()
            existing = await db.projects.find_one({"share_slug": share_slug}, {"_id": 0})
        
        await db.projects.update_one(
            {"project_id": project_id},
            {"$set": {
                "shareable": True,
                "share_slug": share_slug,
                "shared_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {
        "message": "Project shared successfully",
        "share_url": f"/share/{share_slug}",
        "share_slug": share_slug
    }

@api_router.post("/projects/{project_id}/unshare")
async def unshare_project(
    project_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(authorization, session_token)
    
    project = await db.projects.find_one({"project_id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {
            "shareable": False
        }}
    )
    
    return {"message": "Project unshared successfully"}

@api_router.get("/share/{share_slug}")
async def get_shared_project(share_slug: str):
    project = await db.projects.find_one({"share_slug": share_slug, "shareable": True}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Shared project not found")
    
    files = await db.project_files.find({"project_id": project["project_id"]}, {"_id": 0, "file_id": 0, "previous_content": 0}).to_list(1000)
    
    messages = await db.project_messages.find(
        {"project_id": project["project_id"], "role": "user"}, 
        {"_id": 0, "message_id": 0}
    ).sort("timestamp", 1).limit(10).to_list(10)
    
    user_doc = await db.users.find_one({"user_id": project["user_id"]}, {"_id": 0, "name": 1})
    
    return {
        "project_id": project["project_id"],
        "name": project["name"],
        "description": project.get("description"),
        "llm_provider": project.get("llm_provider"),
        "deployment_url": project.get("deployment_url"),
        "deployment_platform": project.get("deployment_platform"),
        "created_at": project.get("created_at"),
        "updated_at": project.get("updated_at"),
        "creator_name": user_doc.get("name") if user_doc else "Anonymous",
        "files": files,
        "prompts": [msg["content"] for msg in messages]
    }

class GitHubExportRequest(BaseModel):
    project_id: str
    repo_name: str
    is_private: bool = True
    existing_repo: Optional[str] = None

@api_router.get("/github/auth-url")
async def get_github_auth_url():
    client_id = os.environ.get('GITHUB_CLIENT_ID', 'placeholder_client_id')
    if client_id == 'placeholder_client_id':
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured. Please set GITHUB_CLIENT_ID in backend .env")
    
    redirect_uri = os.environ.get('GITHUB_REDIRECT_URI', 'http://127.0.0.1:3000/github/callback')
    scope = "repo"
    
    auth_url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}"
    return {"auth_url": auth_url}

@api_router.post("/github/callback")
async def github_callback(code: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    
    client_id = os.environ.get('GITHUB_CLIENT_ID')
    client_secret = os.environ.get('GITHUB_CLIENT_SECRET')
    
    if not client_id or not client_secret or client_id == 'placeholder_client_id':
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    token_response = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code
        }
    )
    
    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")
    
    token_data = token_response.json()
    if "access_token" not in token_data:
        raise HTTPException(status_code=400, detail=token_data.get("error_description", "Failed to get access token"))
    
    access_token = token_data["access_token"]
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"github_token": access_token}}
    )
    
    return {"message": "GitHub connected successfully"}

@api_router.get("/github/status")
async def github_status(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "github_token": 1})
    
    has_token = bool(user_doc and user_doc.get("github_token"))
    
    if has_token:
        try:
            g = Github(user_doc["github_token"])
            gh_user = g.get_user()
            return {
                "connected": True,
                "username": gh_user.login,
                "avatar_url": gh_user.avatar_url
            }
        except:
            return {"connected": False}
    
    return {"connected": False}

@api_router.post("/github/export")
async def export_to_github(
    data: GitHubExportRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(authorization, session_token)
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "github_token": 1})
    if not user_doc or not user_doc.get("github_token"):
        raise HTTPException(status_code=401, detail="GitHub not connected")
    
    project = await db.projects.find_one({"project_id": data.project_id, "user_id": user.user_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    files = await db.project_files.find({"project_id": data.project_id}, {"_id": 0}).to_list(1000)
    if not files:
        raise HTTPException(status_code=400, detail="No files to export")
    
    try:
        g = Github(user_doc["github_token"])
        gh_user = g.get_user()
        
        if data.existing_repo:
            try:
                repo = gh_user.get_repo(data.existing_repo)
            except GithubException:
                raise HTTPException(status_code=404, detail="Repository not found")
        else:
            repo = gh_user.create_repo(
                name=data.repo_name,
                description=project.get("description", f"Built with MetaBuilder - {project['name']}"),
                private=data.is_private,
                auto_init=True
            )
        
        readme_content = f"""# {project['name']}

{project.get('description', 'Built with MetaBuilder')}

## About

This project was generated using MetaBuilder - an AI-powered app builder.

## Setup

```bash
npm install
npm start
```

## Files Generated

This project contains {len(files)} files:
{chr(10).join([f"- {f['path']}" for f in files[:20]])}

---

**Built with ❤️ using [MetaBuilder]({PROJECT_URL})**
"""
        
        try:
            readme = repo.get_contents("README.md")
            repo.update_file(
                "README.md",
                f"Update README for {project['name']}",
                readme_content,
                readme.sha
            )
        except:
            repo.create_file(
                "README.md",
                f"Add README for {project['name']}",
                readme_content
            )
        
        files_created = 0
        files_updated = 0
        
        for file_data in files:
            file_path = file_data["path"]
            file_content = file_data["content"]
            
            try:
                try:
                    existing_file = repo.get_contents(file_path)
                    repo.update_file(
                        file_path,
                        f"Update {file_path}",
                        file_content,
                        existing_file.sha
                    )
                    files_updated += 1
                except GithubException as e:
                    if e.status == 404:
                        repo.create_file(
                            file_path,
                            f"Add {file_path}",
                            file_content
                        )
                        files_created += 1
                    else:
                        raise
            except Exception as e:
                logging.error(f"Failed to create/update {file_path}: {str(e)}")
                continue
        
        return {
            "message": "Exported to GitHub successfully",
            "repo_url": repo.html_url,
            "files_created": files_created,
            "files_updated": files_updated
        }
        
    except GithubException as e:
        logging.error(f"GitHub API error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"GitHub error: {str(e)}")
    except Exception as e:
        logging.error(f"Export error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@api_router.get("/github/repos")
async def list_github_repos(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "github_token": 1})
    if not user_doc or not user_doc.get("github_token"):
        raise HTTPException(status_code=401, detail="GitHub not connected")
    
    try:
        g = Github(user_doc["github_token"])
        repos = g.get_user().get_repos(sort="updated", direction="desc")
        
        repo_list = []
        for repo in repos[:50]:
            repo_list.append({
                "name": repo.name,
                "full_name": repo.full_name,
                "private": repo.private,
                "html_url": repo.html_url,
                "updated_at": repo.updated_at.isoformat() if repo.updated_at else None
            })
        
        return repo_list
    except Exception as e:
        logging.error(f"Failed to list repos: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch repositories")

class DeploymentTokenRequest(BaseModel):
    token: str

class DeploymentPreferenceRequest(BaseModel):
    platform: str

class DeployRequest(BaseModel):
    project_id: str
    project_name: Optional[str] = None
    target: str = "production"

@api_router.get("/deployment/settings")
async def get_deployment_settings(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "vercel_token": 1, "netlify_token": 1, "preferred_deploy_platform": 1})
    
    return {
        "vercel_connected": bool(user_doc and user_doc.get("vercel_token")),
        "netlify_connected": bool(user_doc and user_doc.get("netlify_token")),
        "preferred_platform": user_doc.get("preferred_deploy_platform", "vercel") if user_doc else "vercel"
    }

@api_router.post("/deployment/vercel/token")
async def save_vercel_token(
    data: DeploymentTokenRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(authorization, session_token)
    
    headers = {"Authorization": f"Bearer {data.token}"}
    response = requests.get("https://api.vercel.com/v2/user", headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid Vercel token")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"vercel_token": data.token}}
    )
    
    user_data = response.json()
    return {"message": "Vercel token saved", "username": user_data.get("username")}

@api_router.post("/deployment/netlify/token")
async def save_netlify_token(
    data: DeploymentTokenRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(authorization, session_token)
    
    headers = {"Authorization": f"Bearer {data.token}"}
    response = requests.get("https://api.netlify.com/api/v1/user", headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid Netlify token")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"netlify_token": data.token}}
    )
    
    user_data = response.json()
    return {"message": "Netlify token saved", "email": user_data.get("email")}

@api_router.post("/deployment/preference")
async def save_deployment_preference(
    data: DeploymentPreferenceRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(authorization, session_token)
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"preferred_deploy_platform": data.platform}}
    )
    
    return {"message": "Preference saved"}

@api_router.post("/deployment/deploy-vercel")
async def deploy_to_vercel(
    data: DeployRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(authorization, session_token)
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "vercel_token": 1})
    if not user_doc or not user_doc.get("vercel_token"):
        raise HTTPException(status_code=401, detail="Vercel not connected. Add your token in Settings.")
    
    project = await db.projects.find_one({"project_id": data.project_id, "user_id": user.user_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    files = await db.project_files.find({"project_id": data.project_id}, {"_id": 0}).to_list(1000)
    if not files:
        raise HTTPException(status_code=400, detail="No files to deploy")
    
    try:
        vercel_files = []
        for file_data in files:
            file_content = file_data["content"].encode('utf-8')
            file_base64 = base64.b64encode(file_content).decode('utf-8')
            vercel_files.append({
                "file": file_data["path"],
                "data": file_base64,
                "encoding": "base64"
            })
        
        package_json_exists = any(f["path"] == "package.json" for f in files)
        if not package_json_exists:
            package_json_content = {
                "name": data.project_name or project["name"].replace(" ", "-").lower(),
                "version": "1.0.0",
                "scripts": {
                    "start": "react-scripts start",
                    "build": "react-scripts build"
                },
                "dependencies": {
                    "react": "^18.2.0",
                    "react-dom": "^18.2.0",
                    "react-scripts": "5.0.1"
                }
            }
            package_json_base64 = base64.b64encode(json.dumps(package_json_content, indent=2).encode('utf-8')).decode('utf-8')
            vercel_files.append({
                "file": "package.json",
                "data": package_json_base64,
                "encoding": "base64"
            })
        
        public_html_exists = any(f["path"] == "public/index.html" for f in files)
        if not public_html_exists:
            html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>''' + project["name"] + '''</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>'''
            html_base64 = base64.b64encode(html_content.encode('utf-8')).decode('utf-8')
            vercel_files.append({
                "file": "public/index.html",
                "data": html_base64,
                "encoding": "base64"
            })
        
        deployment_body = {
            "name": data.project_name or project["name"].replace(" ", "-").lower(),
            "files": vercel_files,
            "target": data.target,
            "projectSettings": {
                "framework": "create-react-app"
            }
        }
        
        github_repo = project.get("github_repo")
        if github_repo:
            deployment_body["gitSource"] = {
                "type": "github",
                "repo": github_repo,
                "ref": "main"
            }
        
        headers = {
            "Authorization": f"Bearer {user_doc['vercel_token']}",
            "Content-Type": "application/json"
        }
        
        vercel_response = requests.post(
            "https://api.vercel.com/v13/deployments",
            headers=headers,
            json=deployment_body,
            timeout=60
        )
        
        if vercel_response.status_code not in [200, 201]:
            error_data = vercel_response.json()
            error_message = error_data.get("error", {}).get("message", "Deployment failed")
            raise HTTPException(status_code=400, detail=f"Vercel error: {error_message}")
        
        deployment_data = vercel_response.json()
        deployment_url = f"https://{deployment_data.get('url', '')}"
        
        await db.projects.update_one(
            {"project_id": data.project_id},
            {"$set": {
                "deployment_url": deployment_url,
                "deployment_platform": "vercel",
                "last_deployed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "message": "Deployed to Vercel successfully",
            "url": deployment_url,
            "deployment_id": deployment_data.get("id"),
            "ready_state": deployment_data.get("readyState", "QUEUED")
        }
        
    except requests.exceptions.RequestException as e:
        logging.error(f"Vercel API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")
    except Exception as e:
        logging.error(f"Deployment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")

@api_router.post("/deployment/deploy-netlify")
async def deploy_to_netlify(
    data: DeployRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(authorization, session_token)
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "netlify_token": 1})
    if not user_doc or not user_doc.get("netlify_token"):
        raise HTTPException(status_code=401, detail="Netlify not connected. Add your token in Settings.")
    
    project = await db.projects.find_one({"project_id": data.project_id, "user_id": user.user_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    files = await db.project_files.find({"project_id": data.project_id}, {"_id": 0}).to_list(1000)
    if not files:
        raise HTTPException(status_code=400, detail="No files to deploy")
    
    try:
        import tarfile
        import io
        
        tar_buffer = io.BytesIO()
        with tarfile.open(fileobj=tar_buffer, mode='w:gz') as tar:
            for file_data in files:
                file_content = file_data["content"].encode('utf-8')
                file_info = tarfile.TarInfo(name=file_data["path"])
                file_info.size = len(file_content)
                tar.addfile(file_info, io.BytesIO(file_content))
        
        tar_buffer.seek(0)
        
        headers = {
            "Authorization": f"Bearer {user_doc['netlify_token']}",
            "Content-Type": "application/x-tar"
        }
        
        site_name = data.project_name or project["name"].replace(" ", "-").lower()
        
        netlify_response = requests.post(
            f"https://api.netlify.com/api/v1/sites",
            headers={**headers, "Content-Type": "application/json"},
            json={"name": site_name}
        )
        
        if netlify_response.status_code not in [200, 201]:
            logging.error(f"Netlify site creation error: {netlify_response.text}")
        
        site_data = netlify_response.json() if netlify_response.status_code in [200, 201] else {}
        site_id = site_data.get("id", site_name)
        
        deploy_response = requests.post(
            f"https://api.netlify.com/api/v1/sites/{site_id}/deploys",
            headers=headers,
            data=tar_buffer.read(),
            timeout=60
        )
        
        if deploy_response.status_code not in [200, 201]:
            error_message = deploy_response.text
            raise HTTPException(status_code=400, detail=f"Netlify error: {error_message}")
        
        deploy_data = deploy_response.json()
        deployment_url = deploy_data.get("ssl_url") or deploy_data.get("url", "")
        
        await db.projects.update_one(
            {"project_id": data.project_id},
            {"$set": {
                "deployment_url": deployment_url,
                "deployment_platform": "netlify",
                "last_deployed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "message": "Deployed to Netlify successfully",
            "url": deployment_url,
            "deployment_id": deploy_data.get("id")
        }
        
    except Exception as e:
        logging.error(f"Netlify deployment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        origin.strip()
        for origin in os.environ.get('CORS_ORIGINS', 'http://127.0.0.1:3000,http://localhost:3000').split(',')
        if origin.strip() and origin.strip() != '*'
    ] or ["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()







