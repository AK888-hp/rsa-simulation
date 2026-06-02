import React, { useState } from 'react';
import { Shield, Network, User, Key, Lock, Unlock, FileText, Send, AlertTriangle, RefreshCw, Upload } from 'lucide-react';
import { isPrime, generateCustomRSAKeys, encryptCustomRSA, decryptCustomRSA } from './utils/crypto';
import './index.css';

export default function App() {
  // --- STATE ---
  
  // Bob State (Keys)
  const [pInput, setPInput] = useState("17");
  const [qInput, setQInput] = useState("19");
  const [customKeys, setCustomKeys] = useState(null);
  const [keyError, setKeyError] = useState("");

  // Alice State (Sender)
  const [fileContent, setFileContent] = useState("Hello INS Professor!");
  const [fileName, setFileName] = useState("Manual Text");
  const [encryptedData, setEncryptedData] = useState(null);
  const [encryptionMath, setEncryptionMath] = useState(null); 
  
  // Network State
  const [transferStatus, setTransferStatus] = useState('idle'); 
  const [showNetworkSpy, setShowNetworkSpy] = useState(false);

  // Bob State (Receiver)
  const [receivedEncryptedData, setReceivedEncryptedData] = useState(null);
  const [decryptedData, setDecryptedData] = useState(null);
  const [decryptionMath, setDecryptionMath] = useState(null);

  // Loading State
  const [isProcessing, setIsProcessing] = useState(false);

  // --- ACTIONS ---

  const handleReset = () => {
    setCustomKeys(null);
    setKeyError("");
    setEncryptedData(null);
    setEncryptionMath(null);
    setTransferStatus('idle');
    setShowNetworkSpy(false);
    setReceivedEncryptedData(null);
    setDecryptedData(null);
    setDecryptionMath(null);
    setFileContent("Hello INS Professor!");
    setFileName("Manual Text");
  };

  const handleGenerateKeys = () => {
    setKeyError("");
    if (!isPrime(pInput)) return setKeyError(`'${pInput}' is not a valid prime number.`);
    if (!isPrime(qInput)) return setKeyError(`'${qInput}' is not a valid prime number.`);
    
    try {
      const keys = generateCustomRSAKeys(pInput, qInput);
      setCustomKeys(keys);
    } catch (err) {
      setKeyError(err.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Increased size limit to 2MB to handle standard docs/images better
    if (file.size > 2000000) {
      alert("Please choose a file smaller than 2MB for browser performance.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target.result);
    };
    
    // Read plain text files as readable text for a better math demo, 
    // otherwise use Base64 Data URLs for binary files
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const handleEncrypt = () => {
    if (!customKeys) return;
    setIsProcessing(true);
    
    // We use a small timeout so the React UI can update to show the "Encrypting..." spinner
    // before the heavy math freezes the browser thread for large files.
    setTimeout(() => {
      try {
        const encrypted = encryptCustomRSA(fileContent, customKeys.e, customKeys.n);
        setEncryptedData(encrypted);
        
        // Show the detailed math for the first 5 characters
        const encArray = encrypted.split(',');
        const mathSteps = [];
        const limit = Math.min(5, fileContent.length);
        for (let i = 0; i < limit; i++) {
            const char = fileContent[i];
            const m = fileContent.charCodeAt(i);
            const c = encArray[i];
            mathSteps.push({ char, m, c });
        }
        setEncryptionMath(mathSteps);
      } catch (err) {
        alert("Encryption failed. Data might be corrupted.");
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handleSend = () => {
    setTransferStatus('transferring');
    setTimeout(() => {
      setReceivedEncryptedData(encryptedData);
      setTransferStatus('received');
    }, 6000); 
  };

  const handleDecrypt = () => {
    if (!receivedEncryptedData || !customKeys) return;
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const decrypted = decryptCustomRSA(receivedEncryptedData, customKeys.d, customKeys.n);
        setDecryptedData(decrypted);

        // Show detailed math for first 5 characters
        const encArray = receivedEncryptedData.split(',');
        const mathSteps = [];
        const limit = Math.min(5, decrypted.length);
        for (let i = 0; i < limit; i++) {
            const char = decrypted[i];
            const m = decrypted.charCodeAt(i);
            const c = encArray[i];
            mathSteps.push({ char, m, c });
        }
        setDecryptionMath(mathSteps);
      } catch (err) {
        alert("Decryption failed. Data might be corrupted.");
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  // Helper
  const truncate = (str, len = 40) => {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  return (
    <div className="min-h-screen">
      <header className="header" style={{ position: 'relative' }}>
        <h1>RSA Math & File Transfer Simulation</h1>
        <p style={{ color: 'var(--text-secondary)' }}>RSA Simulation for File Transfer using Custom Primes</p>
        <button 
          className="btn" 
          onClick={handleReset} 
          style={{ position: 'absolute', right: '30px', top: '35px', borderColor: 'var(--accent-red)' }}
        >
          <RefreshCw size={16} /> Reset Simulation
        </button>
      </header>

      <div className="simulation-container">
        
        {/* --- ALICE (SENDER) --- */}
        <div className="column glass-panel">
          <div className="column-header">
            <User color="var(--accent-blue)" size={24} />
            <h2>Alice (Sender)</h2>
          </div>
          
          <div className="column-content">
            <div>
              <span className="label">Step 2: Enter Text or Upload File</span>
              <textarea 
                className="input-field" 
                value={fileContent}
                onChange={(e) => {
                  setFileContent(e.target.value);
                  if (fileName !== "Manual Text") {
                    setFileName("Manual Text (Edited File)");
                  }
                }}
                disabled={encryptedData !== null || isProcessing}
                style={{ height: '80px', marginBottom: '10px' }}
              />
              
              {!encryptedData && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label className="btn" style={{ flex: 1, cursor: 'pointer', justifyContent: 'center' }}>
                    <Upload size={16} /> Upload File
                    {/* onClick clears value so uploading the same file twice triggers onChange */}
                    <input type="file" style={{ display: 'none' }} onClick={(e) => (e.target.value = null)} onChange={handleFileUpload} />
                  </label>
                  {fileName !== "Manual Text" && (
                    <button className="btn" onClick={() => { setFileName("Manual Text"); setFileContent(""); }} title="Clear File">✕</button>
                  )}
                </div>
              )}
              {fileName !== "Manual Text" && <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '5px' }}>File loaded: {truncate(fileName, 25)}</div>}
            </div>

            {customKeys && (
              <div className="glass-panel" style={{ padding: '15px', background: 'rgba(0,0,0,0.4)', marginTop: '10px' }}>
                <span className="label" style={{ color: 'var(--accent-blue)' }}>
                  <Key size={14} style={{ display: 'inline', marginRight: '5px' }} /> 
                  Bob's Public Key Received
                </span>
                <div style={{ fontSize: '13px', color: 'var(--accent-blue)', marginBottom: '10px' }}>
                  n = {customKeys.n} <br/> e = {customKeys.e}
                </div>
                
                {!encryptedData ? (
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '5px' }} onClick={handleEncrypt} disabled={isProcessing}>
                    {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Lock size={16} />} 
                    {isProcessing ? " Encrypting (Please Wait)..." : " Encrypt Data"}
                  </button>
                ) : (
                  <div style={{ marginTop: '15px' }}>
                    <span className="label" style={{ color: 'var(--accent-green)' }}>Encryption Complete!</span>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '5px 0' }}>Ciphertext Array:</p>
                    <div className="code-block small" style={{ marginBottom: '10px' }}>{truncate(encryptedData, 60)}</div>
                    
                    <div className="glass-panel" style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', marginBottom: '15px' }}>
                      <span className="label" style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>Encryption Breakdown (First 5 Bytes):</span>
                      <table style={{ width: '100%', fontSize: '12px', color: 'var(--text-primary)', textAlign: 'left', marginTop: '5px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                            <th style={{ paddingBottom: '4px' }}>Char</th><th style={{ paddingBottom: '4px' }}>M (ASCII)</th><th style={{ paddingBottom: '4px' }}>Formula (M^e mod n)</th><th style={{ paddingBottom: '4px' }}>C (Cipher)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {encryptionMath && Array.isArray(encryptionMath) && encryptionMath.map((step, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '4px 0', color: 'var(--accent-green)' }}>'{step.char}'</td>
                              <td style={{ padding: '4px 0' }}>{step.m}</td>
                              <td style={{ padding: '4px 0', color: 'var(--accent-purple)' }}>{step.m}^{customKeys.e} mod {customKeys.n}</td>
                              <td style={{ padding: '4px 0', color: 'var(--accent-red)' }}>{step.c}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {transferStatus === 'idle' && (
                      <button className="btn btn-primary animate-glow" style={{ width: '100%' }} onClick={handleSend}>
                        <Send size={16} /> Send to Bob
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {!customKeys && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Waiting for Bob to generate keys...
              </div>
            )}
          </div>
        </div>

        {/* --- NETWORK --- */}
        <div className="column glass-panel" style={{ border: '1px dashed var(--accent-red)' }}>
          <div className="column-header" style={{ justifyContent: 'center' }}>
            <Network color="var(--accent-red)" size={24} />
            <h2>The Internet</h2>
          </div>
          
          <div className="column-content" style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            
            {transferStatus === 'idle' && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px' }}>
                Network is idle. Waiting for transmission.
              </p>
            )}

            {transferStatus === 'transferring' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div className="animate-glow" style={{ 
                  width: '60px', height: '60px', borderRadius: '50%', 
                  background: 'rgba(255, 51, 102, 0.2)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', border: '2px solid var(--accent-red)' 
                }}>
                  <FileText color="var(--accent-red)" size={30} />
                </div>
                <p style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>Transmitting Data...</p>
                
                <button className="btn btn-danger" onClick={() => setShowNetworkSpy(true)}>
                  <AlertTriangle size={16} /> Intercept Data (Eve)
                </button>
              </div>
            )}

            {showNetworkSpy && (
              <div className="glass-panel" style={{ padding: '15px', background: 'rgba(255, 0, 0, 0.1)', width: '100%' }}>
                <span className="label" style={{ color: 'var(--accent-red)' }}>Eve's Intercepted Data</span>
                <p style={{ fontSize: '12px', marginBottom: '4px' }}>Raw Ciphertext Array:</p>
                <div className="code-block small" style={{ color: 'var(--accent-red)' }}>{truncate(encryptedData, 100)}</div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px', textAlign: 'center' }}>
                  *Useless without Bob's 'd' key*
                </p>
              </div>
            )}

            {transferStatus === 'received' && (
              <div style={{ textAlign: 'center', color: 'var(--accent-green)' }}>
                <Shield size={40} style={{ margin: '0 auto 10px' }} />
                <p>Transfer Complete.</p>
              </div>
            )}
          </div>
        </div>

        {/* --- BOB (RECEIVER) --- */}
        <div className="column glass-panel">
          <div className="column-header">
            <User color="var(--accent-green)" size={24} />
            <h2>Bob (Receiver)</h2>
          </div>
          
          <div className="column-content">
            
            <div className="glass-panel" style={{ padding: '15px', background: 'rgba(0,0,0,0.3)', border: customKeys ? '1px solid var(--accent-green)' : '1px solid var(--panel-border)' }}>
              <span className="label">Step 1: Generate Keys</span>
              
              {!customKeys ? (
                <>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Prime p:</label>
                      <input type="text" className="input-field" value={pInput} onChange={(e) => setPInput(e.target.value.replace(/\D/g,''))} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Prime q:</label>
                      <input type="text" className="input-field" value={qInput} onChange={(e) => setQInput(e.target.value.replace(/\D/g,''))} />
                    </div>
                  </div>
                  
                  {keyError && <p style={{ color: 'var(--accent-red)', fontSize: '12px', marginTop: '-10px', marginBottom: '10px' }}>{keyError}</p>}
                  
                  <button className="btn btn-success" style={{ width: '100%' }} onClick={handleGenerateKeys}>
                    Calculate RSA Math
                  </button>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>* p × q must be &gt; 255 (e.g. 17 and 19)</p>
                </>
              ) : (
                <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Given Primes: p={pInput}, q={qInput}</div>
                  <hr style={{ borderColor: 'var(--panel-border)', margin: '8px 0' }} />
                  <div style={{ color: 'var(--accent-blue)' }}><strong>Public Key:</strong></div>
                  <div>1. Modulus (n = p×q): <strong>{customKeys.n}</strong></div>
                  <div>2. Phi (φ = (p-1)×(q-1)): <strong>{customKeys.phi}</strong></div>
                  <div>3. Public Exp (e): <strong>{customKeys.e}</strong></div>
                  <hr style={{ borderColor: 'var(--panel-border)', margin: '8px 0' }} />
                  <div style={{ color: 'var(--accent-red)' }}><strong>Private Key:</strong></div>
                  <div>4. Private Exp (d): <strong>{customKeys.d}</strong></div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>d = (e⁻¹) mod n</div>
                </div>
              )}
            </div>

            {transferStatus === 'received' && !decryptedData && (
              <div className="glass-panel animate-glow" style={{ padding: '15px', background: 'rgba(0, 255, 102, 0.1)' }}>
                <span className="label" style={{ color: 'var(--accent-blue)' }}>Ciphertext Received</span>
                <button className="btn btn-success" style={{ width: '100%', marginTop: '10px' }} onClick={handleDecrypt} disabled={isProcessing}>
                  {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Unlock size={16} />} 
                  {isProcessing ? " Decrypting..." : " Decrypt with Math"}
                </button>
              </div>
            )}

            {decryptedData && (
              <div className="glass-panel" style={{ padding: '15px', background: 'rgba(0, 255, 102, 0.1)', borderColor: 'var(--accent-green)' }}>
                <span className="label" style={{ color: 'var(--accent-green)' }}>Decryption Successful!</span>
                
                <div className="glass-panel" style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', margin: '10px 0' }}>
                  <span className="label" style={{ fontSize: '10px', color: 'var(--accent-green)' }}>Decryption Breakdown (First 5 Bytes):</span>
                  <table style={{ width: '100%', fontSize: '12px', color: 'var(--text-primary)', textAlign: 'left', marginTop: '5px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                        <th style={{ paddingBottom: '4px' }}>C (Cipher)</th><th style={{ paddingBottom: '4px' }}>Formula (C^d mod n)</th><th style={{ paddingBottom: '4px' }}>M (ASCII)</th><th style={{ paddingBottom: '4px' }}>Char</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decryptionMath && Array.isArray(decryptionMath) && decryptionMath.map((step, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '4px 0', color: 'var(--accent-red)' }}>{step.c}</td>
                          <td style={{ padding: '4px 0', color: 'var(--accent-purple)' }}>{step.c}^{customKeys.d} mod {customKeys.n}</td>
                          <td style={{ padding: '4px 0' }}>{step.m}</td>
                          <td style={{ padding: '4px 0', color: 'var(--accent-green)' }}>'{step.char}'</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Recovered Data:</p>
                {fileName !== "Manual Text" ? (
                  <div style={{ textAlign: 'center' }}>
                     <p style={{ fontSize: '13px', color: 'var(--accent-green)' }}>File successfully recovered!</p>
                     <a href={decryptedData} download={fileName} className="btn btn-success" style={{ marginTop: '10px' }}>
                        Download Decrypted File
                     </a>
                  </div>
                ) : (
                  <textarea 
                    className="input-field" 
                    value={decryptedData}
                    readOnly
                    style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'var(--accent-green)', height: '60px' }}
                  />
                )}
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}
