import express from "express";
import cors from "cors";
import joi from "joi";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import dotenv from "dotenv";
dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);

let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("batepapouol");
});

const userSchema = joi.object({
    name: joi.string().required().empty()
});

server.post("/participants", async (req, res) => {
    const {name} = req.body;
    const validation = userSchema.validate({name});

    if (validation.error) {
        return res.status(422).send({message: validation.error.details.map((value) => value.message)});
      };

    try {
        const users = await db.collection("users").find().toArray()
        const invalidName = users.find((value) => value.name === name)

        if(invalidName) {
            return res.sendStatus(409);
        }

    } catch (error) {
        console.error(error);//o que botar aqui?
        return res.sendStatus(500);
    }

    try {
        const user = await db.collection("users").insertOne({
            name,
            lastStatus: Date.now()
        });
        const message = await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format("HH:mm:ss")
        });
        return res.sendStatus(201);
    } catch (error) {
        console.error(error);//o que botar aqui?
        return res.sendStatus(500);
    }
});

server.get("/participants", async (req, res) => {
    try {
        const participants = await db.collection("users").find().toArray()
        return res.send(participants);
    } catch (error) {
        return res.sendStatus(500);
    }
})
server.listen(5000, () => console.log("Listening on port 5000..."));

/*res.send(participants.map((value) => value = {
    ...value,
    _id: undefined
}));*/