import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import { createClient } from 'redis';

const MAX_FAILURE_ATTEMPTS = 3;
const MAX_ATTEMPT_RESET_TIME = 10; // in second
const LOCK_TIME = 60; // in second

const main = async () => {
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();

    // create express app
    const app: express.Application = express();

    // add cors middleware
    app.use(cors());

    // add json body parser
    app.use(bodyParser.json());

    app.use('/', express.static('public'));

    app.use(`/graphql`, async (req, res) => {
      const result = await axios.post(
        `${process.env.AUTHORIZER_URL}/graphql`,
        req.body,
        {
          headers: {
            Authorization: req.headers.authorization,
            'x-authorizer-url': req.headers['x-authorizer-url'],
            'x-authorizer-admin-secret':
              req.headers['x-authorizer-admin-secret'],
          },
        },
      );

      const isLoginRequest = req.body?.query.includes('login(params');
      if (isLoginRequest && result.data.errors) {
        // Note make sure email address is passed as variable
        const emailAddress = req.body?.variables.email;
        // Get if email address exists in redis
        const failureCount = await redisClient.get(emailAddress);
        // If Max failure count reached lock the account and return error
        if (failureCount && parseInt(failureCount) >= MAX_FAILURE_ATTEMPTS) {
          res.json({
            data: null,
            errors: [
              {
                message: 'user locked for 24 hours',
                path: ['login'],
              },
            ],
          });
          return;
        }

        if (failureCount) {
          const nextFailureCount = parseInt(failureCount) + 1;
          let expire = MAX_ATTEMPT_RESET_TIME;

          // Lock for specific period on crossing max attempt
          if (nextFailureCount === MAX_FAILURE_ATTEMPTS) {
            expire = LOCK_TIME;
          }

          redisClient.set(emailAddress, `${nextFailureCount}`, {
            EX: expire,
          });
        } else {
          redisClient.set(emailAddress, `1`, {
            EX: MAX_ATTEMPT_RESET_TIME,
          });
        }
      }

      res.json(result.data);
      return;
    });

    // bind port and start server
    const port: number = parseInt(process.env.PORT || '3000', 10);
    app.listen(port, () => {
      console.log(`🚀 server started on port: ${port}`);
    });
  } catch (error) {
    console.error(error);
  }
};

main();
