import React, { useCallback, useEffect, useState } from 'react';
import {
  exchangeFeishuOAuthCode,
  FEISHU_TOKEN_STORAGE_KEY,
  getFeishuAuthStatus,
  getFeishuMe,
} from '../services/apiService';
import { t } from '../utils/i18n';
import type { Language } from '../types';

const feishuCodePromises = new Map<string, Promise<void>>();

function readLang(): Language {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('nano_lang') : null;
  if (stored === 'en' || stored === 'zh') return stored;
  return 'zh';
}

function redirectUriForOAuth(): string {
  const fromEnv = import.meta.env.VITE_FEISHU_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  return `${window.location.origin}/`;
}

function buildFeishuAuthorizeUrl(appId: string): string {
  const state = crypto.randomUUID();
  sessionStorage.setItem('nanolayer_feishu_oauth_state', state);
  const uri = redirectUriForOAuth();
  const u = new URL('https://accounts.feishu.cn/open-apis/authen/v1/authorize');
  u.searchParams.set('client_id', appId);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', uri);
  u.searchParams.set('state', state);
  u.searchParams.set('prompt', 'consent');
  return u.toString();
}

async function exchangeOAuthCodeOnce(code: string): Promise<void> {
  let p = feishuCodePromises.get(code);
  if (!p) {
    p = (async () => {
      try {
        const data = await exchangeFeishuOAuthCode(code);
        localStorage.setItem(FEISHU_TOKEN_STORAGE_KEY, data.access_token);
      } finally {
        feishuCodePromises.delete(code);
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
    })();
    feishuCodePromises.set(code, p);
  }
  await p;
}

interface Props {
  children: React.ReactNode;
}

/**
 * 当后端配置了 FEISHU_ALLOWED_TENANT_KEY 时，必须先完成飞书 OAuth 且租户校验通过才可进入应用。
 */
const FeishuLoginGate: React.FC<Props> = ({ children }) => {
  const [lang] = useState<Language>(() => readLang());
  const [phase, setPhase] = useState<'loading' | 'login' | 'app' | 'policy_error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [appId, setAppId] = useState<string>('');
  /** 预生成的授权 URL（原生 <a href> 跳转，避免线上仅有按钮点击无效的情况） */
  const [loginHref, setLoginHref] = useState<string | null>(null);

  const enterLoginPhase = useCallback((aid: string, message: string | null = null) => {
    const trimmed = aid.trim();
    setAuthRequired(true);
    setAppId(trimmed);
    setError(message);
    if (!trimmed) {
      setLoginHref(null);
      setPhase('login');
      return;
    }
    try {
      setLoginHref(buildFeishuAuthorizeUrl(trimmed));
    } catch (err: unknown) {
      setLoginHref(null);
      setError(err instanceof Error ? err.message : String(err));
    }
    setPhase('login');
  }, []);

  const bootstrap = useCallback(async () => {
    setError(null);
    setLoginHref(null);
    try {
      const status = await getFeishuAuthStatus();
      if (!status.authRequired) {
        setPhase('app');
        return;
      }

      const aid = (status.appId ?? '').trim();
      if (!aid) {
        setAuthRequired(true);
        setAppId('');
        setError(t(lang, 'feishuMissingAppId'));
        setLoginHref(null);
        setPhase('login');
        return;
      }
      setAppId(aid);

      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get('error');
      if (oauthError === 'access_denied') {
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
        enterLoginPhase(aid, t(lang, 'feishuAccessDenied'));
        return;
      }

      const code = params.get('code');
      const state = params.get('state');
      const expectedState = sessionStorage.getItem('nanolayer_feishu_oauth_state');

      if (code) {
        if (expectedState && state && state !== expectedState) {
          enterLoginPhase(aid, t(lang, 'feishuLoginStateError'));
          return;
        }
        if (state && expectedState) {
          sessionStorage.removeItem('nanolayer_feishu_oauth_state');
        }

        try {
          await exchangeOAuthCodeOnce(code);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          enterLoginPhase(aid, msg);
          return;
        }
      }

      const token = localStorage.getItem(FEISHU_TOKEN_STORAGE_KEY);
      if (!token) {
        enterLoginPhase(aid, null);
        return;
      }

      try {
        await getFeishuMe(15000);
      } catch (e: unknown) {
        localStorage.removeItem(FEISHU_TOKEN_STORAGE_KEY);
        const msg = e instanceof Error ? e.message : null;
        enterLoginPhase(aid, msg);
        return;
      }

      setPhase('app');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase('policy_error');
    }
  }, [lang, enterLoginPhase]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (phase === 'app') {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-950 text-slate-200 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="mb-2 flex items-center justify-center gap-2 text-blue-400">
          <i className="fa-solid fa-building-user text-2xl" aria-hidden />
        </div>
        <h1 className="text-center text-xl font-black tracking-tight text-white">
          {t(lang, 'feishuGateTitle')}
        </h1>
        <p className="mt-3 text-center text-sm text-slate-400 leading-relaxed">
          {authRequired ? t(lang, 'feishuGateSubtitle') : t(lang, 'feishuGateChecking')}
        </p>

        {phase === 'loading' && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}

        {phase === 'policy_error' && (
          <>
            {error && (
              <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPhase('loading');
                bootstrap();
              }}
              className="mt-8 w-full rounded-xl bg-slate-700 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-slate-600"
            >
              {t(lang, 'feishuRetry')}
            </button>
          </>
        )}

        {phase === 'login' && (
          <>
            {error && (
              <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            {loginHref ? (
              <a
                href={loginHref}
                rel="noopener noreferrer"
                className="mt-8 flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 text-center text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
              >
                {t(lang, 'feishuLoginButton')}
              </a>
            ) : (
              <p className="mt-8 text-center text-sm text-amber-400/90">{t(lang, 'feishuMissingAppId')}</p>
            )}
            <p className="mt-4 text-center text-[11px] text-slate-500 leading-relaxed">
              {t(lang, 'feishuRedirectHint')}
              <code className="block mt-2 break-all rounded bg-slate-950 px-2 py-1 text-slate-400">
                {redirectUriForOAuth()}
              </code>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FeishuLoginGate;
