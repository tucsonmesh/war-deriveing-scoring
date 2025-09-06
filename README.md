# War Dérive-ing Scoring
 
Code to score a Tucson Mesh event where teams explore Tucson and measure wireless signals for fun and to map Tucson Mesh's service area.

This code compiles to Apps Script compatible JavaScript and is intended to be used in a Google Sheet.

It relies on the [aside](https://github.com/google/aside) and [clasp](https://github.com/google/clasp) projects to develop Apps Script locally.

## Assumptions

- Node.js. I developed this using Node.js version 22.18.0.
- Google Apps Script API is enabled. You can enabled this [here](https://script.google.com/home/usersettings).

## Install dependencies

```
npm install
```

## Authorize class

```
npx clasp login
```

## Run tests

```
npm run test
```

## Build Apps Script

```
npm run build
```

## Deploy

```
npm run deploy:prod
```

## Additional tasks

See npm scripts in `package.json`.
