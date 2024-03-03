import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import axios from 'axios';
import {
  rsaDecrypt,
  symDecrypt,
  exportPrvKey,
  exportPubKey,
  generateRsaKeyPair
} from "../crypto";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;

  const { publicKey, privateKey} = await generateRsaKeyPair();
  const pubKey = await exportPubKey(publicKey);

  onionRouter.get("/status", (req, res) => {
    res.status(200).send('live');
  });

  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  onionRouter.get("/getPrivateKey", async (req, res) => {
    const prvKey = await exportPrvKey(privateKey);
    return res.json({ result: prvKey });
  });

  onionRouter.post('/message', async (req, res) => {
    const { message } = req.body;

    try {
      const encryptedKey = message.slice(0, 344);
      const restMessage = message.slice(344);

      const decryptedsymKey = await rsaDecrypt(encryptedKey, privateKey);
      const decryptedContent = await symDecrypt(decryptedsymKey, restMessage);

      const destinationId = parseInt(decryptedContent.slice(0, 10), 10);
      const originalMessage = decryptedContent.slice(10);

      lastMessageDestination = destinationId;
      lastReceivedEncryptedMessage = message;
      lastReceivedDecryptedMessage = originalMessage;

      await axios.post(`http://localhost:${lastMessageDestination}/message`, {
        message: originalMessage
      });
      res.status(200).send("success");
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).send("Error processing message.");
    }
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, {
    nodeId: nodeId,
    pubKey: pubKey
  });

  return server;
}
