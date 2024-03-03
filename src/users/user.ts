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

let circuit: Node[] | null = null;
let lastReceivedDecryptedMessage: string | null = null;
let lastSentDecryptedMessage: string | null = null;

export type SendMessageBody = {
  message: string | null;
  destinationUserId: number | null;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

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
    if (circuit != null){
      res.status(200).json({ result: circuit.map(node => node.nodeId) });
    }
    else{
      res.status(404).send("No circuit has been created yet !");
    }
  });

  _user.post("/message", (req, res) => {
    const mess = req.body.message;
    lastReceivedDecryptedMessage = mess;
    res.status(200).send("success");
  });

  _user.post("/sendMessage", async (req, res) => {
    const body = req.body;

    lastSentDecryptedMessage = body.message;

    const getregistry = await axios.get(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
    const nodes =  getregistry.data.nodes as Node[];

    const listNode: Node[] = [];
    while (listNode.length < 3) {
      let random = nodes[Math.floor(Math.random()* nodes.length)];
      if (!listNode.includes(random)){
        listNode.push(random);
      }
    }

    let encryptedMessage = body.message;
    let destination = String(BASE_USER_PORT + body.destid).padStart(10, '0');

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
    circuit = listNode;

    // Envoyer le message chiffré au premier nœud du circuit
    try{
      await axios.post(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0].nodeId}/message`, {
        message: encryptedMessage,
      });
    } catch (error: any) {
      console.error('Error posting message:', error.response?.data || error.message);
    }

    return res.send("Message sent successfully through the circuit.");
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
