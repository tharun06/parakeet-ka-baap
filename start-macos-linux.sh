#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This recovered build cannot run on Linux because no Linux native audio binding was shipped."
  exit 1
fi

if [ ! -x "node_modules/.bin/electron" ]; then
  npm install
fi

npm run verify
npm start
