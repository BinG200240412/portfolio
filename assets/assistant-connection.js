/* Future connection boundary only. No endpoint, credentials or model is configured here.
 * reply() always resolves to not_connected / ok / error / aborted. */
(() => {
  'use strict';
  const ABORTED = Symbol('aborted');
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
    if (result?.status === 'error' && typeof result.error?.code === 'string') {
      const httpStatus = result.error.httpStatus;
      const extra = Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? { httpStatus } : {};
      return failure(result.error.code, typeof result.error.message === 'string' ? result.error.message : 'The assistant service could not complete the request.', extra);
    }
    if (result?.status === 'ok' && result.message?.role === 'assistant' &&
        typeof result.message.content === 'string' && result.message.content.trim()) {
      return { status: 'ok', message: { role: 'assistant', content: result.message.content } };
    }
    return failure('invalid_response', 'The assistant service returned an unsupported response.');
  }

  async function requestEndpoint(endpoint, messages, signal) {
    const response = await fetch(endpoint, {
      method: 'POST', credentials: 'same-origin', redirect: 'error', signal,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ version: 1, messages }),
    });
    if (!response.ok) return failure('http_error', 'The assistant service is unavailable.', { httpStatus: response.status });
    try { return await response.json(); }
    catch (_) { return failure('invalid_response', 'The assistant service did not return valid JSON.'); }
  }

  async function reply(messages, options = {}) {
    const signal = options?.signal;
    if (signal && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function' || typeof signal.aborted !== 'boolean')) {
      return failure('invalid_signal', 'signal must be an AbortSignal.');
    }
    if (signal?.aborted) return { status: 'aborted' };
    const current = connection;
    // The shipped preview stops here: no network request and no invented answer.
    if (current.mode === 'not_connected') return { status: 'not_connected' };
    if (!Array.isArray(messages) || !messages.length || messages.some(message =>
      !message || !['user', 'assistant'].includes(message.role) ||
      typeof message.content !== 'string' || !message.content.trim())) {
      return failure('invalid_messages', 'messages must contain user/assistant roles and non-empty text content.');
    }
    const history = messages.map(({ role, content }) => ({ role, content }));
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
          : requestEndpoint(current.endpoint, history, signal);
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

  window.PortfolioAssistantConnection = Object.freeze({
    get mode() { return connection.mode; },
    configure, reply,
  });
})();
