
let keyPair=null;
let localPublickey=null;
let remotePublickey=null;
let sessionKey=null;



//generate the key.pair - > start of session
export async function setpair(){
    keyPair=await generateECDHPair();
    return keyPair;
}
export function setpublickey(){
     if (!keyPair) throw new Error("KeyPair not created yet");

  localPublicKey = await exportPublicKey(keyPair.publicKey);
  return localPublicKey;
}
export function setsharedpublickey(socketremotePublickey){
   emotePublicKey = await importRemotePublicKey(socketRemotePublicKey);
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


