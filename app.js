const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
require("dotenv").config();
const SpotifyWebApi = require("spotify-web-api-node");
var request = require("request");

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("./public"));

const redirect_url = "http://localhost:8888/callback";

let userInfo;
let songsIDs = [];
let trackMetrics;
// let recentlyPlayedTracks;
// credentials are optional

const spotifyApi = new SpotifyWebApi({
  clientId: "259a8fc0ea1b4923beb486103ccfb2f8",
  clientSecret: "b57ac6dbdaab40b3a31edc92a31b3cd7",
  redirectUri: redirect_url,
});
app.get("/", function (req, res) {
  res.render("index", {
    titulo: "Spotify Generated Art",
  });
  // res.redirect("/auth");
});

app.get("/auth", function (req, res) {
  // var SpotifyWebApi = require("spotify-web-api-node");

  let scopes = [
    "user-top-read",
    "user-library-read",
    "user-read-private",
    "user-read-email",
    "user-read-recently-played",
  ];

  let authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  res.redirect(authorizeURL);
});

app.get("/callback", function (req, res) {
  let code = req.query.code;
  let authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code,
      redirect_uri: redirect_url,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          spotifyApi.getClientId() + ":" + spotifyApi.getClientSecret()
        ).toString("base64"),
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
        refresh_token = body.refresh_token;

      spotifyApi.setAccessToken(access_token);
      spotifyApi.setRefreshToken(refresh_token);

      //vai buscar as informações do utilizador
      spotifyApi.getMe().then(
        function (data) {
          // username = data.body.display_name;
          userInfo = data.body;
          // console.log(userInfo);
        },
        function (err) {
          console.log("Something went wrong! :(", err);
        }
      );
      /* Get a User’s Top Tracks*/
      // spotifyApi.getMyTopTracks().then(
      //   function (data) {
      //     let topTracks = data.body.items;
      //     console.log(topTracks);
      //   },
      //   function (err) {
      //     console.log("Something went wrong!", err);
      //   }
      // );

      // Get Current User's Recently Played Tracks
      spotifyApi
        .getMyRecentlyPlayedTracks({
          limit: 20,
        })
        .then(
          function (data) {
            // Output items
            const recentlyPlayedTracks = data.body.items;
            recentlyPlayedTracks.forEach(({ track }) =>
              songsIDs.push(track.id)
            );
            spotifyApi
              .getAudioFeaturesForTracks(songsIDs)
              .then(function (data) {
                var danceability = 0;
                (loudness = 0),
                  (valence = 0),
                  (tempo = 0),
                  (mode = 0),
                  (energy = 0),
                  (speechiness = 0),
                  (acousticness = 0),
                  (instrumentalness = 0),
                  (liveness = 0);
                // console.log(data.body);
                data.body.audio_features.forEach(function (p1) {
                  danceability += p1.danceability;
                  loudness += p1.loudness;
                  valence += p1.valence;
                  tempo += p1.tempo;
                  mode += p1.mode;
                  energy += p1.energy;
                  speechiness += p1.speechiness;
                  acousticness += p1.acousticness;
                  instrumentalness += p1.instrumentalness;
                  liveness += p1.liveness;
                });
                trackMetrics = {
                  danceability: danceability / data.body.audio_features.length,
                  loudness: loudness / data.body.audio_features.length,
                  valence: valence / data.body.audio_features.length,
                  tempo: tempo / data.body.audio_features.length,
                  mode: Math.round(mode / data.body.audio_features.length),
                  energy: energy / data.body.audio_features.length,
                  speechiness: speechiness / data.body.audio_features.length,
                  acousticness: acousticness / data.body.audio_features.length,
                  instrumentalness:
                    instrumentalness / data.body.audio_features.length,
                  liveness: liveness / data.body.audio_features.length,
                };
                console.log("estou ca dentro:", trackMetrics);
              });
            console.log(songsIDs);
            console.log("estou ca fora:", trackMetrics);
          },
          function (err) {
            console.log("Something went wrong!", err);
          }
        );
    } else if (response.statusCode === 403) {
      res.redirect("/refresh_token");
    }
  });
  // DADOS A PASSAR PARA O VISUALIZADOR
  res.render("visualizer", {
    userInfo: userInfo,
    songsIDs: songsIDs,
    trackMetrics: trackMetrics,
  });
  //este render funcionar para mudar para a pagina visualizador
});
//fim do callback dos dados

// app.get('/visualizer',function(req,res){

//  // DADOS A PASSAR PARA O VISUALIZADOR
//  res.render("visualizer", {
//   titulo: "Cenas"

//   });

// });

app.get("/refresh_token", function (req, res) {
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        new Buffer(
          spotifyApi.getClientId() + ":" + spotifyApi.getClientSecret()
        ).toString("base64"),
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        access_token: access_token,
      });
    }
  });
});

let port = process.env.PORT || 8888;
app.listen(port, function (req, res) {
  console.log(`Server running on port ${port}.`);
});
