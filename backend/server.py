from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from deepface import DeepFace
import base64
import numpy as np
import cv2
import io
from PIL import Image as PILImage
from PIL import ImageOps as PILImageOps
import tempfile
from bson import ObjectId
from bson.errors import InvalidId
import json
import bcrypt
import hashlib
from pymongo.errors import DuplicateKeyError

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

FACE_MODEL_NAME = os.getenv("FACE_MODEL_NAME", "Facenet")
FACE_DETECTOR_BACKEND = os.getenv("FACE_DETECTOR_BACKEND", "opencv")
FACE_DISTANCE_STRICT_THRESHOLD = float(os.getenv("FACE_DISTANCE_STRICT_THRESHOLD", "0.16"))
FACE_DISTANCE_RELAXED_THRESHOLD = float(os.getenv("FACE_DISTANCE_RELAXED_THRESHOLD", "0.22"))
USERS_VERIFY_FETCH_LIMIT = int(os.getenv("USERS_VERIFY_FETCH_LIMIT", "5000"))
FACE_VERIFY_FALLBACK_CANDIDATES = int(os.getenv("FACE_VERIFY_FALLBACK_CANDIDATES", "5"))
FACE_VERIFY_FALLBACK_MAX_DISTANCE = float(os.getenv("FACE_VERIFY_FALLBACK_MAX_DISTANCE", "0.32"))
FACE_GUIDANCE_CENTER_OFFSET_X_MAX = float(os.getenv("FACE_GUIDANCE_CENTER_OFFSET_X_MAX", "0.12"))
FACE_GUIDANCE_CENTER_OFFSET_Y_MAX = float(os.getenv("FACE_GUIDANCE_CENTER_OFFSET_Y_MAX", "0.14"))
FACE_GUIDANCE_CENTER_MIN_RATIO = float(os.getenv("FACE_GUIDANCE_CENTER_MIN_RATIO", "0.10"))
FACE_GUIDANCE_CENTER_MAX_RATIO = float(os.getenv("FACE_GUIDANCE_CENTER_MAX_RATIO", "0.38"))
FACE_MAX_PROCESSING_DIM = int(os.getenv("FACE_MAX_PROCESSING_DIM", "960"))
FACE_GUIDANCE_MAX_DIM = int(os.getenv("FACE_GUIDANCE_MAX_DIM", "720"))
APP_TIMEZONE = os.getenv("APP_TIMEZONE", "America/Manaus")
FACE_TEST_AUTO_REGISTER = os.getenv("FACE_TEST_AUTO_REGISTER", "true").strip().lower() in ("1", "true", "yes", "on")

_face_embedding_cache: Dict[str, Dict[str, Any]] = {}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)

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
    created_at: datetime = Field(default_factory=now_utc)
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
    foto_base64: Optional[str] = ""
    votos_count: int = 0
    created_at: datetime = Field(default_factory=now_utc)

class TurmaCreate(BaseModel):
    nome_turma: str
    nome_projeto: str
    numero_barraca: str
    foto_base64: Optional[str] = ""

class Voto(BaseModel):
    usuario_id: str
    turma_id: str
    timestamp: datetime = Field(default_factory=now_utc)

class FaceVerifyRequest(BaseModel):
    face_image: str  # base64 encoded

class FaceGuidanceRequest(BaseModel):
    face_image: str  # base64 encoded

class VoteRequest(BaseModel):
    usuario_id: str
    turma_id: str

class AdminLoginRequest(BaseModel):
    password: str

class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def normalize_base64_field(value: Optional[str]) -> str:
    if not value:
        return ""
    return value.split(",", 1)[1] if "," in value else value


def build_turma_payload(turma: "TurmaCreate") -> Dict[str, Any]:
    nome_turma = turma.nome_turma.strip()
    nome_projeto = turma.nome_projeto.strip()
    numero_barraca = turma.numero_barraca.strip()

    if not nome_turma or not nome_projeto or not numero_barraca:
        raise HTTPException(
            status_code=400,
            detail="Preencha nome da turma, nome do projeto e numero da barraca."
        )

    return {
        "nome_turma": nome_turma,
        "nome_projeto": nome_projeto,
        "numero_barraca": numero_barraca,
        "foto_base64": normalize_base64_field(turma.foto_base64),
    }

# Helper function to decode base64 image
def base64_to_image(base64_string):
    try:
        # Remove header if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        img_data = base64.b64decode(base64_string)
        img = PILImage.open(io.BytesIO(img_data))
        # Normalize orientation from EXIF (important for iPhone/Samsung captures).
        img = PILImageOps.exif_transpose(img)

        if img.mode == "RGBA":
            return cv2.cvtColor(np.array(img), cv2.COLOR_RGBA2BGR)
        if img.mode == "L":
            return cv2.cvtColor(np.array(img), cv2.COLOR_GRAY2BGR)
        if img.mode != "RGB":
            img = img.convert("RGB")

        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        return None

# Helper function to save temp image
def save_temp_image(img_array):
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    cv2.imwrite(temp_file.name, img_array)
    return temp_file.name

def safe_unlink(path: Optional[str]):
    if not path:
        return
    try:
        if os.path.exists(path):
            os.unlink(path)
    except Exception as e:
        logger.warning(f"Could not remove temp file {path}: {e}")

def resize_for_processing(img_array, max_dim: int):
    try:
        if img_array is None:
            return None
        if max_dim <= 0:
            return img_array

        img_h, img_w = img_array.shape[:2]
        largest = max(img_h, img_w)
        if largest <= max_dim:
            return img_array

        scale = float(max_dim) / float(largest)
        target_w = max(1, int(round(img_w * scale)))
        target_h = max(1, int(round(img_h * scale)))
        return cv2.resize(img_array, (target_w, target_h), interpolation=cv2.INTER_AREA)
    except Exception as e:
        logger.warning(f"Could not resize image for processing: {e}")
        return img_array

def cosine_distance(vec1: List[float], vec2: List[float]) -> float:
    emb1 = np.asarray(vec1, dtype=np.float32)
    emb2 = np.asarray(vec2, dtype=np.float32)
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    if norm1 == 0.0 or norm2 == 0.0:
        return 1.0
    similarity = float(np.dot(emb1, emb2) / (norm1 * norm2))
    similarity = max(-1.0, min(1.0, similarity))
    return 1.0 - similarity

def get_face_embedding_from_path(image_path: str) -> Optional[List[float]]:
    try:
        representations = DeepFace.represent(
            img_path=image_path,
            model_name=FACE_MODEL_NAME,
            detector_backend=FACE_DETECTOR_BACKEND,
            enforce_detection=False,
        )
        if not representations:
            return None

        first = representations[0]
        if isinstance(first, dict):
            embedding = first.get("embedding")
        else:
            embedding = first
        if not embedding:
            return None

        return [float(v) for v in embedding]
    except Exception as e:
        logger.error(f"Error extracting face embedding: {e}")
        return None

def get_face_image_fingerprint(face_image_base64: str) -> str:
    return hashlib.sha1(face_image_base64.encode("utf-8")).hexdigest()

def normalize_embedding(values: Any) -> Optional[List[float]]:
    if not isinstance(values, list) or not values:
        return None
    try:
        return [float(v) for v in values]
    except Exception:
        return None


async def create_temporary_face_user(face_image: str, embedding: List[float]) -> Dict[str, Any]:
    suffix = uuid.uuid4().hex[:12].upper()
    identifier = f"FACE{suffix}"
    usuario_dict = {
        "nome": f"Participante {suffix[-6:]}",
        "cpf": identifier,
        "telefone": identifier,
        "face_image": face_image,
        "lgpd_aceito": True,
        "ja_votou": False,
        "created_at": now_utc(),
        "lgpd_aceito_em": now_utc(),
        "face_embedding": embedding,
        "face_fingerprint": get_face_image_fingerprint(face_image),
    }

    result = await db.usuarios.insert_one(usuario_dict)
    user_id = str(result.inserted_id)
    _face_embedding_cache[user_id] = {
        "fingerprint": usuario_dict["face_fingerprint"],
        "embedding": embedding,
        "updated_at": now_utc(),
    }

    return {
        "id": user_id,
        "nome": usuario_dict["nome"],
        "cpf": usuario_dict["cpf"],
        "telefone": usuario_dict["telefone"],
        "ja_votou": False,
        "temporario": True,
    }

def get_or_create_user_embedding(usuario: Dict[str, Any]) -> Optional[List[float]]:
    user_id = str(usuario.get("_id"))
    face_image = usuario.get("face_image")
    persisted_embedding = normalize_embedding(usuario.get("face_embedding"))

    if not user_id:
        return None

    fingerprint = usuario.get("face_fingerprint")
    if not fingerprint and face_image:
        fingerprint = get_face_image_fingerprint(face_image)

    cached = _face_embedding_cache.get(user_id)
    if cached and fingerprint and cached.get("fingerprint") == fingerprint:
        return cached.get("embedding")

    if persisted_embedding:
        _face_embedding_cache[user_id] = {
            "fingerprint": fingerprint,
            "embedding": persisted_embedding,
            "updated_at": now_utc(),
        }
        return persisted_embedding

    if not face_image:
        return None

    stored_img = base64_to_image(face_image)
    if stored_img is None:
        return None
    stored_img = resize_for_processing(stored_img, FACE_MAX_PROCESSING_DIM)

    stored_path = save_temp_image(stored_img)
    try:
        embedding = get_face_embedding_from_path(stored_path)
        if embedding:
            _face_embedding_cache[user_id] = {
                "fingerprint": fingerprint,
                "embedding": embedding,
                "updated_at": now_utc(),
            }
        return embedding
    finally:
        safe_unlink(stored_path)

# Helper function to check if an image contains at least one detectable face
def has_detectable_face(img_array, image_path: str) -> bool:
    try:
        img_h, img_w = img_array.shape[:2]
        min_face_size = max(80, int(min(img_h, img_w) * 0.12))
        min_face_area_ratio = 0.02

        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)

        if not face_cascade.empty():
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=4,
                minSize=(min_face_size, min_face_size),
            )
            for (x, y, w, h) in faces:
                face_area_ratio = (w * h) / float(img_w * img_h)
                if w >= min_face_size and h >= min_face_size and face_area_ratio >= min_face_area_ratio:
                    return True

        # Fallback detector: strict mode to avoid accepting empty/no-face frames.
        try:
            extracted_faces = DeepFace.extract_faces(
                img_path=image_path,
                detector_backend="opencv",
                enforce_detection=True,
                align=True,
            )
        except Exception:
            extracted_faces = []

        for face in extracted_faces:
            area = face.get("facial_area") or {}
            confidence = float(face.get("confidence") or 0.0)
            width = int(area.get("w") or 0)
            height = int(area.get("h") or 0)
            face_area_ratio = (width * height) / float(img_w * img_h) if img_w and img_h else 0.0

            if confidence >= 0.70 and width >= min_face_size and height >= min_face_size and face_area_ratio >= min_face_area_ratio:
                return True

        return False
    except Exception as e:
        logger.error(f"Error detecting face presence: {e}")
        return False

def get_primary_face_area(img_array, image_path: str):
    try:
        img_h, img_w = img_array.shape[:2]
        min_face_size = max(50, int(min(img_h, img_w) * 0.08))

        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)

        if not face_cascade.empty():
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(min_face_size, min_face_size),
            )
            if len(faces) > 0:
                best = max(faces, key=lambda f: f[2] * f[3])
                x, y, w, h = [int(v) for v in best]
                return {"x": x, "y": y, "w": w, "h": h}

        try:
            extracted_faces = DeepFace.extract_faces(
                img_path=image_path,
                detector_backend="opencv",
                enforce_detection=False,
                align=True,
            )
        except Exception:
            extracted_faces = []

        best_area = None
        best_size = 0
        for face in extracted_faces:
            area = face.get("facial_area") or {}
            x = int(area.get("x") or 0)
            y = int(area.get("y") or 0)
            w = int(area.get("w") or 0)
            h = int(area.get("h") or 0)
            size = w * h
            if size > best_size:
                best_size = size
                best_area = {"x": x, "y": y, "w": w, "h": h}
        return best_area
    except Exception as e:
        logger.error(f"Error getting primary face area: {e}")
        return None

def validate_liveness(image_path: str):
    """
    Runs anti-spoofing over the input image.
    Returns: (is_live: bool, message: Optional[str], score: Optional[float])
    """
    strict_mode = os.getenv("LIVENESS_STRICT_MODE", "false").strip().lower() in ("1", "true", "yes", "on")

    try:
        faces = DeepFace.extract_faces(
            img_path=image_path,
            detector_backend="opencv",
            enforce_detection=True,
            align=True,
            anti_spoofing=True,
        )

        if not faces:
            return False, "Nenhum rosto detectado para prova de vida.", None

        def face_area(face_obj):
            area = face_obj.get("facial_area") or {}
            return int(area.get("w") or 0) * int(area.get("h") or 0)

        best_face = max(faces, key=face_area)
        is_real = best_face.get("is_real")
        score_raw = best_face.get("antispoof_score")
        if score_raw is None:
            score_raw = best_face.get("anti_spoof_score")
        score = float(score_raw) if score_raw is not None else None

        # Fail-closed: if the anti-spoof model flags spoof, reject.
        if is_real is False:
            return False, "Prova de vida falhou. Não use foto, tela ou impressão.", score

        # Defensive threshold when score is provided by the model.
        if score is not None and score < 0.35:
            return False, "Prova de vida falhou. Aproxime o rosto real da câmera e tente novamente.", score

        return True, None, score
    except Exception as e:
        logger.error(f"Error validating liveness: {e}")
        if strict_mode:
            return False, "Não foi possível validar prova de vida. Tente novamente com o rosto real.", None

        # Fail-open in non-strict mode: don't block user on infrastructure/model failures.
        logger.warning("Liveness validation unavailable, continuing without anti-spoof due to non-strict mode.")
        return True, None, None


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
            "created_at": now_utc(),
            "updated_at": now_utc()
        })
        logger.info("Admin password initialized with default value")

async def ensure_indexes():
    try:
        await db.usuarios.create_index("cpf", unique=True, name="uniq_cpf")
        await db.votos.create_index("usuario_id", unique=True, name="uniq_vote_by_user")
        await db.votos.create_index("timestamp", name="idx_vote_timestamp")
        logger.info("MongoDB indexes ensured successfully")
    except Exception as e:
        logger.warning(f"Could not ensure one or more indexes: {e}")

async def warmup_face_model():
    try:
        DeepFace.build_model(FACE_MODEL_NAME)
        logger.info(f"Face model warmed up: {FACE_MODEL_NAME}")
    except Exception as e:
        logger.warning(f"Face model warmup failed: {e}")

# Admin login endpoint
@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    try:
        admin_config = await db.admin_config.find_one({"type": "admin_password"})
        
        if not admin_config:
            raise HTTPException(status_code=500, detail="Configuração de admin não encontrada")
        
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
            raise HTTPException(status_code=500, detail="Configuração de admin não encontrada")
        
        # Verify current password
        if not verify_password(request.current_password, admin_config['password']):
            raise HTTPException(status_code=401, detail="Senha atual incorreta")
        
        # Validate new password
        if len(request.new_password) < 6:
            raise HTTPException(status_code=400, detail="A nova senha deve ter no mínimo 6 caracteres")
        
        # Update password
        new_hashed = hash_password(request.new_password)
        await db.admin_config.update_one(
            {"type": "admin_password"},
            {"$set": {
                "password": new_hashed,
                "updated_at": now_utc()
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
    query_path = None
    try:
        logger.info("Starting face verification...")

        query_img = base64_to_image(request.face_image)
        if query_img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        query_img = resize_for_processing(query_img, FACE_MAX_PROCESSING_DIM)

        query_path = save_temp_image(query_img)

        is_live, live_message, live_score = validate_liveness(query_path)
        if not is_live:
            raise HTTPException(
                status_code=400,
                detail=live_message or "Prova de vida inválida.",
            )
        logger.info(f"Liveness validated (score={live_score})")

        if not has_detectable_face(query_img, query_path):
            raise HTTPException(
                status_code=400,
                detail="Nenhum rosto detectado. Posicione seu rosto na moldura e tente novamente.",
            )

        query_embedding = get_face_embedding_from_path(query_path)
        if not query_embedding:
            raise HTTPException(
                status_code=400,
                detail="Não foi possível processar seu rosto. Ajuste a imagem e tente novamente.",
            )

        usuarios = await db.usuarios.find(
            {},
            {
                "_id": 1,
                "nome": 1,
                "cpf": 1,
                "telefone": 1,
                "ja_votou": 1,
                "face_image": 1,
                "face_embedding": 1,
                "face_fingerprint": 1,
            },
        ).to_list(USERS_VERIFY_FETCH_LIMIT)
        if not usuarios:
            logger.info("No users in database")
            if FACE_TEST_AUTO_REGISTER:
                usuario_temporario = await create_temporary_face_user(request.face_image, query_embedding)
                logger.info(f"TEMP USER CREATED (empty-db): {usuario_temporario['id']}")
                return {"found": True, "usuario": usuario_temporario, "created": True}
            return {"found": False, "message": "Nenhum usuário cadastrado"}

        best_match = None
        best_distance = float('inf')
        top_candidates = []

        for usuario in usuarios:
            try:
                stored_embedding = get_or_create_user_embedding(usuario)
                if not stored_embedding:
                    continue

                distance = cosine_distance(query_embedding, stored_embedding)
                if distance < best_distance:
                    best_distance = distance
                    best_match = (usuario, distance)

                top_candidates.append((usuario, distance))
                top_candidates.sort(key=lambda item: item[1])
                if len(top_candidates) > FACE_VERIFY_FALLBACK_CANDIDATES:
                    top_candidates = top_candidates[:FACE_VERIFY_FALLBACK_CANDIDATES]

            except Exception as e:
                logger.error(f"Error comparing with user {usuario.get('nome', 'unknown')}: {e}")
                continue

        if best_match:
            usuario, distance = best_match
            verified = distance < FACE_DISTANCE_RELAXED_THRESHOLD
            is_match = (distance < FACE_DISTANCE_STRICT_THRESHOLD) or (verified and distance < FACE_DISTANCE_RELAXED_THRESHOLD)

            if is_match:
                logger.info(
                    f"MATCH FOUND: {usuario['nome']} with distance {distance:.4f} "
                    f"(strict={FACE_DISTANCE_STRICT_THRESHOLD}, relaxed={FACE_DISTANCE_RELAXED_THRESHOLD}, verified={verified})"
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
                f"(strict={FACE_DISTANCE_STRICT_THRESHOLD}, relaxed={FACE_DISTANCE_RELAXED_THRESHOLD}, verified={verified})"
            )
        else:
            logger.info("NO MATCH: No faces could be compared")

        # Fallback: run DeepFace.verify only on nearest candidates when embedding threshold does not match.
        fallback_match = None
        fallback_distance = float("inf")
        fallback_threshold = None
        for candidato, approx_distance in top_candidates:
            if approx_distance > FACE_VERIFY_FALLBACK_MAX_DISTANCE:
                continue

            stored_img = base64_to_image(candidato.get("face_image", ""))
            if stored_img is None:
                continue

            stored_path = save_temp_image(stored_img)
            try:
                result = DeepFace.verify(
                    img1_path=query_path,
                    img2_path=stored_path,
                    model_name=FACE_MODEL_NAME,
                    detector_backend=FACE_DETECTOR_BACKEND,
                    enforce_detection=False,
                    distance_metric="cosine"
                )

                distance = float(result.get("distance", 1.0))
                threshold = float(result.get("threshold", FACE_DISTANCE_RELAXED_THRESHOLD))
                verified = bool(result.get("verified"))
                within_margin = distance <= min(FACE_VERIFY_FALLBACK_MAX_DISTANCE, threshold + 0.02)

                if (verified or within_margin) and distance < fallback_distance:
                    fallback_match = candidato
                    fallback_distance = distance
                    fallback_threshold = threshold
            except Exception as e:
                logger.error(f"Fallback verification failed for {candidato.get('nome', 'unknown')}: {e}")
            finally:
                safe_unlink(stored_path)

        if fallback_match:
            logger.info(
                f"FALLBACK MATCH FOUND: {fallback_match['nome']} with distance {fallback_distance:.4f} "
                f"(threshold={fallback_threshold}, max_fallback={FACE_VERIFY_FALLBACK_MAX_DISTANCE})"
            )
            return {
                "found": True,
                "usuario": {
                    "id": str(fallback_match['_id']),
                    "nome": fallback_match['nome'],
                    "cpf": fallback_match['cpf'],
                    "telefone": fallback_match['telefone'],
                    "ja_votou": fallback_match.get('ja_votou', False)
                }
            }

        if FACE_TEST_AUTO_REGISTER:
            usuario_temporario = await create_temporary_face_user(request.face_image, query_embedding)
            logger.info(f"TEMP USER CREATED (no-match): {usuario_temporario['id']}")
            return {"found": True, "usuario": usuario_temporario, "created": True}

        return {"found": False, "message": "Rosto não encontrado"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in face verification: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        safe_unlink(query_path)

@api_router.post("/face-guidance")
async def face_guidance(request: FaceGuidanceRequest):
    try:
        img = base64_to_image(request.face_image)
        if img is None:
            raise HTTPException(status_code=400, detail="Imagem inválida")
        img = resize_for_processing(img, FACE_GUIDANCE_MAX_DIM)

        image_path = save_temp_image(img)
        area = get_primary_face_area(img, image_path)
        os.unlink(image_path)

        if not area:
            return {
                "detected": False,
                "centered": False,
                "message": "Nenhum rosto detectado",
            }

        img_h, img_w = img.shape[:2]
        face_center_x = area["x"] + (area["w"] / 2.0)
        face_center_y = area["y"] + (area["h"] / 2.0)
        img_center_x = img_w / 2.0
        img_center_y = img_h / 2.0

        delta_x = (face_center_x - img_center_x) / float(img_w)
        delta_y = (face_center_y - img_center_y) / float(img_h)
        offset_x = abs(delta_x)
        offset_y = abs(delta_y)
        face_ratio = (area["w"] * area["h"]) / float(img_w * img_h)

        centered = (
            offset_x <= FACE_GUIDANCE_CENTER_OFFSET_X_MAX
            and offset_y <= FACE_GUIDANCE_CENTER_OFFSET_Y_MAX
            and FACE_GUIDANCE_CENTER_MIN_RATIO <= face_ratio <= FACE_GUIDANCE_CENTER_MAX_RATIO
        )

        if centered:
            guidance_message = "Rosto centralizado com precisão"
        elif face_ratio < FACE_GUIDANCE_CENTER_MIN_RATIO:
            guidance_message = "Aproxime um pouco o rosto da câmera"
        elif face_ratio > FACE_GUIDANCE_CENTER_MAX_RATIO:
            guidance_message = "Afaste um pouco o rosto da câmera"
        elif offset_x > FACE_GUIDANCE_CENTER_OFFSET_X_MAX:
            guidance_message = "Ajuste o rosto para o centro horizontal da moldura"
        elif offset_y > FACE_GUIDANCE_CENTER_OFFSET_Y_MAX:
            guidance_message = "Ajuste o rosto para o centro vertical da moldura"
        else:
            guidance_message = "Ajuste o rosto para o centro da moldura"

        return {
            "detected": True,
            "centered": centered,
            "delta_x": round(delta_x, 4),
            "delta_y": round(delta_y, 4),
            "offset_x": round(offset_x, 4),
            "offset_y": round(offset_y, 4),
            "face_ratio": round(face_ratio, 4),
            "message": guidance_message,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in face guidance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Register user with face
@api_router.post("/register")
async def register_user(usuario: UsuarioCadastro):
    register_path = None
    try:
        logger.info(f"Registering user: {usuario.nome}")
        
        if not usuario.lgpd_aceito:
            raise HTTPException(status_code=400, detail="Aceite do termo LGPD é obrigatório")

        # Check if CPF already exists
        existing = await db.usuarios.find_one({"cpf": usuario.cpf})
        if existing:
            raise HTTPException(status_code=400, detail="CPF já cadastrado")
        
        # Validate face image
        img = base64_to_image(usuario.face_image)
        if img is None:
            raise HTTPException(status_code=400, detail="Imagem inválida")
        img = resize_for_processing(img, FACE_MAX_PROCESSING_DIM)

        register_path = save_temp_image(img)
        is_live, live_message, live_score = validate_liveness(register_path)
        if not is_live:
            safe_unlink(register_path)
            register_path = None
            raise HTTPException(
                status_code=400,
                detail=live_message or "Prova de vida inválida.",
            )
        logger.info(f"Liveness validated during register (score={live_score})")

        if not has_detectable_face(img, register_path):
            safe_unlink(register_path)
            register_path = None
            raise HTTPException(
                status_code=400,
                detail="Nenhum rosto detectado na foto. Capture uma imagem com o rosto visível e centralizado.",
            )

        register_embedding = get_face_embedding_from_path(register_path)
        if not register_embedding:
            safe_unlink(register_path)
            register_path = None
            raise HTTPException(
                status_code=400,
                detail="Não foi possível processar seu rosto. Tente novamente com melhor iluminação.",
            )

        safe_unlink(register_path)
        register_path = None
        
        # Save to database
        usuario_dict = usuario.dict()
        usuario_dict['ja_votou'] = False
        usuario_dict['created_at'] = now_utc()
        usuario_dict['lgpd_aceito_em'] = now_utc()
        usuario_dict['face_embedding'] = register_embedding
        usuario_dict['face_fingerprint'] = get_face_image_fingerprint(usuario.face_image)
        
        result = await db.usuarios.insert_one(usuario_dict)
        _face_embedding_cache[str(result.inserted_id)] = {
            "fingerprint": usuario_dict['face_fingerprint'],
            "embedding": register_embedding,
            "updated_at": now_utc(),
        }
        
        logger.info(f"User registered with ID: {result.inserted_id}")
        
        return {
            "success": True,
            "usuario_id": str(result.inserted_id),
            "message": "Usuário cadastrado com sucesso"
        }
        
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="CPF já cadastrado")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        safe_unlink(register_path)

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

        try:
            usuario_id = ObjectId(vote_request.usuario_id)
            turma_id = ObjectId(vote_request.turma_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Identificador inválido")

        turma = await db.turmas.find_one({"_id": turma_id}, {"_id": 1})
        if not turma:
            raise HTTPException(status_code=404, detail="Turma não encontrada")

        reserve_vote = await db.usuarios.update_one(
            {"_id": usuario_id, "ja_votou": {"$ne": True}},
            {"$set": {"ja_votou": True, "voted_at": now_utc()}},
        )
        if reserve_vote.modified_count == 0:
            usuario_exists = await db.usuarios.find_one({"_id": usuario_id}, {"_id": 1, "ja_votou": 1})
            if not usuario_exists:
                raise HTTPException(status_code=404, detail="Usuário não encontrado")
            raise HTTPException(status_code=400, detail="Você já realizou sua votação")

        voto_dict = {
            "usuario_id": vote_request.usuario_id,
            "turma_id": vote_request.turma_id,
            "timestamp": now_utc()
        }

        vote_inserted = False
        try:
            await db.votos.insert_one(voto_dict)
            vote_inserted = True

            turma_update = await db.turmas.update_one(
                {"_id": turma_id},
                {"$inc": {"votos_count": 1}}
            )
            if turma_update.modified_count == 0:
                raise HTTPException(status_code=404, detail="Turma não encontrada")
        except DuplicateKeyError:
            await db.usuarios.update_one(
                {"_id": usuario_id},
                {"$set": {"ja_votou": False}, "$unset": {"voted_at": ""}},
            )
            raise HTTPException(status_code=400, detail="Você já realizou sua votação")
        except HTTPException as he:
            if vote_inserted:
                await db.votos.delete_one({"usuario_id": vote_request.usuario_id})
            await db.usuarios.update_one(
                {"_id": usuario_id},
                {"$set": {"ja_votou": False}, "$unset": {"voted_at": ""}},
            )
            raise he
        except Exception:
            if vote_inserted:
                await db.votos.delete_one({"usuario_id": vote_request.usuario_id})
            await db.usuarios.update_one(
                {"_id": usuario_id},
                {"$set": {"ja_votou": False}, "$unset": {"voted_at": ""}},
            )
            raise
        
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
        
        turma_dict = build_turma_payload(turma)
        turma_dict['votos_count'] = 0
        turma_dict['created_at'] = now_utc()
        
        result = await db.turmas.insert_one(turma_dict)
        
        return {
            "success": True,
            "turma_id": str(result.inserted_id),
            "message": "Turma cadastrada com sucesso"
        }
    except HTTPException as he:
        raise he
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
            raise HTTPException(status_code=404, detail="Turma não encontrada")
        
        return {
            "success": True,
            "message": "Turma deletada com sucesso"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting turma: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/turmas/{turma_id}")
async def update_turma(turma_id: str, turma: TurmaCreate):
    try:
        logger.info(f"Updating turma: {turma_id}")
        
        turma_dict = build_turma_payload(turma)
        turma_dict['updated_at'] = now_utc()
        
        result = await db.turmas.update_one(
            {"_id": ObjectId(turma_id)},
            {"$set": turma_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Turma não encontrada")
        
        return {
            "success": True,
            "message": "Turma atualizada com sucesso"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating turma: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/reports")
async def get_reports():
    try:
        # Total de usuários cadastrados
        total_usuarios = await db.usuarios.count_documents({})
        
        # Total de votos
        total_votos = await db.votos.count_documents({})
        
        # Votos por hora
        pipeline = [
            {
                "$project": {
                    "hour": {
                        "$hour": {
                            "date": "$timestamp",
                            "timezone": APP_TIMEZONE
                        }
                    }
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
        
        # Horário de pico
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
        _face_embedding_cache.clear()
        
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
    return {"message": "API de Votação - XXI Feira Tecnológica Fucapi"}

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
    await ensure_indexes()
    await warmup_face_model()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
