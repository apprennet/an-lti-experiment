import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import exphbs from 'express-handlebars';
import lti, { OutcomeService } from 'ims-lti';
import HMAC_SHA1 from 'ims-lti/lib/hmac-sha1';
import utils from 'ims-lti/lib/utils';
import url from 'url';

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

// Required to allow HTTPS requests.
app.enable('trust proxy');

app.get('/page', (req, res) => {
  res.render('page', {value: 'test'})
});

// Mock consumers. These would be stored as an entity in the database.
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

    // If set up to receive grades, immediately populate a grade.
    // In real life, this would be triggered by some event later.
    if (provider.outcome_service) {
      const outcomeService = new OutcomeService({
        consumer_key: key,
        consumer_secret: consumer.secret,
        service_url: provider.body.lis_outcome_service_url,
        source_did: provider.body.lis_result_sourcedid,
      });

      outcomeService.send_replace_result(.7, (err, result) => {
        if (err) {
          console.log(`Error posting result ${err}`);
        }

        console.log('Success posting result');
      })
    }

    return res.json(req.body)
  });
});

app.get('/', (req, res) => {
  // Generate request params with OAuth signature and send to browser to use as a query string.
  const signer = new HMAC_SHA1();
  let timestamp = Math.round(new Date().getTime() / 1000);
  const baseParams = {
    oauth_consumer_key: 123,
    oauth_version: 1.0,
    oauth_timestamp: timestamp,
    oauth_nonce: "12698b5208758b740f06c7b8c0c6dec5",
    oauth_signature_method: "HMAC-SHA1",
    context_id: "S3294476"
  }
  // This process is taken from https://github.com/omsmith/ims-lti/blob/master/src/hmac-sha1.coffee#L47
  const cleanedRequestBody = _clean_request_body(baseParams, baseParams);
  const req_url = req.protocol + '://' + req.get('host') + req.originalUrl + 'query';
  var sig = ["GET", utils.special_encode(req_url), cleanedRequestBody];
  var oauth_signature = signer.sign_string(sig.join('&'), 'sekret', null);
  baseParams.oauth_signature = oauth_signature;

  res.render('home', {params: JSON.stringify(baseParams)});
})

app.get('/query', (req, res) => {
  let key = req.query.oauth_consumer_key;
  let consumer = ltiConsumers[key];

  if (!consumer) {
    return res.status(500).send('consumer not recognized');
  }

  let provider = new lti.Provider(key, consumer.secret);

  // NOTE: Using a private method from ims-lti library (https://github.com/omsmith/ims-lti/blob/master/src/provider.coffee#L53) to skip LTI parameter validation (https://github.com/omsmith/ims-lti/blob/master/src/provider.coffee#L44)
  provider._valid_oauth(req, req.query, (err, isValid) => {
    if (err) {
      return res.status(500).send(err);
    }
    return res.json({result: 'worked', context_id: req.query.context_id});
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


// Taken from https://github.com/omsmith/ims-lti/blob/master/src/hmac-sha1.coffee#L14
function _clean_request_body(body, query) {
  var cleanParams, encodeParam, out;
  out = [];
  encodeParam = function(key, val) {
    return key + "=" + (utils.special_encode(val));
  };
  cleanParams = function(params) {
    var i, key, len, val, vals;
    if (typeof params !== 'object') {
      return;
    }
    for (key in params) {
      vals = params[key];
      if (key === 'oauth_signature') {
        continue;
      }
      if (Array.isArray(vals) === true) {
        for (i = 0, len = vals.length; i < len; i++) {
          val = vals[i];
          out.push(encodeParam(key, val));
        }
      } else {
        out.push(encodeParam(key, vals));
      }
    }
  };
  cleanParams(body);
  cleanParams(query);
  return utils.special_encode(out.sort().join('&'));
};
