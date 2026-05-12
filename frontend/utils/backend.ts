import { Platform } from 'react-native';
import Constants from 'expo-constants';

const normalizeUrl = (url: string) => url.replace(/\/+$/, '');

const isUsableHost = (host: string) =>
  !!host && host !== '127.0.0.1' && host !== 'localhost';

const extractHostFromAddress = (value?: string | null) => {
  if (!value) return null;

  const cleaned = value
    .replace(/^https?:\/\//, '')
    .replace(/^exp(?:\+[^:]+)?:\/\//, '');
  const hostPort = cleaned.split('/')[0];
  const host = hostPort.split(':')[0];

  return isUsableHost(host) ? host : null;
};

const resolveExpoHost = () => {
  const manifest = Constants.manifest as
    | { debuggerHost?: string; hostUri?: string }
    | null
    | undefined;
  const expoGoConfig = (Constants as unknown as {
    expoGoConfig?: { debuggerHost?: string; hostUri?: string };
  }).expoGoConfig;

  return (
    extractHostFromAddress(manifest?.debuggerHost) ||
    extractHostFromAddress(manifest?.hostUri) ||
    extractHostFromAddress(expoGoConfig?.debuggerHost) ||
    extractHostFromAddress(expoGoConfig?.hostUri)
  );
};

const resolveDefaultBackendUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8001`;
  }

  const expoHost = resolveExpoHost();
  if (expoHost) {
    return `http://${expoHost}:8001`;
  }

  return 'http://127.0.0.1:8001';
};

export const BACKEND_URL = normalizeUrl(
  process.env.EXPO_PUBLIC_BACKEND_URL || resolveDefaultBackendUrl()
);
