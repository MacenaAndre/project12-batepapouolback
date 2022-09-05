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

const messageSchema = joi.object({
    to: joi.string().required().empty(),
    text: joi.string().required().empty(),
    type: joi.string().valid("private_message", "message").required()
});

server.post("/participants", async (req, res) => {
    const {name} = req.body;
    const validation = userSchema.validate({name});

    if (validation.error) {
        return res.status(422).send({message: validation.error.details.map((value) => value.message)});
      };

    try {
        const users = await db.collection("users").find().toArray();
        const invalidName = users.find((value) => value.name === name);

        if(invalidName) {
            return res.sendStatus(409);
        }

    } catch (error) {
        return res.status(500).send(error);
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
        return res.status(500).send(error);
    }
});

server.get("/participants", async (req, res) => {
    try {
        const users = await db.collection("users").find().toArray()
        return res.send(users);
    } catch (error) {
        return res.status(500).send(error);
    }
});

server.post("/messages", async (req, res) => {
    const body = req.body;
    const user = req.headers.user;
    const validation = messageSchema.validate(body);

    if (validation.error) {
        return res.status(422).send({message: validation.error.details.map((value) => value.message)});
    };

    try {
        const users = await db.collection("users").find().toArray()
        const invalidName = users.find((value) => value.name === user)

        if(!invalidName) {
            return res.sendStatus(422);
        }
        const message = await db.collection("messages").insertOne({
            ...body,
            from: user,
            time: dayjs().format("HH:mm:ss")
        })
        return res.sendStatus(201);
    } catch (error) {
        return res.status(500).send(error);
    }
      
});

server.get("/messages", async (req, res) => {
    const {limit} = req.query;
    const user = req.headers.user;

    if(!user) {
        return res.sendStatus(422);
    }

    try {
        const messages = await db.collection("messages").find().toArray();
        const userMessages = messages.filter((value) => value.from === user || value.to === user || value.type === "message" || value.type === "status");
        if(limit) {
            return res.send(userMessages.slice(-limit));
        } else {
            return res.send(userMessages);
        }

    } catch (error) {
        res.status(500).send(error);
    }
});

server.post("/status", async (req, res) => {
    const user = req.headers.user;

    if(!user) {
        return res.sendStatus(422);
    };

    try {
        const users = await db.collection("users").find().toArray();
        const validName = users.find((value) => value.name === user);

        if(validName) {
            const update = await db.collection("users").updateOne({name: user}, {$set: {lastStatus: Date.now()}});
            return res.sendStatus(200);
        } else {
            return res.sendStatus(404);
        }
    } catch (error) {
        res.status(500).send(error);
    };

});

setInterval( async () => {

    try {
        const users = await db.collection("users").find().toArray();
        const usersOffline = users.filter((value) => ((Date.now() - value.lastStatus) > 10000));
        const kickuser = usersOffline.forEach( async (value) => {
            await db.collection("users").deleteOne({name: value.name});
            await db.collection("messages").insertOne({
                from: value.name,
                to: "Todos",
                text: 'sai da sala...',
                type: "status",
                time: dayjs().format("HH:mm:ss")
            })
        });
    } catch (error) {
        return error
    }

}, 15000);

server.listen(5000, () => console.log("Listening on port 5000..."));
