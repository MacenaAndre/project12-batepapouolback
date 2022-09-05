import express from 'express';
import cors from 'cors';
import joi from 'joi';

const server = express();
server.use(cors());
server.use(express.json());

server.listen(5000, () => console.log("Listening on port 5000..."));