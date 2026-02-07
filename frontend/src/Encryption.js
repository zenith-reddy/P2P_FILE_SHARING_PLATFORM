
let keyPair=null;
let localPublicKey=null;
let remotePublicKey=null;
export let sessionKey=null;




export async function setpair(){
    keyPair=await generateECDHPair();
    return keyPair;
}
export async function setPublicKey(){
     if (!keyPair) throw new Error("KeyPair not created yet");

  localPublicKey = await exportPublicKey(keyPair.publicKey);
  return localPublicKey;
}
export async function setsharedpublicKey(socketRemotePublicKey){
   remotePublicKey = await importRemotePublicKey(socketRemotePublicKey);
  return remotePublicKey;
}

export async function setSessionKey(){
  if (!keyPair || !remotePublicKey) {
    throw new Error("KeyPair or Remote Public Key missing");
  }

  sessionKey = await deriveSessionKey(
    keyPair.privateKey,
    remotePublicKey
  );

  return sessionKey;
}


//start of the real functions


//generate the key.pair - > start of session
export async function generateECDHPair() {
  return await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false, // priv -> secret manam share cheyyadhu , pub -> shareable
    ["deriveKey"],
  );
}

//export public key
export async function exportPublicKey(publicKey) {
  const rawKey = await crypto.subtle.exportKey("raw", publicKey);
  return new Uint8Array(rawKey);
}


//import others public to me
export async function importRemotePublicKey(rawKey) {
  return await crypto.subtle.importKey(
    "raw",
    rawKey.buffer,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false,
    []
  );
}

//shared Aes session key ===session key created 
export async function deriveSessionKey(
  myPrivateKey,
  remotePublicKey
) {
  return await crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: remotePublicKey,
    },
    myPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // key not extractable
    ["encrypt", "decrypt"]
  );
}


