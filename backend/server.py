from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from deepface import DeepFace
import base64
import numpy as np
import cv2
import io
from PIL import Image as PILImage
import tempfile
from bson import ObjectId
import json
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# Models
class Usuario(BaseModel):
    nome: str
    cpf: str
    telefone: str
    face_image: str  # base64 encoded image
    ja_votou: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    lgpd_aceito: bool = False
    lgpd_aceito_em: Optional[datetime] = None

class UsuarioCadastro(BaseModel):
    nome: str
    cpf: str
    telefone: str
    face_image: str
    lgpd_aceito: bool

class Turma(BaseModel):
    nome_turma: str
    nome_projeto: str
    numero_barraca: str
    foto_base64: str
    votos_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TurmaCreate(BaseModel):
    nome_turma: str
    nome_projeto: str
    numero_barraca: str
    foto_base64: str

class Voto(BaseModel):
    usuario_id: str
    turma_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class FaceVerifyRequest(BaseModel):
    face_image: str  # base64 encoded

class VoteRequest(BaseModel):
    usuario_id: str
    turma_id: str

class AdminLoginRequest(BaseModel):
    password: str

class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Helper function to decode base64 image
def base64_to_image(base64_string):
    try:
        # Remove header if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        img_data = base64.b64decode(base64_string)
        img = PILImage.open(io.BytesIO(img_data))
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        return None

# Helper function to save temp image
def save_temp_image(img_array):
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    cv2.imwrite(temp_file.name, img_array)
    return temp_file.name

# Helper function to check if an image contains at least one detectable face
def has_detectable_face(img_array, image_path: str) -> bool:
    try:
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)

        if not face_cascade.empty():
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=4,
                minSize=(60, 60),
            )
            if len(faces) > 0:
                return True

        # Fallback detector: less strict than enforce_detection=True
        extracted_faces = DeepFace.extract_faces(
            img_path=image_path,
            detector_backend="opencv",
            enforce_detection=False,
            align=True,
        )

        for face in extracted_faces:
            area = face.get("facial_area") or {}
            confidence = float(face.get("confidence") or 0.0)
            width = int(area.get("w") or 0)
            height = int(area.get("h") or 0)

            if confidence >= 0.20 and width >= 40 and height >= 40:
                return True

        return False
    except Exception as e:
        logger.error(f"Error detecting face presence: {e}")
        return False


# Helper function to hash password
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Helper function to verify password
def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# Initialize admin password on startup
async def initialize_admin_password():
    admin_config = await db.admin_config.find_one({"type": "admin_password"})
    if not admin_config:
        # Create default admin password
        default_password = "fucapi2026"
        hashed_password = hash_password(default_password)
        await db.admin_config.insert_one({
            "type": "admin_password",
            "password": hashed_password,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        logger.info("Admin password initialized with default value")

# Admin login endpoint
@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    try:
        admin_config = await db.admin_config.find_one({"type": "admin_password"})
        
        if not admin_config:
            raise HTTPException(status_code=500, detail="ConfiguraÃ§Ã£o de admin nÃ£o encontrada")
        
        if verify_password(request.password, admin_config['password']):
            return {
                "success": True,
                "message": "Login realizado com sucesso"
            }
        else:
            raise HTTPException(status_code=401, detail="Senha incorreta")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in admin login: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin change password endpoint
@api_router.post("/admin/change-password")
async def admin_change_password(request: AdminChangePasswordRequest):
    try:
        admin_config = await db.admin_config.find_one({"type": "admin_password"})
        
        if not admin_config:
            raise HTTPException(status_code=500, detail="ConfiguraÃ§Ã£o de admin nÃ£o encontrada")
        
        # Verify current password
        if not verify_password(request.current_password, admin_config['password']):
            raise HTTPException(status_code=401, detail="Senha atual incorreta")
        
        # Validate new password
        if len(request.new_password) < 6:
            raise HTTPException(status_code=400, detail="A nova senha deve ter no mÃ­nimo 6 caracteres")
        
        # Update password
        new_hashed = hash_password(request.new_password)
        await db.admin_config.update_one(
            {"type": "admin_password"},
            {"$set": {
                "password": new_hashed,
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info("Admin password changed successfully")
        
        return {
            "success": True,
            "message": "Senha alterada com sucesso"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error changing admin password: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Face verification endpoint
@api_router.post("/verify-face")
async def verify_face(request: FaceVerifyRequest):
    try:
        logger.info("Starting face verification...")
        
        # Decode the incoming face image
        query_img = base64_to_image(request.face_image)
        if query_img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")

        # Save query image temporarily
        query_path = save_temp_image(query_img)
        # If no face is detected, user must retry capture.
        if not has_detectable_face(query_img, query_path):
            os.unlink(query_path)
            raise HTTPException(
                status_code=400,
                detail="Nenhum rosto detectado. Posicione seu rosto na moldura e tente novamente.",
            )

        # Get all users from database
        usuarios = await db.usuarios.find().to_list(1000)
        
        if not usuarios:
            logger.info("No users in database")
            os.unlink(query_path)
            return {"found": False, "message": "Nenhum usuÃ¡rio cadastrado"}
        
        # Compare with each user's face
        best_match = None
        best_distance = float('inf')
        
        for usuario in usuarios:
            try:
                # Decode stored face image
                stored_img = base64_to_image(usuario['face_image'])
                if stored_img is None:
                    continue
                
                stored_path = save_temp_image(stored_img)
                
                # Verify faces using DeepFace with balanced settings
                result = DeepFace.verify(
                    img1_path=query_path,
                    img2_path=stored_path,
                    model_name="Facenet",
                    detector_backend="opencv",
                    enforce_detection=False,  # Don't force detection to avoid errors
                    distance_metric="cosine"
                )
                
                os.unlink(stored_path)
                
                distance = result['distance']
                threshold = result['threshold']
                verified = result['verified']
                
                logger.info(f"Comparing with {usuario['nome']}: distance={distance:.4f}, threshold={threshold:.4f}, verified={verified}")
                
                # Track the best match
                if distance < best_distance:
                    best_distance = distance
                    best_match = (usuario, verified, distance)
                
            except Exception as e:
                logger.error(f"Error comparing with user {usuario.get('nome', 'unknown')}: {e}")
                continue
        
        # Clean up query image
        os.unlink(query_path)
        
        # Check if we have a good match with balanced threshold
        # For Facenet with cosine distance, threshold is typically 0.4
        # Strict threshold: accept if distance < 0.13
        STRICT_THRESHOLD = 0.14
        RELAXED_VERIFIED_THRESHOLD = 0.18
        
        if best_match:
            usuario, verified, distance = best_match
            is_match = (distance < STRICT_THRESHOLD) or (verified and distance < RELAXED_VERIFIED_THRESHOLD)

            if is_match:
                logger.info(
                    f"MATCH FOUND: {usuario['nome']} with distance {distance:.4f} "
                    f"(strict={STRICT_THRESHOLD}, relaxed_verified={RELAXED_VERIFIED_THRESHOLD}, verified={verified})"
                )
                return {
                    "found": True,
                    "usuario": {
                        "id": str(usuario['_id']),
                        "nome": usuario['nome'],
                        "cpf": usuario['cpf'],
                        "telefone": usuario['telefone'],
                        "ja_votou": usuario.get('ja_votou', False)
                    }
                }

            logger.info(
                f"NO MATCH: Best was {usuario['nome']} with distance {distance:.4f} "
                f"(strict={STRICT_THRESHOLD}, relaxed_verified={RELAXED_VERIFIED_THRESHOLD}, verified={verified})"
            )
        else:
            logger.info("NO MATCH: No faces could be compared")
        
        return {"found": False, "message": "Rosto nÃ£o encontrado"}
        
    except Exception as e:
        logger.error(f"Error in face verification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Register user with face
@api_router.post("/register")
async def register_user(usuario: UsuarioCadastro):
    try:
        logger.info(f"Registering user: {usuario.nome}")
        
        if not usuario.lgpd_aceito:
            raise HTTPException(status_code=400, detail="Aceite do termo LGPD e obrigatorio")

        # Check if CPF already exists
        existing = await db.usuarios.find_one({"cpf": usuario.cpf})
        if existing:
            raise HTTPException(status_code=400, detail="CPF jÃ¡ cadastrado")
        
        # Validate face image
        img = base64_to_image(usuario.face_image)
        if img is None:
            raise HTTPException(status_code=400, detail="Imagem invÃ¡lida")
        
        # Save to database
        usuario_dict = usuario.dict()
        usuario_dict['ja_votou'] = False
        usuario_dict['created_at'] = datetime.utcnow()
        usuario_dict['lgpd_aceito_em'] = datetime.utcnow()
        
        result = await db.usuarios.insert_one(usuario_dict)
        
        logger.info(f"User registered with ID: {result.inserted_id}")
        
        return {
            "success": True,
            "usuario_id": str(result.inserted_id),
            "message": "UsuÃ¡rio cadastrado com sucesso"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get all turmas for voting
@api_router.get("/turmas")
async def get_turmas():
    try:
        turmas = await db.turmas.find().to_list(1000)
        return [{**serialize_doc(t)} for t in turmas]
    except Exception as e:
        logger.error(f"Error getting turmas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Vote endpoint
@api_router.post("/vote")
async def vote(vote_request: VoteRequest):
    try:
        logger.info(f"Processing vote from user {vote_request.usuario_id} for turma {vote_request.turma_id}")
        
        # Check if user exists
        usuario = await db.usuarios.find_one({"_id": ObjectId(vote_request.usuario_id)})
        if not usuario:
            raise HTTPException(status_code=404, detail="UsuÃ¡rio nÃ£o encontrado")
        
        # Check if user already voted
        if usuario.get('ja_votou', False):
            raise HTTPException(status_code=400, detail="VocÃª jÃ¡ realizou sua votaÃ§Ã£o")
        
        # Check if turma exists
        turma = await db.turmas.find_one({"_id": ObjectId(vote_request.turma_id)})
        if not turma:
            raise HTTPException(status_code=404, detail="Turma nÃ£o encontrada")
        
        # Register vote
        voto_dict = {
            "usuario_id": vote_request.usuario_id,
            "turma_id": vote_request.turma_id,
            "timestamp": datetime.utcnow()
        }
        await db.votos.insert_one(voto_dict)
        
        # Update user as voted
        await db.usuarios.update_one(
            {"_id": ObjectId(vote_request.usuario_id)},
            {"$set": {"ja_votou": True}}
        )
        
        # Increment vote count for turma
        await db.turmas.update_one(
            {"_id": ObjectId(vote_request.turma_id)},
            {"$inc": {"votos_count": 1}}
        )
        
        logger.info(f"Vote registered successfully")
        
        return {
            "success": True,
            "message": "Voto registrado com sucesso!"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error processing vote: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin endpoints
@api_router.post("/admin/turmas")
async def create_turma(turma: TurmaCreate):
    try:
        logger.info(f"Creating turma: {turma.nome_turma}")
        
        turma_dict = turma.dict()
        turma_dict['votos_count'] = 0
        turma_dict['created_at'] = datetime.utcnow()
        
        result = await db.turmas.insert_one(turma_dict)
        
        return {
            "success": True,
            "turma_id": str(result.inserted_id),
            "message": "Turma cadastrada com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Error creating turma: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/turmas")
async def get_admin_turmas():
    try:
        turmas = await db.turmas.find().to_list(1000)
        return [{**serialize_doc(t)} for t in turmas]
    except Exception as e:
        logger.error(f"Error getting admin turmas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/turmas/{turma_id}")
async def delete_turma(turma_id: str):
    try:
        result = await db.turmas.delete_one({"_id": ObjectId(turma_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Turma nÃ£o encontrada")
        
        return {
            "success": True,
            "message": "Turma deletada com sucesso"
        }
    except Exception as e:
        logger.error(f"Error deleting turma: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/turmas/{turma_id}")
async def update_turma(turma_id: str, turma: TurmaCreate):
    try:
        logger.info(f"Updating turma: {turma_id}")
        
        turma_dict = turma.dict()
        turma_dict['updated_at'] = datetime.utcnow()
        
        result = await db.turmas.update_one(
            {"_id": ObjectId(turma_id)},
            {"$set": turma_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Turma nÃ£o encontrada")
        
        return {
            "success": True,
            "message": "Turma atualizada com sucesso"
        }
    except Exception as e:
        logger.error(f"Error updating turma: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/reports")
async def get_reports():
    try:
        # Total de usuÃ¡rios cadastrados
        total_usuarios = await db.usuarios.count_documents({})
        
        # Total de votos
        total_votos = await db.votos.count_documents({})
        
        # Votos por hora
        pipeline = [
            {
                "$project": {
                    "hour": {"$hour": "$timestamp"}
                }
            },
            {
                "$group": {
                    "_id": "$hour",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            }
        ]
        
        votos_por_hora = await db.votos.aggregate(pipeline).to_list(24)
        
        # HorÃ¡rio de pico
        horario_pico = None
        if votos_por_hora:
            horario_pico = {
                "hora": votos_por_hora[0]['_id'],
                "total_votos": votos_por_hora[0]['count']
            }
        
        # Votos por turma (top 5)
        turmas = await db.turmas.find().sort("votos_count", -1).limit(5).to_list(5)
        
        return {
            "total_usuarios": total_usuarios,
            "total_votos": total_votos,
            "horario_pico": horario_pico,
            "votos_por_hora": votos_por_hora,
            "top_projetos": [{**serialize_doc(t)} for t in turmas]
        }
    except Exception as e:
        logger.error(f"Error getting reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/results")
async def get_results():
    try:
        turmas = await db.turmas.find().sort("votos_count", -1).to_list(1000)
        total_votos = sum(t.get('votos_count', 0) for t in turmas)
        
        return {
            "total_votos": total_votos,
            "turmas": [{**serialize_doc(t)} for t in turmas]
        }
    except Exception as e:
        logger.error(f"Error getting results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/reset-all")
async def reset_all_data():
    try:
        logger.warning("RESETTING ALL DATA - This will delete all users, votes, and turmas!")
        
        # Delete all data
        usuarios_deleted = await db.usuarios.delete_many({})
        votos_deleted = await db.votos.delete_many({})
        turmas_deleted = await db.turmas.delete_many({})
        
        logger.info(f"Reset complete: {usuarios_deleted.deleted_count} users, {votos_deleted.deleted_count} votes, {turmas_deleted.deleted_count} turmas deleted")
        
        return {
            "success": True,
            "message": "Sistema resetado com sucesso",
            "deleted": {
                "usuarios": usuarios_deleted.deleted_count,
                "votos": votos_deleted.deleted_count,
                "turmas": turmas_deleted.deleted_count
            }
        }
    except Exception as e:
        logger.error(f"Error resetting data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check
@api_router.get("/")
async def root():
    return {"message": "API de VotaÃ§Ã£o - XXI Feira TecnolÃ³gica Fucapi"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await initialize_admin_password()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()




