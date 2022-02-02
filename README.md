The idea behind this project is to go over all of your SSBM slippi replay files and get the conversions (as defined by slippi-js, basically combos). These are stored in a sqlite database, which we can search from. You can assign conversions to playlists, and then play them and record them (using OBS and (eventually) dolphin frame dump and super eventually upload them to gfycat). There are several settings that need to be set.

PLATFORMS:
- Windows (see releases)

Versioning:
- Expect every release to contain breaking changes for the foreseeable future

Security:
- No


TODO (no particular order):  
- Add option for choosing between OBS recording and dolphin framedumps   
- Add option for gfycat uploading    
- Add option for recordings of playlists to be split into different files    
- More search options (search based on moves in conversion, etc)    
    * AFTER/BEFORE date  
- Better table display (configurable columns?)
    * after page 2 stuff starts to get cut off
    * create playlists in dropdown in table
- Game/converion stat breakdown  
    * Form to select Player and get stats?
    * Show stats over time
- Analysis of playlists to predict/suggest additions    
- Make the code consisent and look sane  
- Webpack/PROD babel build of code
- Conversion-level preroll/postroll overrides in playlists
- Add loading icon to long operations

ISSUES:
- Need database migration system, currently have to delete DB everytime
    * Electron update!
- Load up is very slow  
- First search call is slow
    * Must be an indexing thing - only happens on very first call
- React components getting out of hand  

