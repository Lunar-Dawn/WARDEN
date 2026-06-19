# Setting up the development environment

- Clone the repo to a folder of your own choosing: `git clone https://github.com/Lunar-Dawn/WARDEN.git`.
- From within the clone's folder, install dependencies with `npm ci`.
- If you don't wish to manually update your local WARDEN system after every build, you may symlink this development folder with your Foundry data folder. This can be done manually or by running `npm run link` and following the instructions.
- You may run `npm run build` to perform a one-off build.
- Typically, if you modify the system code, or modify the system's compendia in their exported JSON form, you would run the above command. If you modify the system's compendia in-Foundry, you can use `npm run extract` to extract them into JSON form.
  - It is suggested you only keep track of and push JSON files of the compendia, as they're both easier to read as a human, and easier for git to track.

## FoundryVTT Sync

Admittedly, FoundryVTT Sync was made more for modules, so using it in this way is kind of a bastardisation of how it should be used.  
But hey, as long as it works.  
*(Except that `npm run dev` doesn't work.)*