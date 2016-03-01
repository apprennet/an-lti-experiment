import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import exphbs from 'express-handlebars';
import lti from 'ims-lti';

var app = express();

// static files
app.use(express.static('public'));

// Body parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser('sekret'));

// View engine
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.enable('trust proxy');

app.get('/', (req, res) => {
  res.send('working');
});

app.get('/page', (req, res) => {
  res.render('page', {value: 'test'})
});

const ltiConsumers = {
  123: {
    key: '123',
    secret: 'sekret'
  }
};

app.post('/launch', (req, res) => {
  let key = req.body.oauth_consumer_key;
  let consumer = ltiConsumers[key];

  if (!consumer) {
    return res.status(500).send('consumer not recognized');
  }

  let provider = new lti.Provider(key, consumer.secret);

  provider.valid_request(req, (err, isValid) => {
    if (err) {
      return res.status(500).send(err);
    }

    if (provider.outcome_service) {
      provider.outcome_service.send_replace_result(.7, (err, result) => {
        if (err) {
          console.log(`Error posting result ${err}`);
        }

        console.log('Success posting result');
      })
    }

    return res.json(req.body)
  });
});

// 404s
app.use((req, res) => {
  res.status(404).send('404 :(')
});

// 500s
app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(500).send('500 :('  + err.stack);
});

app.listen(8082);
