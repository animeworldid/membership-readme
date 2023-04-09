<div align="center">

<img src="https://api.frutbits.org/assets/images/AWI_Icon.png" alt="Anime World Indonesia Logo" width="200px" height="200px"/>

# @animeworldid/membership-readme

**A GitHub action for updating Anime World Indonesia membership list continuously**

[![GitHub](https://img.shields.io/github/license/animeworldid/membership-readme)](https://github.com/animeworldid/membership-readme/blob/main/LICENSE)
[![GitHub version](https://badge.fury.io/gh/animeworldid%2Fmembership-readme.svg)](https://badge.fury.io/gh/animeworldid%2Fmembership-readme)
[![Discord](https://discord.com/api/guilds/304646217562980355/embed.png)](https://discord.gg/otakuid)

</div>


# Usage
This will update your README file every 30 minutes:
```yml
name: Update README

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    name: Update this repo's README with latest membership from API

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3.0.2

      - name: Update README
        env:
          WORKING_DIRECTORY: ./path/to/readme/folder # README usually located at root-level, so it's should be `.`
        uses: animeworldid/membership-readme@version # Change this with latest version
```
Add following code to your README:
```md
# Administrator
<!--START_SECTION:administrator_list-->
<!--END_SECTION:administrator_list-->

<!--START_SECTION:motm_list-->
<!--END_SECTION:motm_list-->

# Supporter
<!--START_SECTION:supporter_list-->
<!--END_SECTION:supporter_list-->
```
