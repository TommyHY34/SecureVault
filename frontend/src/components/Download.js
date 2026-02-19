import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { importKey, decryptFile, isWebCryptoSupported, formatFileSize } from '../utils/crypto';

const Download = () => {
  const { id } = useParams();
  const [status, setStatus] = useState('loading'); // loading | ready | downloading | success | error | expired
  const [fileInfo, setFileInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        // Vérifier que la clé est présente dans le fragment URL
        const keyFragment = window.location.hash.slice(1);
        if (!keyFragment) {
          setErrorMessage('Lien invalide : la clé de déchiffrement est manquante.');
          setStatus('error');
          return;
        }

        const response = await axios.get(`/api/file/${id}/info`);
        setFileInfo(response.data);
        setStatus('ready');
      } catch (err) {
        if (err.response?.status === 404) {
          setErrorMessage('Ce fichier n\'existe pas ou a déjà été supprimé.');
          setStatus('expired');
        } else if (err.response?.status === 410) {
          setErrorMessage(err.response.data.message || 'Ce fichier a expiré.');
          setStatus('expired');
        } else {
          setErrorMessage('Impossible de récupérer les informations du fichier.');
          setStatus('error');
        }
      }
    };

    fetchInfo();
  }, [id]);

  const handleDownload = async () => {
    if (!isWebCryptoSupported()) {
      setErrorMessage('Votre navigateur ne supporte pas le déchiffrement. Utilisez Chrome, Firefox ou Edge récent.');
      setStatus('error');
      return;
    }

    try {
      setStatus('downloading');
      setProgress(10);

      // Récupérer la clé depuis le fragment URL
      const keyFragment = window.location.hash.slice(1);
      const key = await importKey(keyFragment);
      setProgress(20);

      // Télécharger le fichier chiffré
      const response = await axios.get(`/api/download/${id}`, {
        responseType: 'blob',
        onDownloadProgress: (e) => {
          if (e.total) {
            const percent = Math.round((e.loaded / e.total) * 60);
            setProgress(20 + percent);
          }
        }
      });
      setProgress(80);

      // Déchiffrer le fichier côté client
      const encryptedBlob = response.data;
      const decryptedBlob = await decryptFile(encryptedBlob, key);
      setProgress(95);

      // Récupérer le nom original (enlever l'extension .enc ajoutée)
      let filename = fileInfo?.originalFilename || 'fichier_telecharge';
      if (filename.endsWith('.enc')) {
        filename = filename.slice(0, -4);
      }

      // Déclencher le téléchargement dans le navigateur
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatus('success');

    } catch (err) {
      console.error('Erreur download:', err);
      if (err.message?.includes('clé') || err.message?.includes('corrompu')) {
        setErrorMessage('Clé de déchiffrement invalide. Le lien est peut-être incomplet.');
      } else if (err.response?.status === 410) {
        setErrorMessage('Ce fichier a expiré ou a déjà été téléchargé le nombre maximum de fois.');
        setStatus('expired');
        return;
      } else {
        setErrorMessage(err.response?.data?.message || err.message || 'Erreur lors du téléchargement.');
      }
      setStatus('error');
    }
  };

  // Affichage selon l'état
  if (status === 'loading') {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Vérification du fichier...</p>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
          <h3 style={{ color: '#e53935' }}>Fichier indisponible</h3>
          <p style={{ color: '#666' }}>{errorMessage}</p>
          <a href="/" style={linkStyle}>← Partager un fichier</a>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h3 style={{ color: '#388e3c' }}>Fichier téléchargé et déchiffré !</h3>
          <p style={{ color: '#555' }}>Le déchiffrement a été effectué localement dans votre navigateur.</p>
          <a href="/" style={linkStyle}>← Partager un fichier</a>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>📥 Télécharger un fichier</h2>

      {(status === 'ready' || status === 'downloading') && fileInfo && (
        <div style={{ background: '#f5f5f5', borderRadius: '10px', padding: '1.2rem', marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>📄 Fichier :</strong>{' '}
            {fileInfo.originalFilename?.endsWith('.enc')
              ? fileInfo.originalFilename.slice(0, -4)
              : fileInfo.originalFilename}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>📦 Taille :</strong> {formatFileSize(fileInfo.fileSize)}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>📥 Téléchargements restants :</strong> {fileInfo.remainingDownloads}
          </div>
          <div>
            <strong>⏱️ Expire :</strong> {new Date(fileInfo.expiresAt).toLocaleString('fr-FR')}
          </div>
        </div>
      )}

      {status === 'downloading' && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ textAlign: 'center', color: '#555' }}>
            {progress < 80 ? '⬇️ Téléchargement...' : '🔓 Déchiffrement...'}
          </p>
          <div style={{ background: '#eee', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ height: '8px', width: `${progress}%`, background: 'linear-gradient(90deg, #43a047, #1de9b6)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{ background: '#ffebee', border: '1px solid #f44336', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', color: '#c62828' }}>
          ❌ {errorMessage}
        </div>
      )}

      {(status === 'ready' || status === 'error') && (
        <button
          onClick={handleDownload}
          disabled={status === 'downloading'}
          style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #43a047, #1b5e20)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🔓 Télécharger & Déchiffrer
        </button>
      )}

      <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '10px', marginTop: '1.5rem', fontSize: '0.85rem', color: '#2e7d32' }}>
        <strong>🔐 Sécurité :</strong> Le déchiffrement s'effectue <strong>localement</strong> dans votre navigateur. La clé n'est jamais envoyée au serveur.
      </div>
    </div>
  );
};

const cardStyle = {
  background: 'white',
  padding: '3rem',
  borderRadius: '20px',
  maxWidth: '620px',
  margin: '0 auto',
  boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
};

const linkStyle = {
  display: 'inline-block',
  marginTop: '1.5rem',
  padding: '0.7rem 1.5rem',
  background: '#2196f3',
  color: 'white',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 'bold'
};

export default Download;
