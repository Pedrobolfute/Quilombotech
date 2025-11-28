const express = require('express');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const app = express();

app.use(express.static('public'));

const port = 3000;

const serviceAccount = require("./firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

app.get('/', (req, res) => {
  res.send('API UP!');
});

app.get('/api/points', async (req, res) => {
  try {
    const snapshot = await db.collection("HistoricPoints").get();

    if (snapshot.empty) {
      return res.status(204).json([]);
    }

    const pointList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(pointList);
  } catch (error) {
    res.status(500).json({error: 'Error searching for historical points.'});
  }
});

app.get('/api/points/:id', async (req, res) => {
  try {
    const pointId = req.params.id;
    const docRef  = db.collection("HistoricPoints").doc(pointId);
    const doc     = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({error: 'The point was not found.'});
    }

    res.status(200).json({id: doc.id, ...doc.data()});
  } catch (error) {
    res.status(500).json({error: 'Error retrieving point details.'});
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
