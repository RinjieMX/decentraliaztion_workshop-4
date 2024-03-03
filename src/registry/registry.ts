import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

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

  let NodeRegistryBody: GetNodeRegistryBody = { nodes: [] };

  _registry.get("/status", (req, res) => {
    res.status(200).send('live');
  });

  const nodes: Node[] = [];

  _registry.post("/registerNode", async (req, res) => {
    const body = req.body;

    const index = nodes.some(n => n.nodeId === body.nodeId);
    if (index) {
      res.status(400).send({ message: "Node already registered" });
    }

    NodeRegistryBody.nodes.push({ nodeId: body.nodeId, pubKey: body.pubKey });
    return res.status(200).json({ message: "Node registered successfully" });
  });

  _registry.get("/getNodeRegistry", (req: Request, res: Response) => {
    res.status(200).json(NodeRegistryBody);
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
