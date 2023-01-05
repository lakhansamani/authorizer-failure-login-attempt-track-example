# Authorizer Failure Login Attempts Demo

## Quick start

- Setup project
  - `PROJECT=my-server`
  - `git clone https://github.com/lakhansamani/authorizer-failure-login-attempt-track-example $PROJECT && cd $PROJECT && rm -rf .git && cp .env.example .env`
- Update env variables in the `.env` file:
  - Set the REDIS URL
  - Set the AuthorizerURL
- Install dependencies `yarn` or `npm install`
- Start in development mode `yarn develop`
- Build for production `yarn build`
- Start in production mode `yarn start`
