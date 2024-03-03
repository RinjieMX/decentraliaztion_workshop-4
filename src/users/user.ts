import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT, BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import axios from 'axios';
import {
  createRandomSymmetricKey,
  rsaEncrypt,
  rsaDecrypt,
  symEncrypt,
  symDecrypt,
  exportSymKey,
  importPrvKey, importSymKey
} from "../crypto";
import { error } from 'console';
import { Node } from "../registry/registry";

export type SendMessageBody = {
  message: string | null;
  destinationUserId: number | null;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  let lastReceivedDecryptedMessage: string | null = null;
  let lastSentDecryptedMessage: string | null = null;
  let lastCircuit: Node[] = [];

  _user.get("/status", (req, res) => {
    res.status(200).send('live');
  });

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({result: lastSentDecryptedMessage });
  });

  _user.get("/getLastCircuit", (req, res) => {
    if (lastCircuit != null){
      res.status(200).json({ result: lastCircuit.map((node) => node.nodeId) });
    }
    else{
      res.status(404).send("No circuit has been created yet !");
    }
  });

  _user.post("/message", (req, res) => {
    const { message } = req.body;
    lastReceivedDecryptedMessage = message;
    res.status(200).send("success");
  });

  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;

    let listNode: Node[] = [];

    const getregistry = await axios.get(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
    const nodes =  getregistry.data.nodes as Node[];

    while (listNode.length < 3) {
      let randomindex = Math.floor(Math.random()* nodes.length);
      if (!listNode.includes(nodes[randomindex])){
        listNode.push(nodes[randomindex]);
      }
    }

    lastSentDecryptedMessage = message;
    let encryptedMessage = message;
    let destination = String(BASE_USER_PORT + destinationUserId).padStart(10, '0');

    for (const node of listNode) {
      const symKeys = await createRandomSymmetricKey();
      const symKeyString = await exportSymKey(symKeys)
      const symKey = await importSymKey(symKeyString);
      const Message1 = await symEncrypt(symKey, destination + encryptedMessage);
      destination = String(BASE_ONION_ROUTER_PORT + node.nodeId).padStart(10, '0');
      const encryptedKey = await rsaEncrypt(symKeyString, node.pubKey);
      encryptedMessage = encryptedKey + Message1;
    }

    listNode.reverse();
    lastCircuit = listNode;

    // Envoyer le message chiffré au premier nœud du circuit
    await axios.post(`http://localhost:${BASE_ONION_ROUTER_PORT + lastCircuit[0].nodeId}/message`, {
      message: encryptedMessage,
    });
    res.status(200).send("Message sent successfully through the circuit.");
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
