# lti-spike
`npm start` to run

Can use http://ltiapps.net/test/tc.php to test. You'll need to make an accessible HTTP tunnel to your local dev machine using something like https://ngrok.com/.

Set "Launch URL" to `123`, "Consumer key" to `sekret` and "Launch URL" to `https://<ngrok-url>/launch`.

Successful launches will show the launch params in the tool provider interface. If grade pass backs are available, it will also immediately post a grade. You can verify that this request was successful from the log in the node console. If testing against an LMS with a grade book, you should see the grade populated in the grade book column for the assignment and user.

## Testing query endpoint
http://localhost:8082/ in the browser and hit the "make query request" button. If the query worked, you should see the result logged to the console.

Additional implementation notes in line comments in `index.js`.
