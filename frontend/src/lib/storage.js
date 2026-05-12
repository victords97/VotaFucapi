const ADMIN_KEY = 'admin_logged';
const FACE_IMAGE_KEY = 'pending_face_image';
const CAMERA_CONSENT_KEY = 'camera_lgpd_consent';

export function setAdminLoggedIn(value) {
  localStorage.setItem(ADMIN_KEY, value ? 'true' : 'false');
}

export function clearAdminLoggedIn() {
  localStorage.removeItem(ADMIN_KEY);
}

export function isAdminLoggedIn() {
  return localStorage.getItem(ADMIN_KEY) === 'true';
}

export function setPendingFaceImage(value) {
  sessionStorage.setItem(FACE_IMAGE_KEY, value);
}

export function getPendingFaceImage() {
  return sessionStorage.getItem(FACE_IMAGE_KEY) || '';
}

export function clearPendingFaceImage() {
  sessionStorage.removeItem(FACE_IMAGE_KEY);
}

export function setCameraConsentAccepted(value) {
  sessionStorage.setItem(CAMERA_CONSENT_KEY, value ? 'true' : 'false');
}

export function hasCameraConsentAccepted() {
  return sessionStorage.getItem(CAMERA_CONSENT_KEY) === 'true';
}

export function clearCameraConsentAccepted() {
  sessionStorage.removeItem(CAMERA_CONSENT_KEY);
}
