import { useEffect, useState, useRef } from 'react';
import { exchangeCode, saveTokens } from '../lib/spotify.js';

export default function Callback() {
  const [status, setStatus] = useState('working'); // working | done | error
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return; // never exchange the same code twice
    attempted.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const err = params.get('error');

    if (err || !code) {
      setStatus('error');
      return;
    }

    exchangeCode(code)
      .then((tokens) => {
        saveTokens(tokens);
        setStatus('done');
        window.location.replace('/');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="landing">
      <p className="id-line">spotify</p>
      <h1 className="handle">
        {status === 'working' && 'connecting…'}
        {status === 'done' && 'connected'}
        {status === 'error' && 'connection failed'}
      </h1>
      {status === 'error' && (
        <p className="tagline">something went wrong. <a href="/">go back</a> and try again.</p>
      )}
    </div>
  );
}
