import React, { useState, useRef } from 'react';
import axios from 'axios';
import { generateKey, exportKey, encryptFile, isWebCryptoSupported, formatFileSize } from '../utils/crypto';

const Upload = () => {
  const [status, setStatus] = useState('idle');
  const [selectedFile, setSelectedFile] = useState(null);
  const [maxDownloads, setMaxDownloads] = useState(1);
  const [expiryHours, setExpiryHours] = useState(24);
  const [shareLink, setShareLink] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setStatus('idle');
      setErrorMessage('');
      setShareLink('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setStatus('idle');
      setErrorMessage('');
      setShareLink('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { setErrorMessage('Veuillez sélectionner un fichier.'); return; }
    if (!isWebCryptoSupported()) {
      setErrorMessage('Votre navigateur ne supporte pas le chiffrement. Utilisez Chrome, Firefox ou Edge récent.');
      return;
    }

    try {
      setStatus('encrypting');
      setProgress(10);
      const key = await generateKey();
      const exportedKey = await exportKey(key);

      setProgress(30);
      const encryptedBlob = await encryptFile(selectedFile, key);
      setProgress(60);

      setStatus('uploading');
      const formData = new FormData();
      formData.append('file', encryptedBlob, selectedFile.name + '.enc');
      formData.append('maxDownloads', maxDownloads);
      formData.append('expiryHours', expiryHours);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded / e.total) * 30);
          setProgress(60 + percent);
        }
      });

      setProgress(100);
      const fileId = response.data.id;
      const link = `${window.location.origin}/download/${fileId}#${exportedKey}`;
      setShareLink(link);
      setStatus('success');

    } catch (err) {
      console.error('Erreur upload:', err);
      const msg = err.response?.data?.message || err.message || 'Erreur inconnue';
      setErrorMessage(`Erreur : ${msg}`);
      setStatus('error');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = shareLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
    alert('Lien copié dans le presse-papiers !');
  };

  const reset = () => {
    setStatus('idle'); setSelectedFile(null); setShareLink('');
    setErrorMessage(''); setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLoading = status === 'encrypting' || status === 'uploading';

  return (
    <div style={{ background:'white', padding:'3rem', borderRadius:'20px', maxWidth:'620px', margin:'0 auto', boxShadow:'0 4px 24px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom:'1.5rem', textAlign:'center' }}>📤 Partager un fichier</h2>

      {status !== 'success' && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{ border:'2px dashed #2196f3', borderRadius:'12px', padding:'2rem', textAlign:'center', cursor:'pointer', background: selectedFile ? '#e8f5e9' : '#f0f7ff', marginBottom:'1.5rem' }}
          >
            <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>{selectedFile ? '✅' : '📁'}</div>
            {selectedFile ? (
              <>
                <strong>{selectedFile.name}</strong>
                <p style={{ margin:'0.25rem 0 0', color:'#666' }}>{formatFileSize(selectedFile.size)}</p>
              </>
            ) : (
              <p style={{ margin:0, color:'#555' }}>Glissez un fichier ici ou <span style={{ color:'#2196f3' }}>cliquez pour sélectionner</span></p>
            )}
            <input ref={fileInputRef} type="file" onChange={handleFileChange} style={{ display:'none' }} />
          </div>

          <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem' }}>
            <div style={{ flex:1 }}>
              <label style={{ display:'block', marginBottom:'0.4rem', fontWeight:600 }}>📥 Téléchargements max</label>
              <select value={maxDownloads} onChange={(e) => setMaxDownloads(parseInt(e.target.value))} disabled={isLoading}
                style={{ width:'100%', padding:'0.6rem', borderRadius:'8px', border:'1px solid #ccc' }}>
                <option value={1}>1 fois</option>
                <option value={3}>3 fois</option>
                <option value={5}>5 fois</option>
                <option value={10}>10 fois</option>
              </select>
            </div>
            <div style={{ flex:1 }}>
              <label style={{ display:'block', marginBottom:'0.4rem', fontWeight:600 }}>⏱️ Expiration</label>
              <select value={expiryHours} onChange={(e) => setExpiryHours(parseInt(e.target.value))} disabled={isLoading}
                style={{ width:'100%', padding:'0.6rem', borderRadius:'8px', border:'1px solid #ccc' }}>
                <option value={1}>1 heure</option>
                <option value={6}>6 heures</option>
                <option value={24}>24 heures</option>
                <option value={72}>3 jours</option>
                <option value={168}>7 jours</option>
              </select>
            </div>
          </div>

          {isLoading && (
            <div style={{ marginBottom:'1rem' }}>
              <p style={{ textAlign:'center', marginBottom:'0.5rem', color:'#555' }}>
                {status === 'encrypting' ? '🔐 Chiffrement en cours...' : '📤 Upload en cours...'}
              </p>
              <div style={{ background:'#eee', borderRadius:'8px', overflow:'hidden' }}>
                <div style={{ height:'8px', width:`${progress}%`, background:'linear-gradient(90deg, #2196f3, #21cbf3)', transition:'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ background:'#ffebee', border:'1px solid #f44336', borderRadius:'8px', padding:'1rem', marginBottom:'1rem', color:'#c62828' }}>
              ❌ {errorMessage}
            </div>
          )}

          <button onClick={handleUpload} disabled={!selectedFile || isLoading}
            style={{ width:'100%', padding:'1rem', background:(!selectedFile || isLoading) ? '#bbb' : 'linear-gradient(135deg, #667eea, #764ba2)', color:'white', border:'none', borderRadius:'10px', fontSize:'1.1rem', fontWeight:'bold', cursor:(!selectedFile || isLoading) ? 'not-allowed' : 'pointer' }}>
            {isLoading ? '⏳ Traitement...' : '🔐 Chiffrer & Partager'}
          </button>
        </>
      )}

      {status === 'success' && (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>✅</div>
          <h3 style={{ color:'#388e3c', marginBottom:'1rem' }}>Fichier partagé avec succès !</h3>
          <p style={{ color:'#555', marginBottom:'1rem' }}>
            Partagez ce lien. La clé de déchiffrement est dans le fragment URL (#) et <strong>n'est jamais transmise au serveur</strong>.
          </p>
          <div style={{ background:'#f5f5f5', border:'1px solid #ddd', borderRadius:'8px', padding:'1rem', wordBreak:'break-all', fontSize:'0.8rem', marginBottom:'1rem', textAlign:'left', color:'#333' }}>
            {shareLink}
          </div>
          <div style={{ display:'flex', gap:'1rem' }}>
            <button onClick={copyLink} style={{ flex:1, padding:'0.8rem', background:'#2196f3', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' }}>
              📋 Copier le lien
            </button>
            <button onClick={reset} style={{ flex:1, padding:'0.8rem', background:'#eee', color:'#333', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' }}>
              ↩️ Nouveau fichier
            </button>
          </div>
        </div>
      )}

      <div style={{ background:'#e3f2fd', padding:'1rem', borderRadius:'10px', marginTop:'1.5rem', fontSize:'0.85rem', color:'#1565c0' }}>
        <strong>🔐 Sécurité :</strong> Chiffrement AES-256-GCM côté client • Zero-knowledge • Éphémère
      </div>
    </div>
  );
};

export default Upload;
