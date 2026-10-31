/* Public transport only. Model credentials and portfolio instructions stay on the server.
 * Remains disconnected until configure() or configureHosted() is explicitly called. */
(() => {
  'use strict';
  const ABORTED = Symbol('aborted');
  const HOSTED_BASE = 'https://ai.bing2002.com/portfolio-ai/';
  const HOSTED_ORIGINS = new Set(['https://bing2002.com', 'https://www.bing2002.com']);
  const DEADLINE_MS = 22000;
  const VOICE_DEADLINE_MS = 40000;
  const MAX_WAV_BYTES = 640044;
  let connection = Object.freeze({ mode: 'not_connected' });
  const failure = (code, message, extra = {}) => ({ status: 'error', error: { code, message, ...extra } });

  function configure(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Expected a connection configuration object.');
    if (Object.keys(options).some(key => key !== 'endpoint' && key !== 'transport')) throw new TypeError('Only endpoint or transport can be configured.');
    const hasEndpoint = options.endpoint != null, hasTransport = options.transport != null;
    if (hasEndpoint && hasTransport) throw new TypeError('Configure either endpoint or transport, not both.');
    if (!hasEndpoint && !hasTransport) connection = Object.freeze({ mode: 'not_connected' });
    else if (hasTransport) {
      if (typeof options.transport !== 'function') throw new TypeError('transport must be a function.');
      connection = Object.freeze({ mode: 'transport', transport: options.transport });
    } else {
      if (typeof options.endpoint !== 'string' || !options.endpoint.trim()) throw new TypeError('endpoint must be a same-origin URL.');
      const url = new URL(options.endpoint, location.href);
      if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin || url.username || url.password || url.hash) {
        throw new TypeError('endpoint must be an HTTP(S) URL on this origin, without credentials or a fragment.');
      }
      connection = Object.freeze({ mode: 'endpoint', endpoint: url.href });
    }
    return Object.freeze({ mode: connection.mode });
  }

  function normalizeResult(result) {
    if (result?.status === 'not_connected') return { status: 'not_connected' };
    if (result?.status === 'aborted') return { status: 'aborted' };
    if (result?.status === 'error' && typeof result.error?.code === 'string' && result.error.code) {
      const httpStatus = result.error.httpStatus;
      const extra = Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? { httpStatus } : {};
      return failure(result.error.code, typeof result.error.message === 'string' ? result.error.message : 'The assistant service could not complete the request.', extra);
    }
    if (result?.status === 'ok' && result.message?.role === 'assistant' &&
        typeof result.message.content === 'string' && result.message.content.trim()) {
      return { status: 'ok', message: { role: 'assistant', content: result.message.content.trim() } };
    }
    return failure('invalid_response', 'The assistant service returned an unsupported response.');
  }

  // Keep complete recent turns. A failed send is never a committed user turn.
  function conversation(messages) {
    if (!Array.isArray(messages) || !messages.length || messages.length % 2 !== 1 || messages.some((message, index) =>
      !message || message.role !== (index % 2 === 0 ? 'user' : 'assistant') ||
      typeof message.content !== 'string' || !message.content.trim() ||
      (message.role === 'user' && message.content.trim().length > 1000))) return null;
    const recent = messages.slice(-7).map(({ role, content }) => ({ role, content: content.trim() }));
    let total = recent.reduce((sum, message) => sum + message.content.length, 0);
    while (total > 4000 && recent.length > 1) {
      total -= recent[0].content.length + recent[1].content.length;
      recent.splice(0, 2);
    }
    return recent;
  }

  async function postBody(endpoint, body, signal, credentials, extraHeaders = {}, contentType = 'application/json') {
    const response = await fetch(endpoint, {
      method: 'POST', credentials, cache: 'no-store', redirect: 'error', signal,
      headers: { 'Content-Type': contentType, 'Accept': 'application/json', ...extraHeaders },
      body,
    });
    let result;
    try { result = await response.json(); }
    catch (_) { return failure('invalid_response', 'The assistant service did not return valid JSON.', { httpStatus: response.status }); }
    if (result?.status === 'error') {
      const normalized = normalizeResult(result);
      if (normalized.status === 'error') normalized.error.httpStatus = response.status;
      return normalized;
    }
    if (!response.ok) return failure('http_error', 'The assistant service is unavailable.', { httpStatus: response.status });
    return result;
  }

  const postJSON = (endpoint, body, signal, credentials, headers) =>
    postBody(endpoint, JSON.stringify(body), signal, credentials, headers);

  function configureHosted() {
    if (!HOSTED_ORIGINS.has(location.origin)) throw new TypeError('The hosted assistant is only available on the production portfolio origin.');
    let csrfToken = '';
    async function hostedRequest(route, body, signal, contentType, timeout) {
      const deadline = new AbortController();
      let expired = false, cancel;
      const interrupted = new Promise(resolve => { cancel = resolve; });
      const abort = () => { deadline.abort(); cancel({ status: 'aborted' }); };
      signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => {
        expired = true; deadline.abort();
        cancel(failure('timeout', 'The assistant response timed out.'));
      }, timeout);
      if (signal?.aborted) abort();
      async function session() {
        const result = await postJSON(HOSTED_BASE + 'session', { version: 1 }, deadline.signal, 'include');
        if (result?.status === 'error') return result;
        if (result?.status !== 'ok' || typeof result.csrfToken !== 'string' ||
            !/^[A-Za-z0-9._~-]{16,512}$/.test(result.csrfToken)) {
          return failure('invalid_response', 'The assistant session response was invalid.');
        }
        csrfToken = result.csrfToken;
        return null;
      }
      async function send() {
        if (deadline.signal.aborted) return expired ? failure('timeout', 'The assistant response timed out.') : { status: 'aborted' };
        if (!csrfToken) {
          const error = await session();
          if (error) return error;
        }
        if (deadline.signal.aborted) return expired ? failure('timeout', 'The assistant response timed out.') : { status: 'aborted' };
        const post = () => postBody(HOSTED_BASE + route, body, deadline.signal, 'include', { 'X-CSRF-Token': csrfToken }, contentType);
        let result = await post();
        // Only this explicit pre-charge rejection is safe to retry automatically.
        if (result?.status === 'error' && result.error?.code === 'invalid_session') {
          csrfToken = '';
          if (deadline.signal.aborted) return expired ? failure('timeout', 'The assistant response timed out.') : { status: 'aborted' };
          const error = await session();
          if (error) return error;
          if (deadline.signal.aborted) return expired ? failure('timeout', 'The assistant response timed out.') : { status: 'aborted' };
          result = await post();
          if (result?.status === 'error' && result.error?.code === 'invalid_session') csrfToken = '';
        }
        return result;
      }
      try { return await Promise.race([send(), interrupted]); }
      catch (error) {
        if (expired) return failure('timeout', 'The assistant response timed out.');
        if (signal?.aborted || error?.name === 'AbortError') return { status: 'aborted' };
        return failure('network_error', 'The assistant service could not be reached.');
      } finally {
        clearTimeout(timer); signal?.removeEventListener('abort', abort);
      }
    }
    connection = Object.freeze({
      mode: 'transport',
      transport: (messages, { signal } = {}) => hostedRequest('chat', JSON.stringify({ version: 1, messages }), signal, 'application/json', DEADLINE_MS),
      audioTransport: (audio, { signal } = {}) => hostedRequest('transcribe', audio, signal, 'audio/wav', VOICE_DEADLINE_MS),
    });
    return Object.freeze({ mode: connection.mode });
  }

  async function reply(messages, options = {}) {
    const signal = options?.signal;
    if (signal && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function' || typeof signal.aborted !== 'boolean')) {
      return failure('invalid_signal', 'signal must be an AbortSignal.');
    }
    if (signal?.aborted) return { status: 'aborted' };
    const current = connection;
    if (current.mode === 'not_connected') return { status: 'not_connected' };
    const history = conversation(messages);
    if (!history) return failure('invalid_messages', 'Expected alternating user/assistant turns, ending with a question of at most 1000 characters.');
    let removeAbortListener = () => {};
    try {
      const cancelled = signal ? new Promise(resolve => {
        const abort = () => resolve(ABORTED);
        signal.addEventListener('abort', abort, { once: true });
        removeAbortListener = () => signal.removeEventListener('abort', abort);
        if (signal.aborted) abort();
      }) : null;
      const work = Promise.resolve().then(() => {
        if (signal?.aborted) return ABORTED;
        return current.mode === 'transport'
          ? current.transport(history, { signal })
          : postJSON(current.endpoint, { version: 1, messages: history }, signal, 'same-origin');
      });
      const result = cancelled ? await Promise.race([work, cancelled]) : await work;
      if (result === ABORTED || signal?.aborted) return { status: 'aborted' };
      return normalizeResult(result);
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') return { status: 'aborted' };
      return current.mode === 'transport'
        ? failure('transport_error', 'The assistant transport failed.')
        : failure('network_error', 'The assistant service could not be reached.');
    } finally { removeAbortListener(); }
  }

  async function transcribe(audio, options = {}) {
    const signal = options?.signal;
    if (signal && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function' || typeof signal.aborted !== 'boolean')) {
      return failure('invalid_signal', 'signal must be an AbortSignal.');
    }
    if (signal?.aborted) return { status: 'aborted' };
    const current = connection;
    if (typeof current.audioTransport !== 'function') return failure('voice_unavailable', 'Voice input is unavailable.');
    if (typeof Blob === 'undefined' || !(audio instanceof Blob) || audio.type !== 'audio/wav' || audio.size <= 44 || audio.size > MAX_WAV_BYTES) {
      return failure('invalid_audio', 'Expected a short PCM WAV recording.');
    }
    const result = await current.audioTransport(audio, { signal });
    if (signal?.aborted || result?.status === 'aborted') return { status: 'aborted' };
    if (result?.status === 'error') return normalizeResult(result);
    if (result?.status === 'ok' && typeof result.text === 'string' && result.text.trim() && result.text.length <= 1000) {
      return { status: 'ok', text: result.text.trim() };
    }
    return failure('invalid_response', 'The voice service returned an unsupported response.');
  }

  window.PortfolioAssistantConnection = Object.freeze({
    get mode() { return connection.mode; },
    get supportsVoice() { return typeof connection.audioTransport === 'function'; },
    configure, configureHosted, reply, transcribe,
  });
})();
