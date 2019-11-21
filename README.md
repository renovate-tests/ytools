# ytools
Yarn workspace tools.  Detects which projects in a workspace have changed given staged files from master.  

# install

```
yarn install yarn-workspace-tools
```

# run

```
ytools
```

To add logging (to `stderr`) use the `-v` flag.  

To pipe directly into pretty formatted json pipe into [jq](https://stedolan.github.io/jq/):

```
ytools -v | jq
```

Returns json of the format:
```
{
  "dependency": {
    "name": "dependency",
    "path": "packages/... path"
  },
  "dependency2": {
    "name": "dependency2",
    "path": "packages/... path"
  }
}
```

Of workspace packages that have changed against master

# Configuration

Configure files that always trigger everything to build (like root package.json, etc) with:


```
// .ytools.js

module.exports = {
    // regular expressions to match
    requiredFiles: [".*"]
}
```

By default `*.json`, `*.lock` at the root will always trigger a full workspace result
