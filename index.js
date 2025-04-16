const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { Op } = require("sequelize");
const db = require('./models');

const app = express();

// Mitigates the CORS Missing Allow Origin error in modern browsers
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

const ANDROID_TOP_100_GAMES_URL = 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/android.top100.json';
const IOS_TOP_100_GAMES_URL = 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/ios.top100.json';

app.get('/api/games', (req, res) => db.Game.findAll()
  .then(games => res.send(games))
  .catch((err) => {
    console.log('There was an error querying games', JSON.stringify(err));
    return res.send(err);
  }));

app.post('/api/games/search', (req, res) => {
  const { name, platform } = req.body;
  return db.Game.findAll({
    where: {
      ...(
        name ? 
          { name: { [Op.substring]: name } } :
          {}
      ),
      ...(
        platform ?
          { platform } :
          {}
      )
    }
  })
  .then(games => res.send(games))
  .catch((err) => {
    console.log('***There was an error retrieving the games', JSON.stringify(err));
    return res.status(500).send(err);
  });
})

const mapProperties = games => games.map(game => ({
  publisherId: game.publisher_id,
  name: game.name,
  platform: game.os,
  storeId: game.id,
  bundleId: game.bundle_id,
  appVersion: game.version,
  isPublished: 1,
}))

const fetchGames = url => fetch(url).then(res => res.json());

app.post('/api/games/populate', async (req, res) => {
  const [ androidGames, iosGames ] = await Promise.all([
    fetchGames(ANDROID_TOP_100_GAMES_URL),
    fetchGames(IOS_TOP_100_GAMES_URL)
  ]);

  // arrays are flattened to mitigate the strange format
  const games = mapProperties([...androidGames.flat(), ...iosGames.flat()]);

  // reply early to improve the perceived performance
  res.status(200).send(games);

  // clean the database first
  await db.Game.destroy({ truncate: true });
  return db.Game.bulkCreate(games);
})
  
app.post('/api/games', (req, res) => {
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    .then(game => res.send(game))
    .catch((err) => {
      console.log('***There was an error creating a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.delete('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then(game => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log('***Error deleting game', JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => {
      const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
      return game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
        .then(() => res.send(game))
        .catch((err) => {
          console.log('***Error updating game', JSON.stringify(err));
          res.status(400).send(err);
        });
    });
});


app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
