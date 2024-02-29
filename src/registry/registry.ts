import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPrvKey, exportPubKey } from "../crypto";
import axios from 'axios';

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  _registry.get("/status", (req, res) => {
    res.status(200).send('live');
  });

  let nodes: RegisterNodeBody[] = [];

  _registry.post("/registerNode", async (req, res) => {
    const { nodeId } = req.body;

    const index = nodes.some(n => n.nodeId === nodeId);
    if (index) {
      res.status(400).send({ message: "Node already registered" });
    }

    const { publicKey, privateKey } = await generateRsaKeyPair();
    const pubKey = await exportPubKey(publicKey);
    nodes.push({ nodeId, pubKey });
  });

  const registerNode = async () => {
    try {
      const response = await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, {
        nodeId: 1,
        pubKey: 'your_public_key',
      });

      console.log(response.data);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error:', error.message);
      }
    }
  };

  await registerNode();

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
